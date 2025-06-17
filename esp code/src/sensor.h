#ifndef SENSOR_H
#define SENSOR_H

struct SensorData {
    float temperature;
    float humidity;
    float pressure;
    float light;
};

void initSensors();
float getTemperature();
float getHumidity();
float getPressure();
float getLightIntensity();

void initSensors();
SensorData readSensors();

#endif
