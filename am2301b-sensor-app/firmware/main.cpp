// Arduino Uno R4 + AM2301B 温湿度センサー
// シリアル通信(JSON-RPC)でPCへデータ送信
// 公式: https://akizukidenshi.com/catalog/g/g116730/
// JSON-RPC: https://www.jsonrpc.org/specification

#include <Arduino.h>
// センサーライブラリ削除。ダミーデータ送信。

void setup() {
  Serial.begin(115200);
  // ダミーデータ用の乱数初期化
  randomSeed(analogRead(0));
}

void loop() {
  // ダミー温度: 20.0〜30.0℃
  float t = 20.0 + (random(0, 1000) / 100.0);
  // ダミー湿度: 40.0〜60.0%
  float h = 40.0 + (random(0, 2000) / 100.0);
  // JSON-RPCレスポンス例
  Serial.print("{\"jsonrpc\":\"2.0\",\"result\":{");
  Serial.print("\"temperature\":"); Serial.print(t);
  Serial.print(",\"humidity\":"); Serial.print(h);
  Serial.println("},\"id\":1}");
  delay(1000);
}
