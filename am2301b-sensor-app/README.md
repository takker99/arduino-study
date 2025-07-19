# AM2301B Sensor App

Arduino Uno R4 + AM2301B温湿度センサー + Web SPA (preact+vite) のサンプルプロジェクトです。

## 構成
- `firmware/` : Arduino用PlatformIOプロジェクト（AM2301B制御・JSON-RPCシリアル通信）
- `web/` : preact+vite SPA（Web Serial APIでArduinoと通信、温湿度表示・グラフ化）

## セットアップ
- Arduino: PlatformIOで`firmware/`をビルド・書き込み
- Web: `web/`で`npm install && npm run dev`で起動

## 参考
- AM2301B: https://akizukidenshi.com/catalog/g/g116730/
- Web Serial API: https://developer.mozilla.org/ja/docs/Web/API/Web_Serial_API
- JSON-RPC: https://www.jsonrpc.org/specification
