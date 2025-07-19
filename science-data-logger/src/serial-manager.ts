import { ReadlineParser } from '@serialport/parser-readline';
import { SerialPort } from 'serialport';
import type { PortInfo } from './bindings-interface';


/**
 * WICG Web Serial API仕様に準拠したSerialPortラッパー
 * https://wicg.github.io/serial/
 *
 * Node.js serialportによる実装のため、以下の差異があります：
 * - getInfo()の返却値はPortInfo型でWeb APIと完全一致しません
 * - setSignals/getSignalsはserialportのAPIに依存し、Web APIと完全一致しません
 * - forget()はダミー実装です
 * - ストリームキャンセル時の挙動はWebと異なる場合があります
 *
 * @example
 * const port = new SerialPortWrapper(serialPort);
 * await port.open();
 * const reader = port.readable.getReader();
 * const writer = port.writable.getWriter();
 * // ...
 * await port.close();
 */
export class SerialPortWrapper {
  #serialPort: SerialPort;
  #parser: ReadlineParser;
  #readable: ReadableStream<string> | null;
  #writable: WritableStream<string> | null;
  #state: 'closed' | 'opening' | 'opened' | 'closing' | 'forgotten' = 'closed';
  #readFatal = false;
  #writeFatal = false;
  #portInfo: PortInfo;

  /**
   * @param serialPortOptions SerialPortコンストラクタに渡す全オプション（baudRate, dataBits, stopBits, parity, highWaterMark, flowControl, path, autoOpen: false）
   * @note Web Serial APIと異なり、open()でオプション変更はできません。インスタンス生成時に全て指定してください。
   */
  constructor(serialPortOptions: any) {
    this.#serialPort = new SerialPort({ ...serialPortOptions, autoOpen: false });
    this.#parser = this.#serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));
    this.#portInfo = this.#serialPort as any as PortInfo;
    this.#readable = null;
    this.#writable = null;
  }

  /**
   * ポートを開く（Web Serial API準拠）
   * @note Node.js serialportの仕様上、open()で通信パラメータは変更できません。
   */
  async open(): Promise<void> {
    if (this.#state !== 'closed') throw new Error('InvalidStateError: port is not closed');
    this.#state = 'opening';
    await new Promise<void>((resolve, reject) => {
      this.#serialPort.open((error: Error | null | undefined) => {
        if (error) {
          this.#state = 'closed';
          reject(error);
        } else {
          this.#state = 'opened';
          // ストリーム生成
          this.#readFatal = false;
          this.#writeFatal = false;
          this.#readable = new ReadableStream<string>({
            start: (controller) => {
              this.#parser.on('data', (data: string) => {
                if (this.#state !== 'opened' || this.#readFatal) return;
                controller.enqueue(data);
              });
              this.#serialPort.on('close', () => {
                this.#state = 'closed';
                this.#readable = null;
                controller.close();
              });
              this.#serialPort.on('error', (err: Error) => {
                this.#readFatal = true;
                this.#readable = null;
                controller.error(err);
              });
            },
            cancel: () => this.close()
          });
          this.#writable = new WritableStream<string>({
            write: (chunk) =>
              new Promise<void>((resolve, reject) => {
                this.#serialPort.write(chunk, (err) => {
                  if (err) {
                    this.#writeFatal = true;
                    this.#writable = null;
                    reject(err);
                  } else {
                    resolve();
                  }
                });
              }),
            close: () => this.close(),
            abort: () => this.close()
          });
          resolve();
        }
      });
    });
  }

  /**
   * ポートを閉じる（Web Serial API準拠）
   */
  async close(): Promise<void> {
    if (this.#state !== 'opened') return;
    this.#state = 'closing';
    // ストリームキャンセル
    if (this.#readable) {
      try { await this.#readable.cancel(); } catch {}
      this.#readable = null;
    }
    if (this.#writable) {
      try { await this.#writable.abort(); } catch {}
      this.#writable = null;
    }
    await new Promise<void>((resolve, reject) =>
      this.#serialPort.close((error) => {
        this.#state = 'closed';
        if (error) reject(error); else resolve();
      })
    );
  }

  /**
   * ポート情報を返す（Web API: getInfo）
   * @returns {PortInfo}
   */
  getInfo(): PortInfo {
    return this.#portInfo;
  }

  /**
   * 制御信号を設定（Web API: setSignals）
   * @param signals {Partial<{ dataTerminalReady: boolean; requestToSend: boolean; }>}  ※breakは未対応
   */
  async setSignals(signals: Partial<{ dataTerminalReady: boolean; requestToSend: boolean; }>): Promise<void> {
    if (this.#state !== 'opened') throw new Error('InvalidStateError: port is not opened');
    await new Promise<void>((resolve, reject) => {
      this.#serialPort.set(signals, (err) => err ? reject(err) : resolve());
    });
  }

  /**
   * 制御信号を取得（Web API: getSignals）
   * @returns {Promise<{ dataCarrierDetect?: boolean; clearToSend?: boolean; dataSetReady?: boolean; ringIndicator?: boolean; }>}
   * @note Node.js serialportのget()は {cts, dsr, dcd} などを返すため、Web APIのプロパティ名に変換して返します。
   *       ringIndicatorは未対応です。
   */
  async getSignals(): Promise<Partial<{ dataCarrierDetect: boolean; clearToSend: boolean; dataSetReady: boolean; ringIndicator: boolean; }>> {
    if (this.#state !== 'opened') throw new Error('InvalidStateError: port is not opened');
    return await new Promise((resolve, reject) => {
      this.#serialPort.get((err, status) => {
        if (err) return reject(err);
        if (!status) return resolve({});
        resolve({
          clearToSend: status.cts,
          dataSetReady: status.dsr,
          dataCarrierDetect: status.dcd
        });
      });
    });
  }

  /**
   * ポートの記憶解除（Web API: forget）
   * Node.jsでは意味がないためダミー
   */
  async forget(): Promise<void> {
    this.#state = 'forgotten';
    this.#readable = null;
    this.#writable = null;
  }

  /**
   * 読み取りストリーム（Web API: readable）
   * ポートがopen状態かつ致命的エラーがなければReadableStream、そうでなければnull
   */
  get readable(): ReadableStream<string> | null {
    if (this.#state !== 'opened' || this.#readFatal) return null;
    return this.#readable;
  }

  /**
   * 書き込みストリーム（Web API: writable）
   * ポートがopen状態かつ致命的エラーがなければWritableStream、そうでなければnull
   */
  get writable(): WritableStream<string> | null {
    if (this.#state !== 'opened' || this.#writeFatal) return null;
    return this.#writable;
  }

  /**
   * ポートが開いているか
   */
  get isOpen(): boolean {
    return this.#state === 'opened';
  }

  /**
   * 論理的な接続状態（Web API: connected）
   */
  get connected(): boolean {
    return this.#state === 'opened';
  }

  [Symbol.asyncDispose]() {
    return this.close();
  }
}


export const findArduinoPort = async (): Promise<PortInfo | undefined> => {

  const ports: PortInfo[] = await SerialPort.list();
  const arduinoPort = ports.find(p =>
    p.vendorId === '2341' ||
    p.path.includes('ttyACM') ||
    p.manufacturer?.toLowerCase().includes('arduino')
  );
  return arduinoPort;
}
