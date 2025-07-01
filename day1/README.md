# Day 1: 環境構築と基本動作確認

## 🎯 今日の目標

- PlatformIOプロジェクトを作成してArduino開発環境を整備
- Arduino UNO R3の接続確認
- 基本的なLED点滅プログラムの実行
- シリアル通信の基本を理解

## ⏰ 予想学習時間: 2-3時間

## 📋 チェックリスト

### 1. PlatformIOプロジェクトの作成
- [ ] arduinoディレクトリでPlatformIOプロジェクトを初期化
- [ ] platformio.iniファイルの確認と設定
- [ ] プロジェクト構造の理解

### 2. Arduino UNO R3の接続確認
- [ ] Arduino UNO R3をUSBで接続
- [ ] デバイスの認識確認
- [ ] COMポート（またはシリアルポート）の確認

### 3. LED点滅プログラム
- [ ] 内蔵LED（Pin 13）の点滅プログラム作成
- [ ] プログラムのビルドとアップロード
- [ ] 動作確認

### 4. シリアル通信の基本
- [ ] シリアルモニターの使用方法
- [ ] メッセージ送信プログラムの作成
- [ ] PCとの通信確認

## 🛠 実装ステップ

### Step 1: PlatformIOプロジェクトの確認

プロジェクトはすでに初期化されています。現在の構造を確認しましょう：

```bash
# プロジェクト構造の確認
ls -la

# PlatformIO設定の確認
cat platformio.ini
```

### Step 2: 基本的なLED点滅プログラム

`src/main.cpp`に以下のコードを作成：

```cpp
#include <Arduino.h>

void setup() {
  // デジタルピン13（内蔵LED）を出力に設定
  pinMode(LED_BUILTIN, OUTPUT);

  // シリアル通信を9600bpsで開始
  Serial.begin(9600);
  Serial.println("Arduino UNO R3 - LED Blink Test");
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);   // LEDをON
  Serial.println("LED ON");
  delay(1000);                       // 1秒待機

  digitalWrite(LED_BUILTIN, LOW);    // LEDをOFF
  Serial.println("LED OFF");
  delay(1000);                       // 1秒待機
}
```

### Step 3: ビルドとアップロード

```bash
# プログラムをビルド
pio run

# Arduinoにアップロード（デバイスが自動検出されない場合は--upload-portオプションを使用）
pio run --target upload

# シリアルモニターを開始
pio device monitor --baud 9600
```

### Step 4: 動作確認

- [ ] Arduino上の内蔵LEDが1秒間隔で点滅することを確認
- [ ] シリアルモニターに「LED ON」「LED OFF」メッセージが表示されることを確認

## 🔧 トラブルシューティング

### Arduino が認識されない場合

```bash
# 接続されているシリアルデバイスを確認
ls /dev/ttyUSB* /dev/ttyACM*

# または
pio device list
```

### アップロードエラーの場合

1. Arduinoとの接続を確認
2. 他のアプリケーションがシリアルポートを使用していないか確認
3. Arduinoのリセットボタンを押してから再試行

### シリアルモニターが動作しない場合

```bash
# 正しいポートと速度を指定
pio device monitor --port /dev/ttyACM0 --baud 9600
```

## 📝 学習メモ

### 重要なコンセプト

1. **digitalWrite()**: デジタルピンの出力制御
2. **Serial.begin()**: シリアル通信の初期化
3. **Serial.println()**: シリアル出力
4. **delay()**: プログラムの一時停止

### 次回への準備

- [ ] アナログピンの基本概念を調べる
- [ ] センサーの基本的な仕組みを理解する
- [ ] HX711モジュールの仕様を確認する

## 🎯 今日の成果

- [ ] PlatformIO開発環境の構築完了
- [ ] Arduino UNO R3との通信確立
- [ ] 基本的なプログラムの動作確認
- [ ] シリアル通信の理解

## 📊 進捗状況

- 環境構築: ⬜
- LED制御: ⬜
- シリアル通信: ⬜
- 動作確認: ⬜

完了したらチェックマークを入れてください！

## 🚀 明日の予定

Day 2では、アナログ入力を使った電圧測定とセンサーデータの読み取りを学習します。
