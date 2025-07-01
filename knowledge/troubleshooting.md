# Arduino開発トラブルシューティングガイド

## 📋 概要

Arduino開発でよく遭遇する問題とその解決方法を体系的にまとめたガイドです。問題の症状から解決策を素早く見つけられるよう整理されています。

## 🔌 ハードウェア接続の問題

### Arduino が認識されない

#### 症状
- `pio device list`で何も表示されない
- デバイスマネージャーでCOMポートが見つからない
- 「Unknown device」として認識される

#### 解決策

**Windows + WSL2環境の場合**:
```powershell
# PowerShell（管理者権限）で実行
# 1. USBデバイス一覧確認
usbipd list

# 2. ArduinoをWSL2にバインド（BUSID は実際の値に置き換え）
usbipd bind --busid 1-3

# 3. WSL2にアタッチ
usbipd attach --wsl --busid 1-3
```

**Linux/WSL2内での確認**:
```bash
# デバイスファイルの確認
ls /dev/ttyUSB* /dev/ttyACM* 2>/dev/null

# USBデバイス情報の確認
lsusb | grep -i arduino

# dmesgでUSB接続ログ確認
dmesg | tail -20 | grep -i usb
```

**共通の対処法**:
1. USBケーブルの確認（データ通信対応のケーブルを使用）
2. 異なるUSBポートで試す
3. Arduino のリセットボタンを押す
4. ドライバーの再インストール

### 権限エラー（Permission Denied）

#### 症状
```
could not open port /dev/ttyACM0: [Errno 13] Permission denied
```

#### 解決策
```bash
# ユーザーをdialoutグループに追加
sudo usermod -a -G dialout $USER

# 設定を即座に反映（再ログインの代わり）
newgrp dialout

# または一時的に権限変更
sudo chmod 666 /dev/ttyACM0
```

## ⚡ アップロードの問題

### アップロードが失敗する

#### 症状
```
avrdude: stk500_recv(): programmer is not responding
avrdude: stk500_getsync() attempt X of 10: not in sync
```

#### 解決策

**基本的な対処法**:
```bash
# 1. ポートとボードの確認
pio device list
pio project config

# 2. リセットボタンを押してから即座にアップロード
pio run --target upload

# 3. 詳細ログでエラー内容確認
pio run --target upload -v
```

**高度な対処法**:
```bash
# 1. ブートローダーの手動リセット
# ArduinoのRESETボタンを2回素早く押す

# 2. 異なるアップロード速度で試行
# platformio.iniに追加
upload_speed = 57600

# 3. 他のプロセスがポートを使用していないか確認
sudo lsof /dev/ttyACM0
```

### アップロード後に動作しない

#### 症状
- アップロードは成功するが、プログラムが動作しない
- シリアル出力が表示されない

#### 解決策
```bash
# 1. プログラムサイズの確認
pio run -v
# RAM/Flash使用量が100%に近い場合はメモリ不足

# 2. シリアル通信の確認
pio device monitor --baud 9600

# 3. リセット後の動作確認
# RESETボタンを押してプログラム再開始
```

## 💻 ソフトウェアの問題

### コンパイルエラー

#### ライブラリが見つからない
```cpp
fatal error: SomeLibrary.h: No such file or directory
```

**解決策**:
```bash
# 1. ライブラリのインストール確認
pio lib list

# 2. ライブラリの検索とインストール
pio lib search "SomeLibrary"
pio lib install "SomeLibrary"

# 3. platformio.iniでの依存関係確認
[env]
lib_deps =
    SomeLibrary@^1.0.0
```

#### 関数が定義されていない
```cpp
error: 'someFunction' was not declared in this scope
```

**解決策**:
1. 関数のプロトタイプ宣言を確認
2. ヘッダーファイルのインクルード確認
3. ライブラリの初期化確認

### メモリ関連の問題

#### RAM不足
```cpp
// 症状：プログラムが途中で止まる、リセットが頻発

// 解決策：メモリ使用量の確認
int freeMemory() {
    char top;
    return &top - reinterpret_cast<char*>(sbrk(0));
}

void setup() {
    Serial.begin(9600);
    Serial.print("Free RAM: ");
    Serial.println(freeMemory());
}
```

**メモリ最適化手法**:
```cpp
// ❌ 悪い例：大きな配列をRAMに配置
char messages[1000] = "Very long string...";

// ✅ 良い例：FLASHメモリに配置
const char messages[] PROGMEM = "Very long string...";

// ❌ 悪い例：String使用（フラグメンテーション）
String data = "Hello " + String(value);

// ✅ 良い例：固定長char配列使用
char buffer[50];
snprintf(buffer, sizeof(buffer), "Hello %d", value);
```

## 🔧 PlatformIO固有の問題

### 環境が切り替わらない

#### 症状
- VSCodeで環境を変更してもビルド対象が変わらない
- 間違ったmain.cppがビルドされる

#### 解決策
```bash
# 1. 環境の明示的指定
pio run -e day1

# 2. VSCodeの設定確認
# ステータスバーのPlatformIO環境名を確認

# 3. IntelliSenseの再構築
# Ctrl+Shift+P → "PlatformIO: Rebuild IntelliSense Index"

# 4. platformio.iniの構文確認
pio project config
```

### ライブラリの依存関係問題

#### 症状
```
LDF: Library Dependency Finder -> https://bit.ly/configure-pio-ldf
LDF MODES: Finder ~ chain, Compatibility ~ soft
```

#### 解決策
```ini
# platformio.iniでLDFモードを調整
[env]
lib_ldf_mode = deep        # より詳細な依存関係解析
lib_compat_mode = strict   # 厳密な互換性チェック

# 特定ライブラリの除外
lib_ignore =
    SomeConflictingLibrary
```

## 📡 シリアル通信の問題

### シリアルモニターに何も表示されない

#### 症状
- `Serial.println()`を使用しているが出力が見えない
- プログラムは動作している様子

#### 解決策
```cpp
// 1. 基本的な確認
void setup() {
    Serial.begin(9600);
    // 接続待ち（Leonardo等で重要）
    while (!Serial) {
        delay(10);
    }
    Serial.println("Serial Ready");
}

// 2. ボーレートの確認
// コードとシリアルモニターで一致していることを確認

// 3. フラッシュの確認
Serial.flush();  // 送信バッファのクリア
```

**コマンドラインでの確認**:
```bash
# 正しいボーレートでモニター開始
pio device monitor --baud 9600

# ポートを明示的に指定
pio device monitor --port /dev/ttyACM0 --baud 9600
```

### 文字化けが発生する

#### 症状
- シリアル出力が文字化けする
- 一部の文字が正しく表示されない

#### 解決策
```cpp
// 1. ボーレートの一致確認
Serial.begin(9600);
// シリアルモニターも9600bpsに設定

// 2. 文字エンコーディングの確認
// UTF-8で保存されているか確認

// 3. 改行コードの設定
Serial.println("Test");  // CR+LF
Serial.print("Test\r\n"); // 明示的指定
```

## 🔍 デバッグ手法

### printf デバッグの活用

```cpp
// Arduino でのprintf 使用
void setup() {
    Serial.begin(9600);
}

void debug_print(const char* format, ...) {
    char buffer[128];
    va_list args;
    va_start(args, format);
    vsnprintf(buffer, sizeof(buffer), format, args);
    va_end(args);
    Serial.print(buffer);
}

void loop() {
    int sensor_value = analogRead(A0);
    debug_print("Sensor: %d, Time: %lu\n", sensor_value, millis());
    delay(1000);
}
```

### LED デバッグ

```cpp
// LEDの点滅パターンでデバッグ
void debug_blink(int count) {
    for (int i = 0; i < count; i++) {
        digitalWrite(LED_BUILTIN, HIGH);
        delay(200);
        digitalWrite(LED_BUILTIN, LOW);
        delay(200);
    }
    delay(1000);
}

void loop() {
    if (condition1) {
        debug_blink(1);  // 1回点滅 = condition1が真
    } else if (condition2) {
        debug_blink(2);  // 2回点滅 = condition2が真
    } else {
        debug_blink(3);  // 3回点滅 = どちらも偽
    }
}
```

## 🚨 緊急時の対処法

### プログラムが暴走した場合

1. **即座にArduinoをリセット**: RESETボタンを押す
2. **電源を切断**: USBケーブルを抜く
3. **安全なプログラムをアップロード**:
```cpp
void setup() {
    // 何もしない安全なプログラム
    Serial.begin(9600);
    Serial.println("Safe mode");
}

void loop() {
    delay(1000);
}
```

### ブートローダーが破損した場合

```bash
# ISPプログラマーを使用してブートローダーを復旧
# （高度な知識が必要、通常は発生しない）
```

## 📚 予防策とベストプラクティス

### 安全なプログラム作成
```cpp
// 1. 無限ループの防止
unsigned long start_time = millis();
while (condition) {
    if (millis() - start_time > 5000) {
        Serial.println("Timeout: breaking loop");
        break;
    }
    // ループ処理
}

// 2. 配列の境界チェック
const int ARRAY_SIZE = 10;
int data[ARRAY_SIZE];

void safe_array_access(int index, int value) {
    if (index >= 0 && index < ARRAY_SIZE) {
        data[index] = value;
    } else {
        Serial.print("Array index out of bounds: ");
        Serial.println(index);
    }
}

// 3. センサー値の妥当性チェック
int read_sensor_safe() {
    int value = analogRead(A0);
    if (value < 0 || value > 1023) {
        Serial.println("Invalid sensor reading");
        return -1;  // エラー値
    }
    return value;
}
```

## 📝 更新履歴

- **2025年7月1日**: 初版作成、WSL2環境に特化したトラブルシューティングを整理

## 🔗 参考資料

- [Arduino Troubleshooting Guide](https://www.arduino.cc/en/Guide/Troubleshooting)
- [PlatformIO Troubleshooting](https://docs.platformio.org/en/latest/faq.html)
- [WSL USB Documentation](https://docs.microsoft.com/en-us/windows/wsl/connect-usb)
