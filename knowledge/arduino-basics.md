# Arduino基礎知識とベストプラクティス

## 📋 概要

Arduino開発における基本的な概念、ベストプラクティス、よくある問題とその解決方法をまとめたリファレンスです。

## 🔧 Arduino UNO R3 基本仕様

### ハードウェア仕様
- **マイコン**: ATmega328P
- **動作電圧**: 5V
- **クロック**: 16MHz
- **フラッシュメモリ**: 32KB（ブートローダー用2KB含む）
- **SRAM**: 2KB
- **EEPROM**: 1KB
- **デジタルI/O**: 14ピン（PWM対応6ピン）
- **アナログ入力**: 6ピン
- **USB接続**: USB-Bコネクタ

### ピン配置の重要ポイント
- **Pin 13**: 内蔵LED（LED_BUILTIN）
- **Pin 0-1**: シリアル通信（RX/TX）
- **Pin 2-3**: 外部割り込み対応
- **Pin 3,5,6,9,10,11**: PWM出力対応
- **Pin A0-A5**: アナログ入力（10bit ADC、0-1023）

## ⚡ プログラミング基礎

### 基本構造
```cpp
#include <Arduino.h>

void setup() {
    // 初期化処理（1回だけ実行）
    // ピン設定、シリアル通信初期化など
}

void loop() {
    // メインループ（無限に繰り返し実行）
    // センサー読み取り、制御処理など
}
```

### 重要な関数

#### デジタルI/O
```cpp
// ピン設定
pinMode(pin, mode);    // INPUT, OUTPUT, INPUT_PULLUP

// デジタル出力
digitalWrite(pin, value);  // HIGH or LOW

// デジタル入力
int value = digitalRead(pin);  // HIGH(1) or LOW(0)
```

#### アナログI/O
```cpp
// アナログ入力（10bit、0-1023）
int value = analogRead(pin);

// PWM出力（8bit、0-255）
analogWrite(pin, value);
```

#### シリアル通信
```cpp
// 初期化
Serial.begin(baudRate);  // 通常9600bps

// 出力
Serial.print("Hello");     // 改行なし
Serial.println("World");   // 改行あり
Serial.print(value, HEX);  // 16進数表示

// 入力確認
if (Serial.available()) {
    String data = Serial.readString();
}
```

#### タイミング制御
```cpp
// 遅延
delay(milliseconds);        // ミリ秒単位
delayMicroseconds(microseconds);  // マイクロ秒単位

// 時間測定
unsigned long time = millis();    // プログラム開始からのミリ秒
unsigned long time = micros();    // マイクロ秒
```

## 🚀 ベストプラクティス

### 1. メモリ管理
```cpp
// ❌ 悪い例：動的メモリ確保（フラグメンテーション）
char* buffer = malloc(100);

// ✅ 良い例：固定サイズ配列
char buffer[100];

// ✅ 文字列リテラルはFLASHメモリに保存
const char message[] PROGMEM = "Hello World";
```

### 2. タイミング管理
```cpp
// ❌ 悪い例：delay()でブロック
void loop() {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(1000);
    digitalWrite(LED_BUILTIN, LOW);
    delay(1000);
}

// ✅ 良い例：非ブロッキング
unsigned long previousMillis = 0;
const long interval = 1000;

void loop() {
    unsigned long currentMillis = millis();
    
    if (currentMillis - previousMillis >= interval) {
        previousMillis = currentMillis;
        // LED状態を切り替え
        digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    }
    
    // 他の処理も並行実行可能
}
```

### 3. ピン設定の明確化
```cpp
// ✅ 定数で管理
const int LED_PIN = 13;
const int SENSOR_PIN = A0;
const int BUTTON_PIN = 2;

void setup() {
    pinMode(LED_PIN, OUTPUT);
    pinMode(SENSOR_PIN, INPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);  // 内部プルアップ抵抗
}
```

### 4. シリアル通信の安定性
```cpp
void setup() {
    Serial.begin(9600);
    while (!Serial) {
        ; // シリアル接続待ち（Leonardo等で必要）
    }
    Serial.println("System Ready");
}
```

## 🔍 デバッグとトラブルシューティング

### よくある問題と解決方法

#### 1. シリアル通信が動作しない
**症状**: シリアルモニターに何も表示されない

**解決策**:
- ボーレートの確認（コードとシリアルモニターで一致）
- USBケーブルの確認（充電専用ではなくデータ通信対応）
- ドライバーの確認（デバイスマネージャーでCOMポート確認）

#### 2. アップロードエラー
**症状**: `avrdude: stk500_recv(): programmer is not responding`

**解決策**:
```bash
# ポートの確認
pio device list

# 権限の確認（Linux/WSL2）
sudo usermod -a -G dialout $USER

# リセットボタンを押してから再試行
pio run --target upload
```

#### 3. メモリ不足
**症状**: 動作が不安定、リセットが頻発

**解決策**:
```cpp
// メモリ使用量の確認
int freeMemory() {
    char top;
    return &top - reinterpret_cast<char*>(sbrk(0));
}

void setup() {
    Serial.begin(9600);
    Serial.print("Free memory: ");
    Serial.println(freeMemory());
}
```

#### 4. フローティングピンの問題
**症状**: デジタル入力の値が不安定

**解決策**:
```cpp
// 内部プルアップ抵抗を使用
pinMode(BUTTON_PIN, INPUT_PULLUP);

// または外部プルアップ/プルダウン抵抗を接続
```

## 📊 パフォーマンス最適化

### メモリ使用量の監視
```bash
# ビルド時のメモリ使用量表示
pio run -v

# 出力例
RAM:   [====      ]  40.2% (used 824 bytes from 2048 bytes)
Flash: [===       ]  25.8% (used 8324 bytes from 32256 bytes)
```

### 実行速度の最適化
```cpp
// ❌ 遅い：除算
int result = value / 4;

// ✅ 速い：ビットシフト
int result = value >> 2;  // 4で除算と同等

// ❌ 遅い：浮動小数点
float voltage = analogRead(A0) * 5.0 / 1023.0;

// ✅ 速い：整数演算
int voltage_mv = analogRead(A0) * 5000 / 1023;  // ミリボルト単位
```

## 🔗 参考資料

- [Arduino Language Reference](https://www.arduino.cc/reference/en/)
- [Arduino Hardware](https://docs.arduino.cc/hardware/)
- [PlatformIO Documentation](https://docs.platformio.org/)
- [ATmega328P Datasheet](https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf)

## 📝 更新履歴

- **2025年7月1日**: 初版作成、基本的な概念とベストプラクティスを整理
