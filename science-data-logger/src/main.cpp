#include <DHT.h>
#include <LiquidCrystal.h>
#include <ArduinoJson.h>

// ピン定義
#define DHT_PIN 2
#define DHT_TYPE DHT22
#define MOTOR_PIN 3
#define BUZZER_PIN 11
#define RED_LED_PIN 12
#define GREEN_LED_PIN 13
#define BUTTON_MODE_PIN 8
#define BUTTON_UP_PIN 9
#define BUTTON_DOWN_PIN 10
#define LIGHT_SENSOR_PIN A0
#define SOUND_SENSOR_PIN A1
#define POTENTIOMETER_PIN A2

// LCD設定 (RS, E, D4, D5, D6, D7)
LiquidCrystal lcd(4, 5, 6, 7, 8, 9);

// センサー初期化
DHT dht(DHT_PIN, DHT_TYPE);

// 制御変数
enum ControlMode { AUTO, MANUAL };
ControlMode currentMode = AUTO;
int fanSpeed = 0;
int manualSpeed = 0;
float temperature = 0;
float humidity = 0;
int lightLevel = 0;
int soundLevel = 0;

// タイミング制御
unsigned long lastSensorRead = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastDataSend = 0;
const unsigned long SENSOR_INTERVAL = 1000;
const unsigned long DISPLAY_INTERVAL = 500;
const unsigned long DATA_SEND_INTERVAL = 1000;

// ボタン制御
bool lastButtonModeState = HIGH;
bool lastButtonUpState = HIGH;
bool lastButtonDownState = HIGH;
unsigned long lastButtonPress = 0;
const unsigned long BUTTON_DEBOUNCE = 200;

// 関数の前方宣言
void readSensors();
int calculateAutoFanSpeed();
void controlFan(int speed);
void controlStatusLED();
void handleButtons();
void updateDisplay();
void sendDataToPC();
void processSerialCommands();

void setup() {
    Serial.begin(9600);

    // センサー初期化
    dht.begin();

    // LCD初期化
    lcd.begin(16, 2);
    lcd.print("Fan Controller");
    lcd.setCursor(0, 1);
    lcd.print("Starting...");

    // ピン設定
    pinMode(MOTOR_PIN, OUTPUT);
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(RED_LED_PIN, OUTPUT);
    pinMode(GREEN_LED_PIN, OUTPUT);
    pinMode(BUTTON_MODE_PIN, INPUT_PULLUP);
    pinMode(BUTTON_UP_PIN, INPUT_PULLUP);
    pinMode(BUTTON_DOWN_PIN, INPUT_PULLUP);

    // 初期化完了
    delay(2000);
    lcd.clear();

    // 起動音
    tone(BUZZER_PIN, 1000, 100);
    delay(200);
    tone(BUZZER_PIN, 1500, 100);

    Serial.println("Fan Control System Started");
}

void loop() {
    unsigned long currentTime = millis();

    // センサー読み取り
    if (currentTime - lastSensorRead >= SENSOR_INTERVAL) {
        readSensors();
        lastSensorRead = currentTime;
    }

    // 制御ロジック実行
    if (currentMode == AUTO) {
        fanSpeed = calculateAutoFanSpeed();
    } else {
        fanSpeed = manualSpeed;
    }

    // モーター制御
    controlFan(fanSpeed);

    // LED制御
    controlStatusLED();

    // ボタン処理
    handleButtons();

    // LCD更新
    if (currentTime - lastDisplayUpdate >= DISPLAY_INTERVAL) {
        updateDisplay();
        lastDisplayUpdate = currentTime;
    }

    // データ送信
    if (currentTime - lastDataSend >= DATA_SEND_INTERVAL) {
        sendDataToPC();
        lastDataSend = currentTime;
    }

    // シリアルコマンド処理
    processSerialCommands();
}

void readSensors() {
    // 温度・湿度読み取り
    float newTemp = dht.readTemperature();
    float newHumidity = dht.readHumidity();

    // エラーチェック
    if (!isnan(newTemp) && !isnan(newHumidity)) {
        temperature = newTemp;
        humidity = newHumidity;
    }

    // 光センサー読み取り
    lightLevel = analogRead(LIGHT_SENSOR_PIN);

    // 音センサー読み取り
    soundLevel = analogRead(SOUND_SENSOR_PIN);
}

int calculateAutoFanSpeed() {
    int tempBasedSpeed = 0;
    int humidityBasedSpeed = 0;

    // 温度ベース制御
    if (temperature < 25) {
        tempBasedSpeed = 0;
    } else if (temperature < 28) {
        tempBasedSpeed = 30;
    } else if (temperature < 32) {
        tempBasedSpeed = 60;
    } else {
        tempBasedSpeed = 100;
    }

    // 湿度ベース制御
    if (humidity < 60) {
        humidityBasedSpeed = 20;
    } else if (humidity > 70) {
        humidityBasedSpeed = 80;
    } else {
        humidityBasedSpeed = 40;
    }

    // 最大値を採用
    return max(tempBasedSpeed, humidityBasedSpeed);
}

void controlFan(int speed) {
    // PWM制御（0-100%を0-255に変換）
    int pwmValue = map(speed, 0, 100, 0, 255);
    analogWrite(MOTOR_PIN, pwmValue);
}

void controlStatusLED() {
    if (currentMode == AUTO) {
        // 自動モード：緑LED点灯
        digitalWrite(GREEN_LED_PIN, HIGH);
        digitalWrite(RED_LED_PIN, LOW);
    } else {
        // 手動モード：赤LED点灯
        digitalWrite(RED_LED_PIN, HIGH);
        digitalWrite(GREEN_LED_PIN, LOW);
    }
}

void handleButtons() {
    unsigned long currentTime = millis();

    // デバウンス処理
    if (currentTime - lastButtonPress < BUTTON_DEBOUNCE) {
        return;
    }

    // モード切替ボタン
    bool buttonModeState = digitalRead(BUTTON_MODE_PIN);
    if (buttonModeState == LOW && lastButtonModeState == HIGH) {
        currentMode = (currentMode == AUTO) ? MANUAL : AUTO;
        lastButtonPress = currentTime;

        // モード変更音
        tone(BUZZER_PIN, 800, 100);

        Serial.print("Mode changed to: ");
        Serial.println((currentMode == AUTO) ? "AUTO" : "MANUAL");
    }
    lastButtonModeState = buttonModeState;

    // 手動モード時の速度調整
    if (currentMode == MANUAL) {
        bool buttonUpState = digitalRead(BUTTON_UP_PIN);
        bool buttonDownState = digitalRead(BUTTON_DOWN_PIN);

        if (buttonUpState == LOW && lastButtonUpState == HIGH) {
            manualSpeed = min(100, manualSpeed + 10);
            lastButtonPress = currentTime;
            tone(BUZZER_PIN, 1200, 50);
        }

        if (buttonDownState == LOW && lastButtonDownState == HIGH) {
            manualSpeed = max(0, manualSpeed - 10);
            lastButtonPress = currentTime;
            tone(BUZZER_PIN, 600, 50);
        }

        lastButtonUpState = buttonUpState;
        lastButtonDownState = buttonDownState;
    }
}

void updateDisplay() {
    lcd.clear();

    // 1行目：温度・湿度
    lcd.setCursor(0, 0);
    lcd.print("T:");
    lcd.print(temperature, 1);
    lcd.print("C H:");
    lcd.print(humidity, 0);
    lcd.print("%");

    // 2行目：モード・風速
    lcd.setCursor(0, 1);
    lcd.print((currentMode == AUTO) ? "AUTO" : "MANUAL");
    lcd.print(" F:");
    lcd.print(fanSpeed);
    lcd.print("%");

    // 風速レベル表示
    int bars = map(fanSpeed, 0, 100, 0, 5);
    for (int i = 0; i < bars; i++) {
        lcd.print("*");
    }
}

void sendDataToPC() {
    // JSON形式でデータを送信
    JsonDocument doc;

    doc["timestamp"] = millis();
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["light"] = lightLevel;
    doc["sound"] = soundLevel;
    doc["fanSpeed"] = fanSpeed;
    doc["mode"] = (currentMode == AUTO) ? "auto" : "manual";
    doc["manualSpeed"] = manualSpeed;

    serializeJson(doc, Serial);
    Serial.println();
}

void processSerialCommands() {
    if (Serial.available() > 0) {
        String command = Serial.readStringUntil('\n');
        command.trim();

        // JSON形式のコマンドを解析
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, command);

        if (error) {
            Serial.println("Invalid JSON command");
            return;
        }

        String cmd = doc["command"];

        if (cmd == "setMode") {
            String mode = doc["mode"];
            if (mode == "auto") {
                currentMode = AUTO;
            } else if (mode == "manual") {
                currentMode = MANUAL;
                if (doc["speed"].is<int>()) {
                    manualSpeed = doc["speed"];
                    manualSpeed = constrain(manualSpeed, 0, 100);
                }
            }

            Serial.print("Mode set to: ");
            Serial.println(mode);

        } else if (cmd == "setSpeed" && currentMode == MANUAL) {
            manualSpeed = doc["speed"];
            manualSpeed = constrain(manualSpeed, 0, 100);

            Serial.print("Manual speed set to: ");
            Serial.println(manualSpeed);

        } else if (cmd == "getStatus") {
            sendDataToPC();
        }
    }
}
