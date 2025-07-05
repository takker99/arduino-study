import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import devServer from '@hono/vite-dev-server';
import { injectWebSocket, setupSerial } from './src/server';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    devServer({
      entry: './src/server.ts',
    }),
    {
      name: 'inject-websocket',
      configureServer: async (server) => {
        injectWebSocket(server.httpServer!);
        // シリアルポート接続を一度だけ実行
        await setupSerial();
      },
    }
  ],
});
