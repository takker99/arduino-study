import { serveStatic } from '@hono/node-server/serve-static';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { databaseManager } from './database-manager';
import { serialManager } from './serial-manager';
import { webSocketHandler } from './websocket-handler';

const app = new Hono();

// CORS設定
app.use('*', cors());

// 静的ファイルを提供
app.use('/*', serveStatic({ root: './public' }));

// API エンドポイント
app.get('/', (c) => c.text('Science Data Logger API'));

// データベースとシリアルマネージャーを連携
serialManager.onData((data) => {
  databaseManager.saveSensorData(data).catch(console.error);
});

// WebSocket設定
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

export const wsApp = app.get(
  '/ws',
  upgradeWebSocket(webSocketHandler.createHandler())
);

// 必要な関数・オブジェクトをエクスポート
export async function setupSerial() {
  await serialManager.connect();
}

export async function cleanupSerial() {
  await serialManager.disconnect();
}

export function writeToSerial(data: string): boolean {
  return serialManager.write(data);
}

export function isSerialConnected(): boolean {
  return serialManager.isConnected;
}

export default app;
export { injectWebSocket };
