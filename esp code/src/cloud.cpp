#include "cloud.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "sensor.h"  // 读取传感器数据

// 替换为你的 ThingSpeak API Key
const String apiKey = "576H3G929MFDP878";
const char* serverName = "http://api.thingspeak.com/update";

void sendDataToThingSpeak(float temperature, float humidity, float pressure, float light) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;

        String url = serverName;
        url += "?api_key=" + apiKey;
        url += "&field1=" + String(temperature);
        url += "&field2=" + String(humidity);
        url += "&field3=" + String(pressure);
        url += "&field4=" + String(light);

        http.begin(url);
        int httpResponseCode = http.GET();

        if (httpResponseCode > 0) {
            Serial.print("HTTP Response code: ");
            Serial.println(httpResponseCode);
        } else {
            Serial.print("Error sending data: ");
            Serial.println(httpResponseCode);
        }

        http.end();
    } else {
        Serial.println("WiFi not connected");}
    }
    
