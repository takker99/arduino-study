// WebSocket通信の型定義

export type ClientToServer =
  | { type: 'connect' }
  | { type: 'disconnect' }
  | { type: 'motorSpeed'; speed: number };

export type ServerToClient =
  | { type: 'status'; connected: boolean }
  | { type: 'sensor'; pot: number; temp: number; light: number }
  | { type: 'error'; message: string };

export type SensorData = {
  pot: number;
  temp: number;
  light: number;
};
