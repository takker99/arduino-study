// HX711 + 簡易RPCによる START/STOP + データストリーム実装 (暫定MVP)
// ボーレート: 9600bps (要件: 十分な20Hz程度を想定)。問題があれば後で引き上げ可能。
// コマンド形式 (行末に\n):
//   START interval=<ms>
//   STOP
// 応答:
//   OK START | ERR START code=<n> msg=<text>
//   OK STOP  | ERR STOP code=<n> msg=<text>
// データ行 (測定中):
//   DATA t=<ms> raw=<int> avg=<int>

#include <HX711.h>
#include "ArduinoGraphics.h"
#include "Arduino_LED_Matrix.h"
#include <cstdio>
#include <cmath>
#include <cstring>

ArduinoLEDMatrix matrix;
HX711 channel1;

namespace {
  enum class State : uint8_t { Idle, Measuring };
  State state = State::Idle;

  // 設定パラメータ
  unsigned long intervalMs = 50; // デフォルト: 50ms (20Hz近似)
  constexpr unsigned long kMinInterval = 20;  // 50Hz上限より遅い
  constexpr unsigned long kMaxInterval = 1000; // 1Hz

  // サンプリング補助
  constexpr int kAvgSamples = 4; // 短期平均

  unsigned long startEpochMs = 0;
  unsigned long lastSampleMs = 0;

  // LED表示: 3文字制限想定 => 符号 + 2桁 (四捨五入後)
  void showValue(long v) {
    char buf[4] = {0};
    // 生値をスケールせず桁詰め。絶対値が99を超える場合は"--"表示。
    long av = std::labs(v);
    if (av > 99) {
      std::strncpy(buf, "--", sizeof(buf));
    } else {
      char sign = (v < 0) ? '-' : '+'; // 要件: 符号付
      std::snprintf(buf, sizeof(buf), "%c%02ld", sign, av);
    }
    constexpr auto white = 0xFFFFFF;
    matrix.beginDraw();
    matrix.stroke(white);
    matrix.textFont(Font_4x6);
    matrix.beginText(0, 1, white);
    matrix.print(buf);
    matrix.endText();
    matrix.endDraw();
  }

  void printError(const char* cmd, int code, const char* msg) {
    Serial.print("ERR "); Serial.print(cmd);
    Serial.print(" code="); Serial.print(code);
    Serial.print(" msg="); Serial.println(msg);
  }

  void printOk(const char* cmd) {
    Serial.print("OK "); Serial.println(cmd);
  }

  void handleStart(char* line) {
    if (state == State::Measuring) {
      printError("START", 3, "BUSY");
      return;
    }
    // 形式: START interval=NN
    unsigned long tmpInterval = intervalMs;
    if (char* p = std::strstr(line, "interval=")) {
      p += 9;
      tmpInterval = std::strtoul(p, nullptr, 10);
    }
    if (tmpInterval < kMinInterval || tmpInterval > kMaxInterval) {
      printError("START", 2, "BAD_INTERVAL");
      return;
    }
    intervalMs = tmpInterval;
    startEpochMs = millis();
    lastSampleMs = 0;
    state = State::Measuring;
    printOk("START");
  }

  void handleStop() {
    if (state != State::Measuring) {
      printError("STOP", 4, "NOT_MEASURING");
      return;
    }
    state = State::Idle;
    printOk("STOP");
  }

  void processCommand(char* line) {
    // 行末改行除去
    size_t len = std::strlen(line);
    while (len && (line[len-1] == '\n' || line[len-1] == '\r')) line[--len] = '\0';
    if (len == 0) return;
    if (std::strncmp(line, "START", 5) == 0) {
      handleStart(line);
    } else if (std::strncmp(line, "STOP", 4) == 0) {
      handleStop();
    } else {
      printError("CMD", 1, "UNKNOWN");
    }
  }

  void maybeSample() {
    if (state != State::Measuring) return;
    unsigned long now = millis();
    if (now - lastSampleMs < intervalMs) return;
    lastSampleMs = now;
    if (!channel1.is_ready()) {
      // センサー未準備: スキップせず通知 (頻発する場合は配線/ノイズ/レート問題)
      unsigned long tRel = now - startEpochMs;
      Serial.print("DATA t="); Serial.print(tRel);
      Serial.println(" status=NOT_READY");
      showValue(0);
      return;
    }
    // HX711平均読み取り (10回) 公式ライブラリAPI
    long avg = channel1.read_average(10);
    unsigned long tRel = now - startEpochMs;
    Serial.print("DATA t="); Serial.print(tRel);
    Serial.print(" raw="); Serial.print(avg); // rawとavgを現段階同一とする (高速化優先)
    Serial.print(" avg="); Serial.println(avg);
    showValue(avg % 1000); // 下位2桁を使用表示 (簡易)
  }
}

void setup() {
  Serial.begin(9600);
  constexpr auto dout = A0;
  constexpr auto sck = A1;
  channel1.begin(dout, sck);
  matrix.begin();
  // 起動メッセージ
  Serial.println("OK READY");
}

void loop() {
  // コマンド受信 (非ブロッキング行バッファ)
  static char buf[64];
  static size_t idx = 0;
  while (Serial.available() > 0) {
    char c = static_cast<char>(Serial.read());
    if (c == '\n') {
      buf[idx] = '\0';
      processCommand(buf);
      idx = 0;
    } else if (idx < sizeof(buf) - 1) {
      buf[idx++] = c;
    }
  }
  maybeSample();
}