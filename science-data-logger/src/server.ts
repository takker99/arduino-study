import { serveStatic } from '@hono/node-server/serve-static';
import { createNodeWebSocket } from '@hono/node-ws';
import { ReadlineParser } from '@serialport/parser-readline';
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { SerialPort } from 'serialport';
import sqlite3 from 'sqlite3';
import type { PortInfo } from './bindings-interface';

const app = new Hono();

// CORS設定
app.use('*', cors());

// 静的ファイルを提供
app.use('/*', serveStatic({ root: './public' }));

// API エンドポイント
app.get('/', (c) => c.text('Science Data Logger API'));

// CORS設定
app.use('*', cors());

// 静的ファイルを提供
app.use('/*', serveStatic({ root: './public' }));

// API エンドポイント
app.get('/', (c) => c.text('Science Data Logger API'));


// 型定義例: クライアント<->サーバー間のメッセージ
export type ClientToServer =
  | { type: 'connect' }
  | { type: 'disconnect' }
  | { type: 'motorSpeed'; speed: number };

export type ServerToClient =
  | { type: 'status'; connected: boolean }
  | { type: 'sensor'; pot: number; temp: number; light: number }
  | { type: 'error'; message: string };

// --- シリアル・DB管理 ---
let serialPort: SerialPort | null = null;
let parser: ReadlineParser | null = null;
const db = new sqlite3.Database(':memory:');
let lastSensorData: { pot: number; temp: number; light: number } | null = null;

async function setupSerial() {
  try {
    const ports: PortInfo[] = await SerialPort.list();
    const arduinoPort = ports.find(p =>
      p.vendorId === '2341' ||
      p.path.includes('ttyACM') ||
      p.manufacturer?.toLowerCase().includes('arduino')
    );

    if (!arduinoPort) {
      console.error('Arduinoが見つかりません');
      return;
    }
    const newSerialPort = new SerialPort({ path: arduinoPort.path, baudRate: 9600 });
    serialPort = newSerialPort;
    parser = newSerialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    newSerialPort.on('open', () => {
      console.log('Serial port opened');
    });

    parser.on('data', (data: string) => {
      try {
        // JSONメッセージかどうかをチェック
        if (data.trim().startsWith('{') && data.trim().endsWith('}')) {
          const jsonData = JSON.parse(data);
          lastSensorData = jsonData;
          db.run("INSERT INTO sensor_data (pot, temp, light) VALUES (?, ?, ?)",
            [jsonData.pot, jsonData.temp, jsonData.light]);
        } else {
          // 非JSONメッセージはログに出力するだけ
          console.log('Arduino message:', data.trim());
        }
      } catch (e) {
        console.error('Error parsing JSON:', e);
      }
    });

    newSerialPort.on('error', (err) => {
      console.error('Serial port error:', err);
      serialPort = null;
      parser = null;
      // 再接続リトライ
      setTimeout(setupSerial, 3000);
    });

    newSerialPort.on('close', () => {
      console.log('Serial port closed');
      serialPort = null;
      parser = null;
      // 再接続リトライ
      setTimeout(setupSerial, 3000);
    });
  } catch (err) {
    console.error('SerialPort.list error:', err);
    setTimeout(setupSerial, 5000);
  }
}

db.serialize(() => {
  db.run("CREATE TABLE sensor_data (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, pot INTEGER, temp REAL, light INTEGER)");
});

// setupSerial()は削除 - vite.config.tsで管理する

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

export const wsApp = app.get(
  '/ws',
  upgradeWebSocket((_c: Context) => {
    let intervalId: NodeJS.Timeout | undefined;
    return {
      onOpen(_event, ws) {
        ws.send(JSON.stringify({ type: 'status', connected: true }));
        // 最新センサーデータを1秒ごとにpush
        intervalId = setInterval(() => {
          if (lastSensorData) {
            ws.send(JSON.stringify({ type: 'sensor', ...lastSensorData }));
          }
        }, 1000);
      },
      async onMessage(event, ws) {
        let dataStr: string | undefined;
        if (typeof event.data === 'string') {
          dataStr = event.data;
        } else if (event.data instanceof Blob) {
          dataStr = await event.data.text();
        } else if (event.data instanceof ArrayBuffer) {
          dataStr = Buffer.from(event.data).toString('utf-8');
        }
        if (!dataStr) return;
        try {
          const message: ClientToServer = JSON.parse(dataStr);
          if (message.type === 'motorSpeed') {
            // モーター速度制御処理
            if (serialPort && serialPort.isOpen) {
              serialPort.write(`M${message.speed}\n`);
            }
          }
          if (message.type === 'connect') {
            ws.send(JSON.stringify({ type: 'status', connected: true }));
          }
          if (message.type === 'disconnect') {
            ws.send(JSON.stringify({ type: 'status', connected: false }));
            ws.close();
          }
        } catch (e: any) {
          ws.send(JSON.stringify({ type: 'error', message: e.message }));
        }
      },
      onClose() {
        if (intervalId) clearInterval(intervalId);
      },
      onError(_evt, ws) {
        ws.send(JSON.stringify({ type: 'error', message: 'WebSocket error' }));
      },
    };
  })
);

// 注: データベースやシリアルポートに依存するAPIエンドポイントは、
// Viteプラグイン側で再実装する必要があります。

export { setupSerial, serialPort, parser, db, lastSensorData };
export default app;
export { injectWebSocket };
