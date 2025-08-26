#include <HX711.h>

HX711 channel1;

constexpr auto dout = A0;
constexpr auto sck = A1;

void setup()
{
  Serial.begin(9600);
  channel1.begin(dout, sck); // HX711.DOUT  - pin #A1, HX711.PD_SCK - pin #A0
}

void loop()
{
  Serial.println(channel1.read_average(20)); // print the average of 20 readings from the ADC
  delay(1000);
}