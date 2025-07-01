# Arduino Study Project

Arduino学習プロジェクト - 土質試験機制御システム開発のためのArduino + PlatformIO + Node.js学習リポジトリ

## 🎯 最終目標

土質試験で使用している動ひずみ測定器（アンプ）とAD/DA変換用PCIボードを、Arduino UNO R3 + HX711で置き換え、Node.jsでシリアル通信による制御システムを構築する。

## 📅 1週間学習スケジュール

### Day 1: 環境構築と基本動作確認
- [ ] PlatformIOプロジェクトの作成
- [ ] Arduino UNO R3の接続確認
- [ ] LED点滅プログラム
- [ ] シリアル通信の基本

### Day 2: アナログ入力とセンサー基礎
- [ ] アナログ入力の理解
- [ ] 電圧測定の実装
- [ ] データのシリアル出力

### Day 3: HX711モジュールの使用
- [ ] HX711の配線と接続
- [ ] 重量/力センサーの読み取り
- [ ] 校正機能の実装

### Day 4: Node.js通信システム
- [ ] Node.jsシリアル通信ライブラリの導入
- [ ] リアルタイムデータ受信
- [ ] Webベースの監視画面

### Day 5: 制御機能の実装
- [ ] Arduinoへのコマンド送信
- [ ] センサー制御の自動化
- [ ] エラーハンドリング

### Day 6: 動ひずみ測定シミュレーション
- [ ] 測定データの処理
- [ ] グラフ表示機能
- [ ] データ保存機能

### Day 7: 統合とテスト
- [ ] システム全体の統合
- [ ] 動作テストと調整
- [ ] ドキュメント作成

## 🛠 技術構成

- **開発環境**: VSCode + PlatformIO + WSL2
- **マイコン**: Arduino UNO R3
- **センサー**: HX711 (24bit ADC)
- **PC制御**: Node.js + Serial Communication
- **UI**: Web Browser (HTML/CSS/JavaScript)

## 📁 プロジェクト構造

```
arduino-study/                 # PlatformIOプロジェクト（ルート）
├── .pio/                     # PlatformIOビルドキャッシュ
├── .vscode/                  # VSCode設定
├── platformio.ini            # PlatformIO設定
├── day1/                     # Day 1学習コンテンツ
│   ├── README.md             # Day 1学習ガイド
│   └── main.cpp              # Day 1のArduinoコード
├── day2/                     # Day 2学習コンテンツ（予定）
├── day3/                     # Day 3学習コンテンツ（予定）
├── ...                       # Day 4-7（予定）
├── knowledge/                # プロジェクト知識ベース
│   ├── project-structure.md  # プロジェクト構造説明
│   └── development-environment.md # 開発環境説明
├── chat.md                   # 学習履歴
└── README.md                 # このファイル
```

## 🚀 クイックスタート

### 1. リポジトリのクローン
```bash
git clone https://github.com/takker99/arduino-study.git
cd arduino-study
```

### 2. Day 1プログラムのビルドとアップロード
```bash
# Day 1のビルド
pio run -e day1

# Day 1のアップロード
pio run -e day1 --target upload

# シリアルモニター
pio device monitor --baud 9600
```

### 3. 他の日のプログラム（将来）
```bash
# Day 2のビルド（作成後）
pio run -e day2

# Day 3のビルド（作成後）
pio run -e day3
```

## 📚 学習リソース

- [PlatformIO Documentation](https://docs.platformio.org/)
- [Arduino Reference](https://www.arduino.cc/reference/en/)
- [HX711 Library](https://github.com/bogde/HX711)
- [Node.js SerialPort](https://serialport.io/)

## 🔧 必要なハードウェア

- Arduino UNO R3
- HX711 24bit ADCモジュール
- ロードセル（重量センサー）または圧力センサー
- ブレッドボード
- ジャンパーワイヤー
- USBケーブル

## 📝 学習記録

各日の学習内容は `dayXX/` フォルダ内のREADME.mdに記録していきます。

## 🎯 マイルストーン

- [x] リポジトリ作成
- [x] Day 1: 基本環境構築とLED点滅
- [ ] Day 2: センサー基礎
- [ ] Day 3: HX711実装
- [ ] Day 4: Node.js通信
- [ ] Day 5: 制御機能
- [ ] Day 6: 測定システム
- [ ] Day 7: 統合完成

## 📄 ライセンス

MIT License

## 💡 学習を始める場合

各日の学習を始める場合は、以下のステップに従ってください：

1. `dayXX/README.md` を確認して学習内容を把握
2. 対応する環境でビルド: `pio run -e dayXX`
3. Arduinoにアップロード: `pio run -e dayXX --target upload`
4. 動作確認とシリアル通信テスト

詳細な手順は各日のドキュメントを参照してください。
