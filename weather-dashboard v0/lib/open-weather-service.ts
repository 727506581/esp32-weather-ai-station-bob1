// OpenWeather API服务

// API密钥配置 - 需要注册OpenWeatherMap API获取密钥
// https://openweathermap.org/api
const API_KEY = process.env.OPENWEATHER_API_KEY || "809b9823e5ffabcc27a2a7622ec9e876" // 替换为你的API密钥
const BASE_URL = "https://api.openweathermap.org/data/2.5"

export interface OpenWeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  pressure: number
  rainfall: number // 降水量 (mm/1h)
  uvIndex: number // 紫外线指数
  weatherId: number // 天气状态ID
  weatherDescription: string // 天气描述
}

export interface ForecastDay {
  date: string // 日期，格式：YYYY-MM-DD
  day: string // 星期几
  weather: string // 天气描述
  weatherId: number // 天气ID
  highTemp: number // 最高温度
  lowTemp: number // 最低温度
  precipitation: string // 降水概率
  humidity: string // 湿度
  wind: string // 风速和风向
}

// 获取指定城市的天气数据
export async function getWeatherDataByCity(city = "hefei", country = "cn"): Promise<OpenWeatherData> {
  try {
    // 检查API密钥是否配置
    if (!API_KEY || API_KEY === "809b9823e5ffabcc27a2a7622ec9e876") {
      throw new Error("OpenWeather API密钥未配置")
    }

    // 获取基本天气数据
    const response = await fetch(`${BASE_URL}/weather?q=${city},${country}&units=metric&appid=${API_KEY}&lang=zh_cn`, {
      next: { revalidate: 1800 }, // 30分钟缓存
    })

    if (!response.ok) {
      throw new Error(`OpenWeather API错误: ${response.status}`)
    }

    const data = await response.json()

    // 获取UV指数数据 (需要单独的API调用)
    let uvIndex = 0
    try {
      const uvResponse = await fetch(`${BASE_URL}/uvi?lat=${data.coord.lat}&lon=${data.coord.lon}&appid=${API_KEY}`, {
        next: { revalidate: 1800 }, // 30分钟缓存
      })

      if (uvResponse.ok) {
        const uvData = await uvResponse.json()
        uvIndex = uvData.value
      }
    } catch (error) {
      console.error("获取UV指数失败:", error)
    }

    // 计算降水量，如果存在
    const rainfall = data.rain ? data.rain["1h"] || 0 : 0

    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed * 3.6, // 转换m/s到km/h
      pressure: data.main.pressure,
      rainfall: rainfall,
      uvIndex: uvIndex,
      weatherId: data.weather[0].id,
      weatherDescription: data.weather[0].description,
    }
  } catch (error) {
    console.error("获取OpenWeather数据失败:", error)
    throw error
  }
}

// 获取未来7天的天气预报
export async function getWeeklyForecast(city = "hefei", country = "cn"): Promise<ForecastDay[]> {
  try {
    // 检查API密钥是否配置
    if (!API_KEY || API_KEY === "YOUR_API_KEY") {
      throw new Error("OpenWeather API密钥未配置")
    }

    // 获取城市坐标
    const geoResponse = await fetch(`${BASE_URL}/weather?q=${city},${country}&appid=${API_KEY}`, {
      next: { revalidate: 86400 }, // 24小时缓存
    })

    if (!geoResponse.ok) {
      throw new Error(`OpenWeather API错误: ${geoResponse.status}`)
    }

    const geoData = await geoResponse.json()
    const { lat, lon } = geoData.coord

    // 使用One Call API获取7天预报（需要付费订阅）
    // 如果没有付费订阅，可以使用5天/3小时预报API，然后按天聚合数据
    const forecastResponse = await fetch(
      `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}&lang=zh_cn`,
      {
        next: { revalidate: 10800 }, // 3小时缓存
      },
    )

    if (!forecastResponse.ok) {
      throw new Error(`OpenWeather API错误: ${forecastResponse.status}`)
    }

    const forecastData = await forecastResponse.json()

    // 按天聚合数据
    const dailyForecasts = processForecastData(forecastData)
    return dailyForecasts
  } catch (error) {
    console.error("获取每周天气预报失败:", error)
    throw error
  }
}

// 处理5天/3小时预报数据，按天聚合
function processForecastData(forecastData: any): ForecastDay[] {
  const dailyData: { [key: string]: any } = {}

  // 处理每个3小时预报
  forecastData.list.forEach((item: any) => {
    const date = new Date(item.dt * 1000)
    const dateStr = date.toISOString().split("T")[0]

    if (!dailyData[dateStr]) {
      dailyData[dateStr] = {
        temps: [],
        humidities: [],
        precipitations: [],
        weatherIds: {},
        winds: [],
        date: dateStr,
        day: getChineseDayOfWeek(date),
      }
    }

    // 收集温度
    dailyData[dateStr].temps.push(item.main.temp)

    // 收集湿度
    dailyData[dateStr].humidities.push(item.main.humidity)

    // 收集降水概率
    if (item.pop !== undefined) {
      dailyData[dateStr].precipitations.push(item.pop * 100)
    }

    // 收集天气ID和描述
    const weatherId = item.weather[0].id
    if (!dailyData[dateStr].weatherIds[weatherId]) {
      dailyData[dateStr].weatherIds[weatherId] = 0
    }
    dailyData[dateStr].weatherIds[weatherId]++

    // 收集风速和风向
    dailyData[dateStr].winds.push({
      speed: item.wind.speed,
      deg: item.wind.deg,
    })
  })

  // 处理收集的数据，计算每天的统计值
  const result: ForecastDay[] = Object.keys(dailyData).map((dateStr) => {
    const day = dailyData[dateStr]

    // 计算最高和最低温度
    const highTemp = Math.max(...day.temps)
    const lowTemp = Math.min(...day.temps)

    // 计算平均湿度
    const avgHumidity = day.humidities.reduce((sum: number, h: number) => sum + h, 0) / day.humidities.length

    // 计算最大降水概率
    const maxPrecipitation = day.precipitations.length > 0 ? Math.max(...day.precipitations) : 0

    // 确定最常见的天气ID
    let mostCommonWeatherId = 800 // 默认晴天
    let maxCount = 0
    Object.entries(day.weatherIds).forEach(([id, count]: [string, any]) => {
      if (count > maxCount) {
        mostCommonWeatherId = Number.parseInt(id)
        maxCount = count
      }
    })

    // 获取天气描述
    const weatherDescription = getWeatherDescription(mostCommonWeatherId)

    // 计算平均风速和风向
    const avgWindSpeed = day.winds.reduce((sum: number, w: any) => sum + w.speed, 0) / day.winds.length
    const avgWindDeg = day.winds.reduce((sum: number, w: any) => sum + w.deg, 0) / day.winds.length
    const windDirection = getWindDirection(avgWindDeg)

    return {
      date: dateStr,
      day: day.day,
      weather: weatherDescription,
      weatherId: mostCommonWeatherId,
      highTemp: Math.round(highTemp),
      lowTemp: Math.round(lowTemp),
      precipitation: `${Math.round(maxPrecipitation)}%`,
      humidity: `${Math.round(avgHumidity)}%`,
      wind: `${windDirection} ${Math.round(avgWindSpeed * 3.6)}km/h`, // 转换m/s到km/h
    }
  })

  return result
}

// 获取中文星期几
function getChineseDayOfWeek(date: Date): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return days[date.getDay()]
}

// 根据天气ID获取天气描述
function getWeatherDescription(weatherId: number): string {
  // 简化的天气ID映射
  if (weatherId >= 200 && weatherId < 300) return "雷雨"
  if (weatherId >= 300 && weatherId < 400) return "毛毛雨"
  if (weatherId >= 500 && weatherId < 600) {
    if (weatherId === 500) return "小雨"
    if (weatherId === 501) return "中雨"
    if (weatherId >= 502) return "大雨"
    return "雨"
  }
  if (weatherId >= 600 && weatherId < 700) return "雪"
  if (weatherId >= 700 && weatherId < 800) return "雾"
  if (weatherId === 800) return "晴"
  if (weatherId === 801) return "少云"
  if (weatherId === 802) return "多云"
  if (weatherId >= 803) return "阴"

  return "未知"
}

// 根据风向角度获取风向描述
function getWindDirection(degrees: number): string {
  const directions = ["北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风", "北风"]
  return directions[Math.round(degrees / 45) % 8]
}

// 生成模拟数据，当API密钥未配置或API访问失败时使用
export function generateMockWeatherData(city = "合肥"): OpenWeatherData {
  // 根据城市生成伪随机数据
  const hash = Array.from(city).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const random = (min: number, max: number) => min + ((hash % 100) / 100) * (max - min)
 // 获取当前时间以生成更真实的UV指数
 const now = new Date()
 const currentHour = now.getHours()

 // 根据时间计算UV指数
 let uvIndex = 0
 if (currentHour >= 6 && currentHour <= 18) {
   // 白天时间
   const midday = 12
   const hourFromMidday = Math.abs(currentHour - midday)
   // 正午UV最高，早晚较低
   uvIndex = 10 * (1 - hourFromMidday / 6) * random(0.8, 1.2)
   uvIndex = Math.max(0, Math.min(11, uvIndex))
 }
  return {
    temperature: random(15, 30),
    humidity: random(40, 80),
    windSpeed: random(5, 20),
    pressure: random(1000, 1020),
    rainfall: Math.random() > 0.7 ? random(0, 5) : 0,
    uvIndex: Math.round(uvIndex * 10) / 10,
    weatherId: [800, 801, 500, 600][Math.floor(random(0, 4))],
    weatherDescription: "模拟天气数据",
  }
}

// 生成模拟的每周天气预报
export function generateMockWeeklyForecast(): ForecastDay[] {
  const today = new Date()
  const forecast: ForecastDay[] = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const dateStr = date.toISOString().split("T")[0]
    const day = getChineseDayOfWeek(date)

    // 生成随机天气数据
    const weatherTypes = [
      { id: 800, desc: "晴" },
      { id: 801, desc: "多云" },
      { id: 803, desc: "阴" },
      { id: 500, desc: "小雨" },
      { id: 501, desc: "中雨" },
      { id: 600, desc: "小雪" },
    ]

    const weatherIndex = Math.floor(Math.random() * weatherTypes.length)
    const weather = weatherTypes[weatherIndex]

    // 基础温度，随着日期变化有小幅波动
    const baseTemp = 20 + Math.sin(i * 0.5) * 5
    const highTemp = Math.round(baseTemp + Math.random() * 5)
    const lowTemp = Math.round(baseTemp - Math.random() * 5)

    // 降水概率，与天气类型相关
    let precipitation = "0%"
    if (weather.id >= 500 && weather.id < 600) {
      precipitation = `${Math.round(50 + Math.random() * 50)}%`
    } else if (weather.id >= 600 && weather.id < 700) {
      precipitation = `${Math.round(40 + Math.random() * 40)}%`
    } else if (weather.id > 800) {
      precipitation = `${Math.round(Math.random() * 30)}%`
    }

    // 湿度，与天气类型相关
    let humidity = "60%"
    if (weather.id >= 500 && weather.id < 700) {
      humidity = `${Math.round(70 + Math.random() * 20)}%`
    } else if (weather.id === 800) {
      humidity = `${Math.round(40 + Math.random() * 20)}%`
    } else {
      humidity = `${Math.round(50 + Math.random() * 30)}%`
    }

    // 风向和风速
    const directions = ["东风", "南风", "西风", "北风", "东北风", "东南风", "西南风", "西北风"]
    const direction = directions[Math.floor(Math.random() * directions.length)]
    const windSpeed = Math.round(5 + Math.random() * 15)

    forecast.push({
      date: dateStr,
      day,
      weather: weather.desc,
      weatherId: weather.id,
      highTemp,
      lowTemp,
      precipitation,
      humidity,
      wind: `${direction} ${windSpeed}km/h`,
    })
  }

  return forecast
}