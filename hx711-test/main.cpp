#include <HX711.h>
#include "ArduinoGraphics.h"
#include "Arduino_LED_Matrix.h"
#include <cstdio>
#include <cmath>

ArduinoLEDMatrix matrix;

HX711 channel1;

void setup()
{
  Serial.begin(9600);

  constexpr auto dout = A0;
  constexpr auto sck = A1;
  channel1.begin(dout, sck); // HX711.DOUT  - pin #A1, HX711.PD_SCK - pin #A0

  matrix.begin();
}

void loop()
{
  const auto raw = channel1.read_average(20);
  Serial.println(raw); // print the average of 20 readings from the ADC (full precision)

  // Convert raw to a double for formatting significant digits
  const auto value = static_cast<double>(raw);

  // Format for LED matrix as (+|-)d.d : normalize to one digit before decimal
  // e.g. +1.2, -3.4. This shows the mantissa (1 digit) with one decimal place.
  char buf[16];
  if (value == 0.0)
  {
    std::snprintf(buf, sizeof(buf), "0.0");
  }
  else
  {
    double av = std::fabs(value);
    int exp10 = static_cast<int>(std::floor(std::log10(av)));
    double mant = av / std::pow(10.0, exp10); // should be in [1,10)
    // round mantissa to one decimal place
    double mant_r = std::round(mant * 10.0) / 10.0;
    // if rounding pushed it to 10.0, scale back to 1.0 (we don't display exponent)
    if (mant_r >= 10.0)
    {
      mant_r /= 10.0;
    }
    char sign = (value >= 0.0) ? '+' : '-';
    std::snprintf(buf, sizeof(buf), "%c%.1f", sign, mant_r * 10);
  }

  constexpr auto white = 0xFFFFFF;
  matrix.beginDraw();
  matrix.stroke(white);
  matrix.textFont(Font_4x6);
  matrix.beginText(0, 1, white);
  matrix.println(buf);
  matrix.endText();
  matrix.endDraw();

  delay(1000);
}