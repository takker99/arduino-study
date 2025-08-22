# Web SPA (preact + vite)

Web Serial APIでArduinoとJSON-RPC通信し、温度・湿度を表示・グラフ化するSPAです。

## セットアップ
```bash
npm install
npm run dev
```

## 構成
- `src/`: preactアプリ本体
- Web Serial API: https://developer.mozilla.org/ja/docs/Web/API/Web_Serial_API
- グラフ描画: Chart.js等を利用予定
