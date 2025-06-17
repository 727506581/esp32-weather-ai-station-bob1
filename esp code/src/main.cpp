
#include "wifi2.h"
#include "sensor.h"
#include "cloud.h"
#include <HTTPClient.h>

void setup() {
    Serial.begin(115200);
    connectWiFi(); // 原来写的是 connectToWiFi()
    initSensors(); // 初始化传感器
}

void loop() {
    float temp = getTemperature();
    float hum = getHumidity();
    float pres = getPressure();
    float light = getLightIntensity();

    sendDataToThingSpeak(temp, hum, pres, light); // 发送数据到云端
    delay(15000); // ThingSpeak 需要 15 秒间隔
}
