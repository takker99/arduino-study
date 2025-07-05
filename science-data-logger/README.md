# 扇風機制御型データロガー

## 🎯 プロジェクト概要

温度・湿度センサーの値に基づいて扇風機の回転速度を自動制御し、その効果をWebブラウザでリアルタイム監視するIoTシステムです。

## 🔧 システム構成

### ハードウェア
- **Arduino UNO R3**: メインコントローラー
- **DHT22**: 温度・湿度センサー
- **DCモーター**: 扇風機駆動
- **LCD 16x2**: 現在状態表示
- **RGB LED**: ステータス表示
- **ブザー**: 音響フィードバック
- **ボタン×3**: 手動制御
- **光センサー**: 環境光測定
- **音センサー**: 風切り音検出

### ソフトウェア
- **Arduino**: C++によるリアルタイム制御
- **Node.js**: Express + Socket.IO サーバー
- **SQLite**: データベース
- **Web UI**: HTML + CSS + JavaScript

## 🚀 セットアップ

### 1. Arduino側の準備

```bash
# プロジェクトルートディレクトリに移動
cd /home/takker/git/arduino-study

# ビルドとアップロード
pio run -e fancontrol
pio run -e fancontrol --target upload

# シリアルモニター
pio device monitor --baud 9600
```

### 2. Node.js側の準備

```bash
# science-data-loggerディレクトリに移動
cd science-data-logger

# 依存関係インストール
npm install

# サーバー起動（TypeScript版）
npm start
```

### 3. Web UI アクセス

ブラウザで `http://localhost:3000` にアクセス

## 🎛️ 制御ロジック

### 自動制御モード
```
温度による制御:
├── 25°C以下: 扇風機停止 (0%)
├── 25-28°C: 低速回転 (30%)
├── 28-32°C: 中速回転 (60%)
└── 32°C以上: 高速回転 (100%)

湿度による制御:
├── 60%RH以下: 低速 (20%)
├── 60-70%RH: 中速 (40%)
└── 70%RH以上: 高速 (80%)

最終風速 = max(温度ベース, 湿度ベース)
```

### 手動制御モード
- Web UI または Arduino のボタンで風速を0-100%で直接制御
- リアルタイムでの速度調整が可能

## 📊 Web UI 機能

### リアルタイム監視
- 温度・湿度・光・音の値を表示
- 時系列グラフによる推移表示
- 警告レベルの色分け表示

### 制御パネル
- 自動/手動モード切替
- 手動時の風速調整
- 現在の動作状態表示

### データ管理
- SQLiteによるデータ永続化
- CSV形式でのデータエクスポート
- 時間範囲指定でのデータ取得

## 🔌 API エンドポイント

### GET /api/status
最新のセンサーデータを取得

### GET /api/history?hours=24&limit=100
指定時間のデータ履歴を取得

### POST /api/control
制御コマンドを送信
```json
{
  "command": "setMode",
  "mode": "manual",
  "speed": 80
}
```

### GET /api/export?hours=24
CSV形式でデータをエクスポート

## 🛠️ 回路図

```
Arduino UNO ピン配置:
├── D2: DHT22 データ
├── D3: DCモーター PWM
├── D4-D7: LCD制御
├── D8-D10: ボタン入力
├── D11: ブザー
├── D12-D13: RGB LED
├── A0: 光センサー (LDR)
├── A1: 音センサー
└── A2: ポテンショメーター
```

## 🔧 トラブルシューティング

### Arduino が認識されない
```bash
# デバイス一覧確認
pio device list

# 権限問題の解決
sudo usermod -a -G dialout $USER
newgrp dialout
```

### Node.js の依存関係エラー
```bash
# キャッシュクリア
npm cache clean --force

# 再インストール
rm -rf node_modules package-lock.json
npm install
```

### WebSocket 接続エラー
- ファイアウォール設定を確認
- ポート3000が使用可能か確認
- Arduino のシリアル通信が正常か確認

## 📈 発展機能

### 実装済み
- [x] リアルタイム監視
- [x] 自動制御
- [x] 手動制御
- [x] データ保存
- [x] グラフ表示
- [x] CSVエクスポート

### 今後の拡張
- [ ] 機械学習による予測制御
- [ ] 外部気象APIとの連携
- [ ] モバイルアプリ化
- [ ] 複数デバイス対応
- [ ] 電力消費量監視

## 🎓 学習効果

このプロジェクトを通じて以下の技術を習得できます：

### Arduino
- センサーデータの読み取り
- PWM制御
- JSON通信
- 割り込み処理

### Node.js
- Express フレームワーク
- WebSocket通信
- SQLite操作
- シリアル通信

### Web技術
- リアルタイム可視化
- Chart.js
- レスポンシブデザイン
- RESTful API

### システム設計
- IoT アーキテクチャ
- データフロー設計
- エラーハンドリング
- ユーザーインターフェース

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。
