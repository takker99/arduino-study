# PlatformIO開発環境とワークフロー

## 📋 概要

PlatformIOを使用したArduino開発の効率的なワークフローとベストプラクティスをまとめたガイドです。

## 🛠️ PlatformIOの基本概念

### プロジェクト構造
```
arduino-study/
├── platformio.ini        # プロジェクト設定ファイル
├── .pio/                # ビルドキャッシュ（自動生成）
├── dayXX/               # ソースコード（環境別）
│   └── main.cpp
├── lib/                 # プロジェクト固有ライブラリ
├── include/             # ヘッダーファイル
└── test/                # ユニットテスト
```

### platformio.iniの設定

#### 基本設定
```ini
[platformio]
src_dir = ./                # ソースディレクトリ

[env]
platform = atmelavr        # プラットフォーム
board = uno                 # ボード種類
framework = arduino         # フレームワーク
build_src_filter = +<*.h> +<common.cpp> +<${PIOENV}/main.cpp>
```

#### 環境別設定の特徴
- **PIOENV変数**: 現在の環境名（day1, day2等）を動的に参照
- **動的ソースファイル選択**: `${PIOENV}/main.cpp`で各日のコードを自動選択
- **共通ファイルの活用**: 全環境で共有するコードを効率的に管理

## 🚀 基本的なワークフロー

### 日常的な開発コマンド

#### ビルドとアップロード
```bash
# 特定環境でビルド
pio run -e day1

# 特定環境でアップロード
pio run -e day1 --target upload

# デフォルト環境（最初に定義された環境）
pio run
pio run --target upload

# 全環境でビルド
pio run -e day1 -e day2 -e day3
```

#### デバッグとモニタリング
```bash
# シリアルモニター
pio device monitor --baud 9600

# ポートを指定
pio device monitor --port /dev/ttyACM0 --baud 9600

# デバイス一覧
pio device list

# プロジェクト情報
pio project config
```

#### クリーンアップとメンテナンス
```bash
# ビルドキャッシュのクリア
pio run --target clean

# 全ての環境でクリーン
pio run -e day1 -e day2 --target clean

# 依存関係の更新
pio pkg update

# プラットフォームの更新
pio platform update
```

### VSCode統合での開発

#### 環境切り替え
1. ステータスバーのPlatformIO環境名をクリック
2. または `Ctrl+Shift+P` → "PlatformIO: Switch Project Environment"
3. 環境を選択すると、対応するmain.cppが自動的にアクティブになる

#### インテリセンスとコード補完
- 環境切り替え時に自動的にIntelliSenseが更新
- Arduino.hライブラリの関数補完が利用可能
- エラーや警告のリアルタイム表示

## 📚 ライブラリ管理

### ライブラリのインストール
```bash
# ライブラリ検索
pio lib search "HX711"

# ライブラリインストール
pio lib install "HX711"

# 特定バージョンの指定
pio lib install "HX711@0.7.5"

# GitHubからインストール
pio lib install "https://github.com/bogde/HX711.git"
```

### platformio.iniでのライブラリ管理
```ini
[env]
# ...既存設定...
lib_deps =
    HX711@^0.7.5
    ArduinoJson@^6.19.0
    https://github.com/example/CustomLibrary.git
```

### プロジェクト固有ライブラリ
```cpp
// lib/MyLibrary/MyLibrary.h
#ifndef MY_LIBRARY_H
#define MY_LIBRARY_H

class MyLibrary {
public:
    void begin();
    int readSensor();
};

#endif

// lib/MyLibrary/MyLibrary.cpp
#include "MyLibrary.h"
#include <Arduino.h>

void MyLibrary::begin() {
    // 初期化処理
}

int MyLibrary::readSensor() {
    // センサー読み取り処理
    return 0;
}
```

## 🔧 高度な設定とカスタマイズ

### ビルドオプションの調整
```ini
[env:day1]
build_flags =
    -DDEBUG_MODE=1
    -DBAUD_RATE=115200
    -Os                    # サイズ最適化

monitor_speed = 115200     # シリアルモニター速度
upload_speed = 115200      # アップロード速度
```

### 環境固有の設定
```ini
[env:day1]
# Day 1: 基本LED制御
build_flags = -DDAY1_MODE

[env:day2]
# Day 2: アナログ入力
build_flags = -DDAY2_MODE
lib_deps =
    SoftwareSerial

[env:day3]
# Day 3: HX711使用
build_flags = -DDAY3_MODE
lib_deps =
    HX711
```

### ボード固有の設定
```ini
[env:uno_debug]
board = uno
build_type = debug
debug_tool = avr-stub
debug_init_break = tbreak setup

[env:uno_release]
board = uno
build_type = release
build_flags = -Os -DNDEBUG
```

## 🔍 トラブルシューティング

### よくある問題と解決方法

#### 1. 環境が認識されない
**症状**: `pio run -e day1`でエラー

**解決策**:
```bash
# platformio.iniの構文確認
pio project config

# 環境一覧の確認
pio project config --json-output
```

#### 2. ライブラリが見つからない
**症状**: `#include`でエラー

**解決策**:
```bash
# インストール済みライブラリの確認
pio lib list

# ライブラリの再インストール
pio lib install

# キャッシュのクリア
rm -rf .pio/libdeps
pio run
```

#### 3. アップロードが失敗する
**症状**: `upload failed`

**解決策**:
```bash
# ポートの確認
pio device list

# 権限の確認（Linux/WSL2）
sudo usermod -a -G dialout $USER

# ボードのリセット後に再試行
pio run --target upload -v
```

#### 4. IntelliSenseが動作しない
**症状**: VSCodeでコード補完が効かない

**解決策**:
1. `Ctrl+Shift+P` → "PlatformIO: Rebuild IntelliSense Index"
2. 環境を正しく選択しているか確認
3. VSCodeを再起動

## 📊 パフォーマンス最適化

### ビルド時間の短縮
```bash
# 並列ビルド（CPUコア数に応じて調整）
pio run -j 4

# 増分ビルドの活用（デフォルトで有効）
# .pio/build/キャッシュを削除しない
```

### メモリ使用量の最適化
```ini
[env]
build_flags =
    -Os                 # サイズ最適化
    -ffunction-sections # 関数単位での最適化
    -fdata-sections     # データ単位での最適化
    -Wl,--gc-sections   # 未使用セクションの除去
```

## 🔄 継続的インテグレーション

### GitHub Actionsとの連携
```yaml
# .github/workflows/platformio.yml
name: PlatformIO CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'

    - name: Install PlatformIO
      run: pip install platformio

    - name: Build Day 1
      run: pio run -e day1

    - name: Build Day 2
      run: pio run -e day2
```

## 📝 プロジェクト固有のベストプラクティス

### 環境ベースビルドシステムの活用
```cpp
// common.h - 全環境で共有するヘッダー
#ifndef COMMON_H
#define COMMON_H

#include <Arduino.h>

// 共通定数
extern const int BAUD_RATE;
extern const int LED_PIN;

// 共通関数
void setupSerial();
void blinkLED(int count);

#endif

// common.cpp - 共通実装
#include "common.h"

const int BAUD_RATE = 9600;
const int LED_PIN = LED_BUILTIN;

void setupSerial() {
    Serial.begin(BAUD_RATE);
    while (!Serial) { delay(10); }
    Serial.println("System initialized");
}

void blinkLED(int count) {
    for (int i = 0; i < count; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(200);
        digitalWrite(LED_PIN, LOW);
        delay(200);
    }
}
```

### 日別コードの構造化
```cpp
// day1/main.cpp
#include "../common.h"

void setup() {
    setupSerial();
    pinMode(LED_PIN, OUTPUT);
    Serial.println("Day 1: Basic LED Control");
}

void loop() {
    blinkLED(1);
    delay(1000);
}

// day2/main.cpp
#include "../common.h"

void setup() {
    setupSerial();
    Serial.println("Day 2: Analog Input");
}

void loop() {
    int sensorValue = analogRead(A0);
    Serial.print("Sensor: ");
    Serial.println(sensorValue);
    delay(500);
}
```

## 🔗 参考資料

- [PlatformIO Core CLI Reference](https://docs.platformio.org/en/latest/core/index.html)
- [PlatformIO Project Configuration](https://docs.platformio.org/en/latest/projectconf/index.html)
- [Arduino Platform for PlatformIO](https://docs.platformio.org/en/latest/platforms/atmelavr.html)

## 📝 更新履歴

- **2025年7月1日**: 初版作成、環境ベースビルドシステムに特化した内容を整理
