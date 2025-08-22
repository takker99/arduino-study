// Arduino Uno R4 + AM2301B 温湿度センサー
// シリアル通信(JSON-RPC)でPCへデータ送信
// 公式: https://akizukidenshi.com/catalog/g/g116730/
// JSON-RPC: https://www.jsonrpc.org/specification

#include <Arduino.h>
#include <DHT.h>

// AM2301Bセンサー設定
constexpr auto DHTPIN = 2;      // AM2301Bデータピン (デジタルピン2)
constexpr auto DHTTYPE = DHT21; // AM2301BはDHT21互換

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);

  // 内蔵プルアップ抵抗を有効化（外付け抵抗がない場合の対策）
  pinMode(DHTPIN, INPUT_PULLUP);

  dht.begin();

  // センサー初期化待機
  delay(2000);
  Serial.println("AM2301B sensor initialized (with internal pullup)");
}

void loop() {
  // センサーからデータ読み取り
  const float h = dht.readHumidity();
  const float t = dht.readTemperature();

  // 読み取りエラーチェック
  if (isnan(h) || isnan(t)) {
    Serial.println("{\"jsonrpc\":\"2.0\",\"error\":{\"code\":-1,\"message\":\"Sensor read error\"},\"id\":1}");
    delay(1000);
    return;
  }

  // JSON-RPCレスポンス送信
  Serial.print("{\"jsonrpc\":\"2.0\",\"result\":{");
  Serial.print("\"temperature\":"); Serial.print(t, 2);
  Serial.print(",\"humidity\":"); Serial.print(h, 2);
  Serial.println("},\"id\":1}");

  delay(1000);
}
