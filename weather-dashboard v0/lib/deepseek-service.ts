// DeepSeek AI 预测服务

import type { ThingSpeakData } from "./thingspeak-service"

// 调用DeepSeek API获取天气预测
export async function getWeatherPrediction(weatherData: ThingSpeakData): Promise<{
  prediction: string;
  trends: {
    temperature: string;
    humidity: string;
    pressure: string;
    general: string;
  };
  recommendations: string[];
}> {
  try {
    const response = await fetch("http://localhost:3002/api/deepseek", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ weatherData }),
    });

    if (!response.ok) {
      throw new Error(`请求失败，状态码：${response.status}`);
    }

    const result = await response.json();
    console.log("后端返回的结果：", result); // 添加日志
    return result;
  } catch (error) {
    console.error("调用后端失败：", error);
    throw error;
  }
}

// 生成模拟的AI预测结果（当API调用失败时使用）
export function generateMockPrediction(weatherData: ThingSpeakData) {
  // 基于当前天气数据生成合理的预测
  const { temperature, humidity, pressure } = weatherData

  // 温度趋势
  let tempTrend = "温度将保持稳定"
  if (temperature > 30) {
    tempTrend = "未来12小时温度可能略有下降，夜间降至26-28°C"
  } else if (temperature > 20) {
    tempTrend = "温度适中，预计白天升高2-3°C，夜间降低3-5°C"
  } else {
    tempTrend = "温度偏低，预计将缓慢回升，日间最高可达22°C左右"
  }

  // 湿度趋势
  let humidityTrend = "湿度将保持稳定"
  if (humidity < 30) {
    humidityTrend = "湿度偏低，空气干燥，未来可能持续干燥状态"
  } else if (humidity > 70) {
    humidityTrend = "湿度较高，可能有降水，建议关注天气变化"
  } else {
    humidityTrend = "湿度适中，体感舒适，预计无明显变化"
  }

  // 气压趋势
  let pressureTrend = "气压稳定，天气系统无明显变化"
  if (pressure < 1000) {
    pressureTrend = "气压偏低，可能有不稳定天气系统接近"
  } else if (pressure > 1020) {
    pressureTrend = "气压偏高，预计天气晴朗稳定"
  }

  // 综合趋势
  let generalTrend = "总体天气状况稳定，无明显变化"
  if (temperature > 30 && humidity < 30) {
    generalTrend = "高温干燥天气将持续，注意防暑防晒"
  } else if (temperature > 25 && humidity > 70) {
    generalTrend = "闷热潮湿天气，可能有雷阵雨，注意携带雨具"
  } else if (temperature < 15) {
    generalTrend = "气温偏低，建议适当增添衣物"
  }

  // 建议
  const recommendations = [
    temperature > 30 ? "避免正午户外活动，注意防暑降温" : "天气适宜，可进行户外活动",
    humidity < 30 ? "注意补充水分，预防皮肤干燥" : "湿度适宜，体感舒适",
    pressure < 1000 ? "气压偏低，气象敏感人群注意调整作息" : "气压稳定，适合日常活动",
    "定期关注天气预报，及时调整出行计划",
  ]

  return {
    prediction: `基于当前气象数据（温度${temperature.toFixed(1)}°C，湿度${humidity.toFixed(
      0,
    )}%，气压${pressure.toFixed(2)}hPa），AI预测未来12小时天气趋势如下：`,
    trends: {
      temperature: tempTrend,
      humidity: humidityTrend,
      pressure: pressureTrend,
      general: generalTrend,
    },
    recommendations,
  }
}
