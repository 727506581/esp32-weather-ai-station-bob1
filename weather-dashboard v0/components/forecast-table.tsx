import { useState, useEffect } from "react"
import { Cloud, CloudDrizzle, CloudRain, CloudSun, Sun, CloudSnow, CloudFog, Loader2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ForecastDay } from "@/lib/open-weather-service"

export function ForecastTable() {
  const [forecastData, setForecastData] = useState<ForecastDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(false)

  useEffect(() => {
    async function fetchForecast() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch("/api/forecast")

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Forecast data:", data)

        if (data.data && Array.isArray(data.data)) {
          setForecastData(data.data)
          setUsingMockData(data.source === "mock")
        } else {
          throw new Error("Invalid data format from API")
        }
      } catch (err) {
        console.error("Error fetching forecast:", err)
        setError(err instanceof Error ? err.message : "未知错误")
      } finally {
        setLoading(false)
      }
    }

    fetchForecast()
  }, [])

  // 根据天气ID获取对应的图标
  const getWeatherIcon = (weatherId: number) => {
    if (weatherId >= 200 && weatherId < 300) return <CloudRain className="h-5 w-5 text-blue-500" /> // 雷雨
    if (weatherId >= 300 && weatherId < 400) return <CloudDrizzle className="h-5 w-5 text-blue-300" /> // 毛毛雨
    if (weatherId >= 500 && weatherId < 600) {
      if (weatherId === 500) return <CloudDrizzle className="h-5 w-5 text-blue-400" /> // 小雨
      if (weatherId === 501) return <CloudRain className="h-5 w-5 text-blue-500" /> // 中雨
      return <CloudRain className="h-5 w-5 text-blue-600" /> // 大雨
    }
    if (weatherId >= 600 && weatherId < 700) return <CloudSnow className="h-5 w-5 text-blue-200" /> // 雪
    if (weatherId >= 700 && weatherId < 800) return <CloudFog className="h-5 w-5 text-gray-400" /> // 雾
    if (weatherId === 800) return <Sun className="h-5 w-5 text-amber-500" /> // 晴
    if (weatherId === 801) return <CloudSun className="h-5 w-5 text-amber-400" /> // 少云
    if (weatherId === 802) return <CloudSun className="h-5 w-5 text-amber-300" /> // 多云
    if (weatherId >= 803) return <Cloud className="h-5 w-5 text-gray-400" /> // 阴

    return <Cloud className="h-5 w-5 text-gray-400" /> // 默认
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">加载天气预报中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">加载天气预报失败</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    )
  }

  if (forecastData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">暂无天气预报数据</p>
      </div>
    )
  }

  return (
    <div>
      {usingMockData && (
        <div className="mb-4 p-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-sm">
          注意：当前显示的是模拟数据，请配置有效的OpenWeather API密钥以获取真实天气预报。
        </div>
      )}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日期</TableHead>
          <TableHead>天气</TableHead>
          <TableHead className="text-right">温度</TableHead>
          <TableHead className="text-right">降水概率</TableHead>
          <TableHead className="text-right">湿度</TableHead>
          <TableHead className="hidden md:table-cell text-right">风况</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {forecastData.map((day) => (
          <TableRow key={day.date}>
            <TableCell className="font-medium">
              <div>{day.day}</div>
              <div className="text-xs text-muted-foreground">{day.date}</div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
              {getWeatherIcon(day.weatherId)}
                <span>{day.weather}</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              {day.highTemp}°C / {day.lowTemp}°C
            </TableCell>
            <TableCell className="text-right">{day.precipitation}</TableCell>
            <TableCell className="text-right">{day.humidity}</TableCell>
            <TableCell className="hidden md:table-cell text-right">{day.wind}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  )
}
