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
