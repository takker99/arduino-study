import type { Context } from 'hono';
import type { WSContext, WSEvents } from 'hono/ws';
import type { WebSocket } from 'ws';
import { serialManager } from './serial-manager';
import type { ClientToServer, ServerToClient, SensorData } from './types';

/**
 * WebSocket接続の管理
 */
export class WebSocketHandler {
  private latestSensorData: SensorData | null = null;

  constructor() {
    // シリアルマネージャーからのデータ受信
    serialManager.onData((data) => {
      this.latestSensorData = data;
    });
  }

  /**
   * WebSocket接続ハンドラを生成
   */
  createHandler(): (context: Context) => WSEvents<WebSocket> {
    return () => {
      let intervalId: NodeJS.Timeout | undefined;

      return {
        onOpen: (_, ws) => {
          // 接続状態を送信
          this.sendMessage(ws, { type: 'status', connected: true });

          // 最新センサーデータを1秒ごとに送信
          intervalId = setInterval(() => {
            if (this.latestSensorData) {
              this.sendMessage(ws, {
                type: 'sensor',
                ...this.latestSensorData
              });
            }
          }, 1000);
        },

        onMessage: async (event, ws) => {
          try {
            const dataStr = await this.extractMessage(event);
            if (!dataStr) return;

            const message: ClientToServer = JSON.parse(dataStr);
            await this.handleMessage(message, ws);
          } catch (e: any) {
            this.sendMessage(ws, {
              type: 'error',
              message: e.message
            });
          }
        },

        onClose: () => {
          if (intervalId) {
            clearInterval(intervalId);
          }
        },

        onError: (_, ws) => {
          this.sendMessage(ws, {
            type: 'error',
            message: 'WebSocket error'
          });
        },
      };
    };
  }

  /**
   * メッセージイベントからテキストを抽出
   */
  private async extractMessage(event: MessageEvent): Promise<string | undefined> {
    if (typeof event.data === 'string') {
      return event.data;
    } else if (event.data instanceof Blob) {
      return await event.data.text();
    } else if (event.data instanceof ArrayBuffer) {
      return Buffer.from(event.data).toString('utf-8');
    }
    return undefined;
  }

  /**
   * クライアントからのメッセージを処理
   */
  private async handleMessage(message: ClientToServer, ws: WSContext): Promise<void> {
    switch (message.type) {
      case 'motorSpeed':
        // モーター速度制御
        const success = serialManager.write(`M${message.speed}\n`);
        if (!success) {
          this.sendMessage(ws, {
            type: 'error',
            message: 'Serial port not connected'
          });
        }
        break;

      case 'connect':
        this.sendMessage(ws, { type: 'status', connected: true });
        break;

      case 'disconnect':
        this.sendMessage(ws, { type: 'status', connected: false });
        ws.close();
        break;

      default:
        this.sendMessage(ws, {
          type: 'error',
          message: 'Unknown message type'
        });
    }
  }

  /**
   * WebSocketでメッセージを送信
   */
  private sendMessage(ws: WSContext, message: ServerToClient): void {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }
}

export const webSocketHandler = new WebSocketHandler();
