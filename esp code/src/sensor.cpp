#include "sensor.h"
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <BH1750.h>
#include <ArduinoJson.h>

// 传感器初始化
DHT dht(11, DHT11);         // DHT11 连接 GPIO 11
Adafruit_BMP085 bmp180;
BH1750 lightMeter;

void initSensors() {
    dht.begin();
    
    // 设置 BMP180 和 BH1750 的 I2C 引脚（SDA: GPIO 4, SCL: GPIO 5）
    Wire.begin(4, 5);

    bmp180.begin();
    lightMeter.begin();
}

//前端数据
float getTemperature() {
    return dht.readTemperature();  // 摄氏温度
}

float getHumidity() {
    return dht.readHumidity();  // 湿度
}

float getPressure() {
    return bmp180.readPressure() / 100.0F;  // hPa
}

float getLightIntensity() {
    return lightMeter.readLightLevel();  // lx（勒克斯）
}

//云端数据
SensorData readSensors() {
    SensorData data;
    data.temperature = dht.readTemperature();
    data.humidity = dht.readHumidity();
    data.pressure = bmp180.readPressure() / 100.0;  // 转换为 hPa
    data.light = lightMeter.readLightLevel();
    return data;
}
