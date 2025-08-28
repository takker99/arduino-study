#include <Arduino.h>

const int sensorPin = A0; // センサー接続ピン（アナログ入力）

void setup() {
  Serial.begin(9600); // シリアル通信開始
}

void loop() {
  int sensorValue = analogRead(sensorPin); // アナログ値取得
  Serial.print("Sensor Value: ");
  Serial.println(sensorValue); // シリアルに出力
  delay(1000); // 1秒待機
}