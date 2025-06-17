#include "wifi2.h"
#include "sensor.h"
#include <WiFi.h>  // 确保包含 WiFi 库
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>



const char* ssid = "TP-LINK_5200";  
const char* password = "13101310";  
AsyncWebServer server(80);  // 在全局变量区域创建 Web 服务器实例


void connectWiFi() {
    Serial.begin(115200);  // 初始化 Serial 以便打印调试信息
    WiFi.begin(ssid, password);  // 连接 WiFi
    
    // 等待 WiFi 连接
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

        // Web 访问根目录
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
        request->send(200, "text/plain", "ESP32 Weather Station Running!");
    });

        // 传感器 API 返回 JSON 数据
    server.on("/sensors", HTTP_GET, [](AsyncWebServerRequest *request) {
        float temp = getTemperature();
        float hum = getHumidity();
        float press = getPressure();
        float light = getLightIntensity();

        String json = "{";
        json += "\"temperature\":" + String(temp) + ",";
        json += "\"humidity\":" + String(hum) + ",";
        json += "\"pressure\":" + String(press) + ",";
        json += "\"light\":" + String(light);
        json += "}";

        request->send(200, "application/json", json);
    });

    server.begin();
    

    // 打印连接成功后的信息
    Serial.println("\nWiFi Connected!");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
}
