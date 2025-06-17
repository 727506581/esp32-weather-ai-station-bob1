// ThingSpeak API服务

export interface ThingSpeakData {
  temperature: number
  humidity: number
  lightIntensity: number // 新增光强度字段
  windSpeed: number
  pressure: number
  rainfall: number
  uvIndex: number
  // 添加其他你在ThingSpeak上存储的数据字段
  weatherDescription?: string // 来自OpenWeather的天气描述
}

export interface ThingSpeakChartData {
  created_at: string
  field1: number | string // 假设field1是温度
  field2: number | string // 假设field2是湿度
  field3: number | string // 假设field3是照度
  field4: number | string // 假设field4是气压
  field5: number | string // 假设field5是降雨量
  field6: number | string // 假设field6是紫外线指数
  // 添加其他字段
}

// 安全解析数字
function safeParseFloat(value: any): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value

  const parsed = Number.parseFloat(String(value))
  return isNaN(parsed) ? 0 : parsed
}

// 获取最新的天气数据
export async function getLatestWeatherData(): Promise<ThingSpeakData> {
  try {
    // 首先尝试从ThingSpeak获取数据
    const response = await fetch(`/api/weather?type=latest`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    const data = await response.json()
    console.log("Latest ThingSpeak data:", data)

    // 检查API是否建议使用演示数据
    if (data.useDemoData) {
      console.log("API suggests using demo data:", data.error || "Unknown reason")
      throw new Error(`API suggests using demo data: ${data.error || "Unknown reason"}`)
    }

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    // 获取从OpenWeather获取补充数据 (风速、降雨量、UV指数)
    const openWeatherResponse = await fetch(`/api/weather?source=openweather`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    const openWeatherData = await openWeatherResponse.json()
    console.log("OpenWeather data:", openWeatherData)

    // 根据你的ThingSpeak字段映射进行调整
    const baseData = {
      temperature: safeParseFloat(data.field1),
      humidity: safeParseFloat(data.field2),
      lightIntensity: safeParseFloat(data.field3), // 光强度
      pressure: safeParseFloat(data.field4),
      rainfall: safeParseFloat(data.field5),
      windSpeed: 0, // 将从OpenWeather获取
      uvIndex: 0, // 将从OpenWeather获取
    }

    // 如果OpenWeather数据可用，用其填充缺失的数据
    if (openWeatherResponse.ok && openWeatherData.data) {
      const owData = openWeatherData.data
      return {
        ...baseData,
        // 只替换为0或缺失的数据
        windSpeed: owData.windSpeed || 0,
        rainfall: baseData.rainfall || owData.rainfall,
        uvIndex: owData.uvIndex || 0,
        weatherDescription: owData.weatherDescription,
      }
    }

    return baseData
  } catch (error) {
    console.error("Error fetching ThingSpeak data:", error)
    throw error
  }
}

// 获取历史天气数据用于图表
export async function getHistoricalWeatherData(hours = 24): Promise<ThingSpeakChartData[]> {
  try {
    const response = await fetch(`/api/weather?type=historical&hours=${hours}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })

    const data = await response.json()
    console.log("Historical data response:", data)

    // 检查API是否建议使用演示数据
    if (data.useDemoData) {
      console.log("API suggests using demo data for historical data:", data.error || "Unknown reason")
      throw new Error(`API suggests using demo data: ${data.error || "Unknown reason"}`)
    }

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    if (!data.feeds || !Array.isArray(data.feeds)) {
      console.error("Invalid historical data format:", data)
      throw new Error("Invalid data format from ThingSpeak API")
    }

    return data.feeds
  } catch (error) {
    console.error("Error fetching ThingSpeak historical data:", error)
    throw error
  }
}

// 将ThingSpeak数据转换为图表格式
export function convertToChartData(
  data: ThingSpeakChartData[],
  fieldNumber: number,
): { time: string; value: number }[] {
  if (!data || data.length === 0) {
    console.log(`No data to convert for field ${fieldNumber}`)
    return []
  }

  const result = data.map((item) => {
    // 将ThingSpeak的时间戳转换为小时:分钟格式
    let time = "00:00"
    try {
      const date = new Date(item.created_at)
      time = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
    } catch (e) {
      console.error("Error parsing date:", e)
    }

    // 根据字段号获取对应的值
    const fieldKey = `field${fieldNumber}` as keyof ThingSpeakChartData
    const value = safeParseFloat(item[fieldKey])

    return { time, value }
  })

  console.log(`Converted data for field ${fieldNumber}:`, result)
  return result
}

// 生成模拟数据
export function generateDemoData(): {
  currentWeather: ThingSpeakData
  temperatureData: { time: string; value: number }[]
  humidityData: { time: string; value: number }[]
  rainfallData: { time: string; value: number }[]
  windData: { time: string; value: number }[]
  pressureData: { time: string; value: number }[]
  uvIndexData: { time: string; value: number }[]
} {
  // 生成当前时间
  const now = new Date()
  const currentHour = now.getHours()

  // 生成24小时的模拟数据，基于当前时间
  const generateHourlyData = (baseValue: number, variance: number, min = 0): { time: string; value: number }[] => {
    return Array.from({ length: 24 }, (_, i) => {
      // 计算小时，从当前时间往前推24小时
      const hour = (currentHour - 23 + i + 24) % 24

      // 生成一个随机值，但保持一定的连续性
      const randomFactor = Math.sin(i / 4) * variance + (Math.random() - 0.5) * variance * 0.5
      const value = Math.max(min, baseValue + randomFactor)

      return {
        time: `${hour.toString().padStart(2, "0")}:00`,
        value: Number(value.toFixed(1)),
      }
    })
  }

  // 生成更真实的温度数据，考虑一天中的温度变化规律
  const generateTemperatureData = (): { time: string; value: number }[] => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = (currentHour - 23 + i + 24) % 24

      // 温度变化模式：凌晨最低，下午2-3点最高
      let baseTemp = 20 // 基础温度

      // 根据小时调整温度
      if (hour >= 0 && hour < 6) {
        // 凌晨0-6点，温度较低
        baseTemp -= 5 + (3 - hour) * 0.5
      } else if (hour >= 6 && hour < 12) {
        // 早上6-12点，温度逐渐升高
        baseTemp -= 3 - (hour - 6) * 0.8
      } else if (hour >= 12 && hour < 18) {
        // 中午12-18点，温度较高
        baseTemp += 3 - Math.abs(hour - 14) * 0.5
      } else {
        // 晚上18-24点，温度逐渐降低
        baseTemp -= (hour - 18) * 0.6
      }

      // 添加一些随机波动
      const randomFactor = (Math.random() - 0.5) * 2
      const value = baseTemp + randomFactor

      return {
        time: `${hour.toString().padStart(2, "0")}:00`,
        value: Number(value.toFixed(1)),
      }
    })
  }

  // 生成更真实的湿度数据，与温度相反
  const generateHumidityData = (tempData: { time: string; value: number }[]): { time: string; value: number }[] => {
    return tempData.map((item) => {
      // 湿度与温度大致成反比
      const baseHumidity = 80 - (item.value - 15) * 2
      const randomFactor = (Math.random() - 0.5) * 10
      const value = Math.min(100, Math.max(30, baseHumidity + randomFactor))

      return {
        time: item.time,
        value: Math.round(value),
      }
    })
  }
 // 光强度 - 根据当前时间计算
 let currentLightIntensity = 0
 if (currentHour >= 6 && currentHour <= 18) {
   // 正弦曲线模拟日间光强变化 (0-1000 lux范围)
   currentLightIntensity = Math.sin(((currentHour - 6) * Math.PI) / 12) * 1000
   // 添加随机波动
   currentLightIntensity += (Math.random() - 0.5) * 200
   currentLightIntensity = Math.max(0, Math.min(1200, currentLightIntensity))
 }
  // 生成当前天气数据
  const temperatureData = generateTemperatureData()
  const currentTemp = temperatureData[temperatureData.length - 1].value

  const humidityData = generateHumidityData(temperatureData)
  const currentHumidity = humidityData[humidityData.length - 1].value

  const windData = generateHourlyData(10, 5, 0)
  const currentWind = windData[windData.length - 1].value

  const pressureData = generateHourlyData(1013, 5, 990)
  const currentPressure = pressureData[pressureData.length - 1].value

  // 降雨量数据 - 大部分时间为0，偶尔有降雨
  const rainfallData = Array.from({ length: 24 }, (_, i) => {
    const hour = (currentHour - 23 + i + 24) % 24

    // 随机选择几个小时有雨
    const hasRain = Math.random() < 0.2
    const value = hasRain ? Math.random() * 5 : 0

    return {
      time: `${hour.toString().padStart(2, "0")}:00`,
      value: Number(value.toFixed(1)),
    }
  })
  const currentRainfall = rainfallData[rainfallData.length - 1].value

  // UV指数数据 - 日出到日落期间逐渐升高然后降低
  const uvIndexData = Array.from({ length: 24 }, (_, i) => {
    const hour = (currentHour - 23 + i + 24) % 24

    // 计算UV指数 - 日出(6点)到日落(18点)期间有值，其他时间为0
    let value = 0

    if (hour >= 6 && hour <= 18) {
      // 正弦曲线模拟日间UV变化
      value = Math.sin(((hour - 6) * Math.PI) / 12) * 10
      // 添加随机波动
      value += (Math.random() - 0.5) * 2
      value = Math.max(0, Math.min(12, value))
    }

    return {
      time: `${hour.toString().padStart(2, "0")}:00`,
      value: Math.round(value * 10) / 10,
    }
  })
  const currentUV = Math.max(0, uvIndexData[uvIndexData.length - 1].value)

  console.log("Generated demo data:", {
    currentWeather: {
      temperature: currentTemp,
      humidity: currentHumidity,
      lightIntensity: currentLightIntensity,
      windSpeed: currentWind,
      pressure: currentPressure,
      rainfall: currentRainfall,
      uvIndex: currentUV,
    },
    temperatureData,
    humidityData,
    rainfallData,
    windData,
    pressureData,
    uvIndexData,
  })

  return {
    currentWeather: {
      temperature: currentTemp,
      humidity: currentHumidity,
      lightIntensity: Math.round(currentLightIntensity),
      windSpeed: currentWind,
      pressure: currentPressure,
      rainfall: currentRainfall,
      uvIndex: currentUV,
    },
    temperatureData,
    humidityData,
    rainfallData,
    windData,
    pressureData,
    uvIndexData,
  }
}
