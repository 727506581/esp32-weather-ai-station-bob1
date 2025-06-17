import { NextResponse } from "next/server"
import { generateMockWeatherData } from "@/lib/open-weather-service"

// ThingSpeak配置
const CHANNEL_ID = process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID || "2912224"
const API_KEY = process.env.THINGSPEAK_API_KEY || "Y3VWEPU4D42G2UOX"

// OpenWeather配置
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "809b9823e5ffabcc27a2a7622ec9e876"
const DEFAULT_CITY = "hefei" // 默认城市

// 检查是否配置了ThingSpeak凭据
const isThingSpeakConfigured = CHANNEL_ID && API_KEY

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type") // 'latest' 或 'historical'
  const hours = searchParams.get("hours") || "24"
  const source = searchParams.get("source") || "thingspeak" // 'thingspeak' 或 'openweather'
  const city = searchParams.get("city") || DEFAULT_CITY

  console.log(`API Request: type=${type}, hours=${hours}, source=${source}, city=${city}`)
  console.log(`ThingSpeak config: CHANNEL_ID=${CHANNEL_ID}, API_KEY=${API_KEY ? "***" : "not set"}`)

  // 处理OpenWeather数据请求
  if (source === "openweather") {
    try {
      if (!OPENWEATHER_API_KEY) {
        // 如果API密钥未配置，返回模拟数据
        const mockData = generateMockWeatherData(city)
        return NextResponse.json({
          data: mockData,
          source: "mock",
          message: "使用模拟数据 - 请配置OpenWeather API密钥",
        })
      }

      const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city},cn&units=metric&appid=${OPENWEATHER_API_KEY}&lang=zh_cn`

      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/json",
        },
        next: { revalidate: 1800 }, // 30分钟缓存
      })

      if (!response.ok) {
        throw new Error(`OpenWeather API错误: ${response.status}`)
      }

      const weatherData = await response.json()

      // 获取UV指数数据
      let uvIndex = 0
      try {
        const uvResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/uvi?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${OPENWEATHER_API_KEY}`,
        )

        if (uvResponse.ok) {
          const uvData = await uvResponse.json()
          uvIndex = uvData.value
        }
      } catch (error) {
        console.error("获取UV指数失败:", error)
      }

      // 计算降水量，如果存在
      const rainfall = weatherData.rain ? weatherData.rain["1h"] || 0 : 0

      const processedData = {
        temperature: weatherData.main.temp,
        humidity: weatherData.main.humidity,
        windSpeed: weatherData.wind.speed * 3.6, // 转换m/s到km/h
        pressure: weatherData.main.pressure,
        rainfall: rainfall,
        uvIndex: uvIndex,
        weatherId: weatherData.weather[0].id,
        weatherDescription: weatherData.weather[0].description,
      }

      return NextResponse.json({
        data: processedData,
        source: "openweather",
      })
    } catch (error) {
      console.error("OpenWeather API错误:", error)

      // 返回模拟数据
      const mockData = generateMockWeatherData(city)
      return NextResponse.json({
        data: mockData,
        source: "mock",
        error: `OpenWeather API错误: ${error instanceof Error ? error.message : "未知错误"}`,
      })
    }
  }

  // 以下是ThingSpeak处理代码
  // 如果未配置ThingSpeak，直接返回演示数据标志
  if (!isThingSpeakConfigured) {
    console.log("ThingSpeak credentials not configured")
    return NextResponse.json(
      {
        error: "ThingSpeak credentials not configured",
        useDemoData: true,
      },
      { status: 503 },
    )
  }

  try {
    let url = ""

    if (type === "latest") {
      url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds/last.json?api_key=${API_KEY}`
    } else if (type === "historical") {
      // 获取指定小时数的数据，每10分钟一个数据点
      const results = Math.floor((Number.parseInt(hours) * 60) / 10)
      url = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${API_KEY}&results=${results}`
    } else {
      return NextResponse.json({ error: "Invalid request type" }, { status: 400 })
    }

    console.log(`Fetching ThingSpeak data from: ${url}`)

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      cache: "no-store", // 不缓存，每次都获取最新数据
    })

    // 检查响应状态
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`ThingSpeak API error (${response.status}): ${errorText}`)

      // 如果是404错误，可能是频道ID或API密钥不正确
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "ThingSpeak channel not found or API key invalid",
            useDemoData: true,
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          error: `ThingSpeak API responded with status: ${response.status}`,
          useDemoData: true,
        },
        { status: response.status },
      )
    }

    // 尝试解析JSON
    let data
    try {
      const text = await response.text()
      console.log("ThingSpeak response:", text.substring(0, 200) + "...")
      data = JSON.parse(text)
    } catch (parseError) {
      console.error("Failed to parse ThingSpeak response:", parseError)
      return NextResponse.json(
        {
          error: "Invalid response from ThingSpeak API",
          useDemoData: true,
        },
        { status: 500 },
      )
    }

    // 验证响应数据
    if (type === "historical" && (!data.feeds || !Array.isArray(data.feeds))) {
      console.error("Invalid historical data format:", data)
      return NextResponse.json(
        {
          error: "Invalid data format from ThingSpeak API",
          useDemoData: true,
        },
        { status: 500 },
      )
    }

    // 设置缓存控制头，允许客户端缓存10分钟
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=600", // 10分钟
      },
    })
  } catch (error) {
    console.error("Error fetching from ThingSpeak:", error)
    return NextResponse.json(
      {
        error: `Failed to fetch data: ${error instanceof Error ? error.message : "Unknown error"}`,
        useDemoData: true,
      },
      { status: 500 },
    )
  }
}
