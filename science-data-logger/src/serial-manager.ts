import { ReadlineParser } from '@serialport/parser-readline';
import { SerialPort } from 'serialport';
import type { PortInfo } from './bindings-interface';
import type { SensorData } from './types';

/**
 * Arduinoとのシリアル通信を管理するクラス
 */
export class SerialManager {
  private serialPort: SerialPort | null = null;
  private parser: ReadlineParser | null = null;
  private shouldReconnect = true;
  private onDataCallback?: (data: SensorData) => void;
  private onMessageCallback?: (message: string) => void;
  private onErrorCallback?: (error: Error) => void;

  /**
   * データ受信コールバックを設定
   */
  onData(callback: (data: SensorData) => void) {
    this.onDataCallback = callback;
  }

  /**
   * メッセージ受信コールバックを設定
   */
  onMessage(callback: (message: string) => void) {
    this.onMessageCallback = callback;
  }

  /**
   * エラーコールバックを設定
   */
  onError(callback: (error: Error) => void) {
    this.onErrorCallback = callback;
  }

  /**
   * シリアルポートに接続
   */
  async connect(): Promise<void> {
    if (!this.shouldReconnect) {
      console.log('Serial reconnection is disabled, skipping setup');
      return;
    }

    // 既存の接続をクローズ
    await this.disconnect();

    try {
      const ports: PortInfo[] = await SerialPort.list();
      const arduinoPort = ports.find(p =>
        p.vendorId === '2341' ||
        p.path.includes('ttyACM') ||
        p.manufacturer?.toLowerCase().includes('arduino')
      );

      if (!arduinoPort) {
        throw new Error('Arduinoが見つかりません');
      }

      const newSerialPort = new SerialPort({
        path: arduinoPort.path,
        baudRate: 9600,
        autoOpen: false
      });

      this.serialPort = newSerialPort;
      this.parser = newSerialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

      // ポートを開く
      await new Promise<void>((resolve, reject) => {
        newSerialPort.open((err) => {
          if (err) {
            console.error('Error opening serial port:', err);
            reject(err);
          } else {
            console.log('Serial port opened:', newSerialPort.path);
            resolve();
          }
        });
      });

      // データ受信ハンドラ
      this.parser.on('data', (data: string) => {
        try {
          // JSONメッセージかどうかをチェック
          if (data.trim().startsWith('{') && data.trim().endsWith('}')) {
            const jsonData = JSON.parse(data) as SensorData;
            this.onDataCallback?.(jsonData);
          } else {
            // 非JSONメッセージ
            const message = data.trim();
            console.log('Arduino message:', message);
            this.onMessageCallback?.(message);
          }
        } catch (e) {
          console.error('Error parsing JSON:', e);
          this.onErrorCallback?.(e as Error);
        }
      });

      // エラーハンドラ
      newSerialPort.on('error', (err) => {
        console.error('Serial port error:', err);
        this.serialPort = null;
        this.parser = null;
        this.onErrorCallback?.(err);

        // 再接続フラグが有効な場合のみ再接続
        if (this.shouldReconnect) {
          setTimeout(() => this.connect(), 3000);
        }
      });

      // クローズハンドラ
      newSerialPort.on('close', () => {
        console.log('Serial port closed');
        this.serialPort = null;
        this.parser = null;

        // 再接続フラグが有効な場合のみ再接続
        if (this.shouldReconnect) {
          setTimeout(() => this.connect(), 3000);
        }
      });

    } catch (err) {
      console.error('SerialPort.list error:', err);
      this.onErrorCallback?.(err as Error);

      // 再接続フラグが有効な場合のみ再接続
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), 5000);
      }
    }
  }

  /**
   * シリアルポートから切断
   */
  async disconnect(): Promise<void> {
    // 再接続を無効化
    this.shouldReconnect = false;

    if (this.serialPort && this.serialPort.isOpen) {
      console.log('Closing serial port...');

      const error = await new Promise<Error | null>((resolve) => {
        this.serialPort!.close(resolve);
      });

      if (error) {
        console.error('Error closing serial port:', error);
        throw error;
      } else {
        console.log('Serial port closed successfully');
      }
    }

    this.serialPort = null;
    this.parser = null;
  }

  /**
   * データを送信
   */
  write(data: string): boolean {
    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.write(data);
      return true;
    }
    return false;
  }

  /**
   * 接続状態を取得
   */
  get isConnected(): boolean {
    return this.serialPort?.isOpen ?? false;
  }

  /**
   * 再接続フラグを設定
   */
  setReconnectEnabled(enabled: boolean): void {
    this.shouldReconnect = enabled;
  }
}

// シングルトンインスタンス
export const serialManager = new SerialManager();
