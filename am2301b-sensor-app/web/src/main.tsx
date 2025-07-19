import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import {TextLineStream} from "@std/streams/text-line-stream"
import Chart from 'chart.js/auto';

function App() {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ t: number, h: number, time: number }>>([]);
  const [port, setPort] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart|null>(null);
  const isActiveRef = useRef<boolean>(false);
  const decoderRef = useRef<TextDecoderStream|null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string>|null>(null);
  const pipePromiseRef = useRef<Promise<void>|null>(null);

  // シリアル接続・受信処理
  const connectSerial = async () => {
    setIsConnecting(true);
    try {
      // ポート選択
      const serialPort = await (navigator as any).serial.requestPort();
      await serialPort.open({ baudRate: 115200 });
      setPort(serialPort);

      // データ受信
      decoderRef.current = new TextDecoderStream();
      pipePromiseRef.current = serialPort.readable.pipeTo(decoderRef.current.writable);
      readerRef.current = decoderRef.current.readable.pipeThrough(new TextLineStream()).getReader();

      // 受信ループ
      isActiveRef.current = true;
      while (isActiveRef.current) {
        const { value, done } = await readerRef.current.read();
        if (done) break;
        if (value) {
          try {
            console.log(value)
            const json = JSON.parse(value);
            if (json?.result) {
              setTemperature(json.result.temperature);
              setHumidity(json.result.humidity);
              setHistory(prev => [
                ...prev,
                {
                  t: json.result.temperature,
                  h: json.result.humidity,
                  time: Date.now()
                }
              ]);
            }
          } catch (e) {
            // JSONパース失敗は無視
          }
        }
      }
      readerRef.current.releaseLock();
    } catch (err) {
      alert('シリアル接続に失敗しました');
    } finally {
      setIsConnecting(false);
    }
  };

  // シリアル切断処理
  const disconnectSerial = async () => {
    isActiveRef.current = false;
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
        readerRef.current.releaseLock();
      } catch (e) {}
      readerRef.current = null;
    }
    if (pipePromiseRef.current) {
      try {
        // pipeToのPromiseをabort（ストリーム解除）
        await pipePromiseRef.current.catch(() => {});
      } catch (e) {}
      pipePromiseRef.current = null;
    }
    if (decoderRef.current) {
      decoderRef.current = null;
    }
    if (port) {
      try {
        if (port.readable && port.readable.locked) {
          // ストリームがロックされていれば解除
          await port.readable.cancel();
        }
        await port.close();
      } catch (e) {}
      setPort(null);
    }
    setIsConnecting(false);
  };

  // 履歴が更新されたらグラフを描画・更新
  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // 初回のみChartインスタンス生成
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'Temperature (℃)',
              data: [],
              borderColor: 'rgba(255,99,132,1)',
              backgroundColor: 'rgba(255,99,132,0.2)',
              yAxisID: 'y',
            },
            {
              label: 'Humidity (%)',
              data: [],
              borderColor: 'rgba(54,162,235,1)',
              backgroundColor: 'rgba(54,162,235,0.2)',
              yAxisID: 'y1',
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              type: 'linear',
              position: 'left',
              min: 0,
              max: 50
            },
            y1: {
              type: 'linear',
              position: 'right',
              min: 0,
              max: 100,
              grid: { drawOnChartArea: false }
            }
          }
        }
      });
    }
    // データ更新
    const chart = chartInstanceRef.current;
    if (chart) {
      chart.data.labels = history.map(item => new Date(item.time).toLocaleTimeString());
      chart.data.datasets[0].data = history.map(item => item.t);
      chart.data.datasets[1].data = history.map(item => item.h);
      chart.update();
    }
  }, [history]);

  return (
    <div>
      <h1>AM2301B 温湿度センサー</h1>
      <button onClick={connectSerial} disabled={isConnecting || !!port}>
        {isConnecting ? '接続中...' : port ? '接続済み' : 'Arduinoと接続'}
      </button>
      {port && (
        <button onClick={disconnectSerial} style={{marginLeft: '1em'}}>切断</button>
      )}
      <div>温度: {temperature ?? '--'} ℃</div>
      <div>湿度: {humidity ?? '--'} %</div>
      <div style={{marginTop: '1em'}}>
        <canvas ref={chartRef} width="400" height="200"></canvas>
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
