import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devServer from '@hono/vite-dev-server';
import { injectWebSocket, setupSerial, cleanupSerial } from './src/server';

export default defineConfig({
  server: {
    hmr: {
      // HMRポートを分離してWebSocketとの競合を回避
      // cf. https://vite.dev/config/server-options.html#server-hmr
      port: 3000
    }
  },
  plugins: [
    tsconfigPaths(),
    devServer({
      entry: './src/server.ts',
    }),
    {
      name: 'serial-websocket-plugin',
      configureServer: async (server) => {
        // WebSocketを注入
        injectWebSocket(server.httpServer!);

        // シリアルポート接続を開始
        await setupSerial();

        // プロセス終了時のクリーンアップを設定
        const cleanup = async () => {
          console.log('Process ending, cleaning up serial connections...');
          await cleanupSerial();
          process.exit(0);
        };

        // 各種終了シグナルをハンドル
        process.once('SIGINT', cleanup);
        process.once('SIGTERM', cleanup);
        process.once('beforeExit', cleanup);
      },

      handleHotUpdate: async (ctx) => {
        // HMR時にシリアルポートをクリーンアップ
        console.log('HMR detected, cleaning up serial connections...');
        await cleanupSerial();
        // ファイル更新を継続
        return undefined;
      }
    }
  ],
});
