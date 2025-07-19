import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import Chart from 'chart.js/auto';

function App() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [port, setPort] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // シリアル接続・受信処理
  const connectSerial = async () => {
    setIsConnecting(true);
    try {
      // ポート選択
      const serialPort = await (navigator as any).serial.requestPort();
      await serialPort.open({ baudRate: 115200 });
      setPort(serialPort);

      // データ受信
      const decoder = new TextDecoderStream();
      const readableStreamClosed = serialPort.readable.pipeTo(decoder.writable);
      const reader = decoder.readable.getReader();

      // 受信ループ
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          try {
            const json = JSON.parse(value);
            if (json?.result) {
              setTemperature(json.result.temperature);
              setHumidity(json.result.humidity);
            }
          } catch (e) {
            // JSONパース失敗は無視
          }
        }
      }
      reader.releaseLock();
    } catch (err) {
      alert('シリアル接続に失敗しました');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div>
      <h1>AM2301B 温湿度センサー</h1>
      <button onClick={connectSerial} disabled={isConnecting || !!port}>
        {isConnecting ? '接続中...' : port ? '接続済み' : 'Arduinoと接続'}
      </button>
      <div>温度: {temperature ?? '--'} ℃</div>
      <div>湿度: {humidity ?? '--'} %</div>
      <canvas id="chart" width="400" height="200"></canvas>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
