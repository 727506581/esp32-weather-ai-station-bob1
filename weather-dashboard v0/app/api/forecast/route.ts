import { NextResponse } from "next/server"
import { getWeeklyForecast, generateMockWeeklyForecast } from "@/lib/open-weather-service"

// OpenWeather配置
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "809b9823e5ffabcc27a2a7622ec9e876"
const DEFAULT_CITY = "hefei" // 默认城市为合肥

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get("city") || DEFAULT_CITY
  const country = searchParams.get("country") || "cn"

  console.log(`Forecast API Request: city=${city}, country=${country}`)

  try {
    if (!OPENWEATHER_API_KEY) {
      // 如果API密钥未配置，返回模拟数据
      const mockData = generateMockWeeklyForecast()
      return NextResponse.json({
        data: mockData,
        source: "mock",
        message: "使用模拟数据 - 请配置OpenWeather API密钥",
      })
    }

    // 获取每周天气预报
    const forecastData = await getWeeklyForecast(city, country)

    return NextResponse.json({
      data: forecastData,
      source: "openweather",
    })
  } catch (error) {
    console.error("获取每周天气预报失败:", error)

    // 返回模拟数据
    const mockData = generateMockWeeklyForecast()
    return NextResponse.json({
      data: mockData,
      source: "mock",
      error: `OpenWeather API错误: ${error instanceof Error ? error.message : "未知错误"}`,
    })
  }
}
