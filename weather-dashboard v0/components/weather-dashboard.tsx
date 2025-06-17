"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  CloudRain,
  Droplets,
  Thermometer,
  Wind,
  Sun,
  Umbrella,
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  Gauge,
  Brain,
  MapPin,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeatherChart } from "@/components/weather-chart"
import { ForecastTable } from "@/components/forecast-table"
import { WeatherMetricCard } from "@/components/weather-metric-card"
import { TravelRecommendation } from "@/components/travel-recommendation"
import { ProbabilityForecast } from "@/components/probability-forecast"
import { AIWeatherPrediction } from "@/components/ai-weather-prediction"
// Ensure the correct path to the LightIntensityCard component
import { LightIntensityCard } from "@/components/light-intensity-card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  getLatestWeatherData,
  getHistoricalWeatherData,
  convertToChartData,
  generateDemoData,
  type ThingSpeakData,
} from "@/lib/thingspeak-service"

// 刷新间隔（毫秒）- 10分钟
const REFRESH_INTERVAL = 10 * 60 * 1000

export default function WeatherDashboard() {
  const [activeTab, setActiveTab] = useState("today")
  const [currentWeather, setCurrentWeather] = useState<ThingSpeakData>({
    temperature: 0,
    humidity: 0,
    windSpeed: 0,
    pressure: 0,
    rainfall: 0,
    uvIndex: 0,
    lightIntensity: 0,
  })

  const [temperatureData, setTemperatureData] = useState<{ time: string; value: number }[]>([])
  const [humidityData, setHumidityData] = useState<{ time: string; value: number }[]>([])
  const [rainfallData, setRainfallData] = useState<{ time: string; value: number }[]>([])
  const [windData, setWindData] = useState<{ time: string; value: number }[]>([])
  const [pressureData, setPressureData] = useState<{ time: string; value: number }[]>([])
  const [uvIndexData, setUvIndexData] = useState<{ time: string; value: number }[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null)
  const [usingDemoData, setUsingDemoData] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  const [configError, setConfigError] = useState<string | null>(null)
  const [useOpenWeather, setUseOpenWeather] = useState(false)

  const now = useRef(new Date())
  const [currentTime, setCurrentTime] = useState(now.current)
  const [city, setCity] = useState("合肥")

  // Function to add random variation to data (moved outside fetchData and useEffect)
  const addVariation = useCallback((data: { time: string; value: number }[]) => {
    return data.map((point) => {
      const variation = (Math.random() - 0.5) * (point.value * 0.02) // 2%的随机变化
      return {
        ...point,
        value: Math.max(0, Number((point.value + variation).toFixed(1))),
      }
    })
  }, [])

  // 使用 useCallback 确保 useDemoData 函数的引用稳定
  const useDemoData = useCallback(() => {
    const demoData = generateDemoData()
    setCurrentWeather(demoData.currentWeather)
    setTemperatureData(demoData.temperatureData)
    setHumidityData(demoData.humidityData)
    setRainfallData(demoData.rainfallData)
    setWindData(demoData.windData)
    setPressureData(demoData.pressureData)
    setUvIndexData(demoData.uvIndexData)
    setError(null)
    setLoading(false)

    now.current = new Date()
    setCurrentTime(now.current)
    setLastUpdated(now.current)

    // 设置下次更新时间
    const next = new Date(now.current.getTime() + REFRESH_INTERVAL)
    setNextUpdate(next)

    // 重置刷新进度
    setRefreshProgress(0)
    setUsingDemoData(true)
  }, [])

  // 使用 useCallback 确保 fetchData 函数的引用稳定
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      let latestData: ThingSpeakData | null = null

      // 如果已知配置错误，直接使用演示数据
      if (configError) {
        useDemoData()
        return
      }

      // 获取最新的天气数据
      
      latestData = await getLatestWeatherData()
      setCurrentWeather(latestData)

      // 获取历史数据用于图表
      const historicalData = await getHistoricalWeatherData(24)

      // 转换数据为图表格式
      setTemperatureData(convertToChartData(historicalData, 1)) // 假设field1是温度
      setHumidityData(convertToChartData(historicalData, 2)) // 假设field2是湿度

      // 如果从ThingSpeak获取的数据不完整，可能需要使用演示数据补充
      const demoData = generateDemoData()

      // 检查并填充缺失的数据
      const hasRainfallData = historicalData.some((item) => item.field5 !== null && item.field5 !== undefined)
      const hasWindData = historicalData.some((item) => item.field3 !== null && item.field3 !== undefined)
      const hasPressureData = historicalData.some((item) => item.field4 !== null && item. field4 !== undefined)
      const hasUVData = historicalData.some((item) => item.field6 !== null && item.field6 !== undefined)

      if (hasRainfallData) {
        setRainfallData(convertToChartData(historicalData, 5)) // 假设field5是降雨量
      } else {
        setRainfallData(demoData.rainfallData)
      }

      if (hasWindData) {
        setWindData(convertToChartData(historicalData, 3)) // 假设field3是风速
      } else {
        setWindData(demoData.windData)
      }

      if (hasPressureData) {
        setPressureData(convertToChartData(historicalData, 4)) // 假设field4是气压
      } else {
        setPressureData(demoData.pressureData)
      }

      if (hasUVData) {
        setUvIndexData(convertToChartData(historicalData, 6)) // 假设field6是紫外线指数
      } else {
        setUvIndexData(demoData.uvIndexData)
      }

      now.current = new Date()
      setCurrentTime(now.current)
      setLastUpdated(now.current)

      // 设置下次更新时间
      const next = new Date(now.current.getTime() + REFRESH_INTERVAL)
      setNextUpdate(next)

      // 重置刷新进度
      setRefreshProgress(0)
      setUsingDemoData(false)
    } catch (err) {
      console.error("Error fetching weather data:", err)

      // 检查是否是配置错误
      const errorMessage = err instanceof Error ? err.message : "未知错误"
      if (
        errorMessage.includes("API suggests using demo data") ||
        errorMessage.includes("ThingSpeak credentials") ||
        errorMessage.includes("channel not found") ||
        errorMessage.includes("API key invalid")
      ) {
        setConfigError("ThingSpeak配置错误，已切换到演示模式")
        useDemoData()
      } else {
        setError(`获取天气数据失败: ${errorMessage}`)
        // 不自动切换到演示模式，让用户决定
      }
    } finally {
      setLoading(false)
    }
  }, [configError, useDemoData])

  const [demoDataIntervalId, setDemoDataIntervalId] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 初始加载时尝试获取数据，如果失败则使用演示数据
    fetchData().catch(() => {
      useDemoData()
    })

    // 设置定时刷新，每10分钟更新一次数据
    const intervalId = setInterval(() => {
      fetchData().catch(console.error) // 忽略定时刷新中的错误
    }, REFRESH_INTERVAL)

    // 设置随机数据变化的定时器（仅在演示模式下使用）
    if (usingDemoData) {
      const interval = setInterval(() => {
        // 添加随机微小变化以模拟数据更新
        setTemperatureData((prev) => addVariation(prev))
        setHumidityData((prev) => addVariation(prev))
        setRainfallData((prev) => addVariation(prev))
        setWindData((prev) => addVariation(prev))
        setPressureData((prev) => addVariation(prev))
        setUvIndexData((prev) => addVariation(prev))
      }, 30000)
      setDemoDataIntervalId(interval)
    }

    return () => {
      clearInterval(intervalId)
      if (demoDataIntervalId) {
        clearInterval(demoDataIntervalId)
      }
    }
  }, [fetchData, useDemoData, usingDemoData, addVariation, demoDataIntervalId])

  useEffect(() => {
    if (usingDemoData && demoDataIntervalId === null) {
      const interval = setInterval(() => {
        // 添加随机微小变化以模拟数据更新
        setTemperatureData((prev) => addVariation(prev))
        setHumidityData((prev) => addVariation(prev))
        setRainfallData((prev) => addVariation(prev))
        setWindData((prev) => addVariation(prev))
        setPressureData((prev) => addVariation(prev))
        setUvIndexData((prev) => addVariation(prev))
      }, 30000)
      setDemoDataIntervalId(interval)
    } else if (!usingDemoData && demoDataIntervalId !== null) {
      clearInterval(demoDataIntervalId)
      setDemoDataIntervalId(null)
    }
  }, [usingDemoData, addVariation, demoDataIntervalId])

  // 更新刷新进度条
  useEffect(() => {
    if (!lastUpdated || !nextUpdate) return

    const updateProgress = () => {
      const nowTime = new Date().getTime()
      const start = lastUpdated.getTime()
      const end = nextUpdate.getTime()
      const elapsed = nowTime - start
      const total = end - start
      const progress = Math.min(100, Math.max(0, (elapsed / total) * 100))
      setRefreshProgress(progress)
    }

    // 立即更新一次
    updateProgress()

    // 每秒更新进度
    const progressInterval = setInterval(updateProgress, 1000)
    return () => clearInterval(progressInterval)
  }, [lastUpdated, nextUpdate])

  // 确定温度趋势
  const getTemperatureTrend = () => {
    if (temperatureData.length < 2) return "无变化"
    const lastTwo = temperatureData.slice(-2)
    if (lastTwo[1].value > lastTwo[0].value) return "上升"
    if (lastTwo[1].value < lastTwo[0].value) return "下降"
    return "稳定"
  }

  // 确定湿度趋势
  const getHumidityTrend = () => {
    if (humidityData.length < 2) return "无变化"
    const lastTwo = humidityData.slice(-2)
    if (lastTwo[1].value > lastTwo[0].value) return "上升"
    if (lastTwo[1].value < lastTwo[0].value) return "下降"
    return "稳定"
  }

  // 确定风速趋势
  const getWindTrend = () => {
    if (windData.length < 2) return "无变化"
    const lastTwo = windData.slice(-2)
    if (lastTwo[1].value > lastTwo[0].value) return "上升"
    if (lastTwo[1].value < lastTwo[0].value) return "下降"
    return "稳定"
  }

  // 格式化剩余时间
  const formatTimeRemaining = () => {
    if (!nextUpdate) return ""

    const nowTime = new Date()
    const diff = Math.max(0, nextUpdate.getTime() - nowTime.getTime()) / 1000 // 秒

    const minutes = Math.floor(diff / 60)
    const seconds = Math.floor(diff % 60)

    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">天气站数据</h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-muted-foreground">
            <p className="flex items-center gap-2">
              {usingDemoData ? (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  演示数据
                </span>
              ) : (
                "实时天气数据和预测分析"
              )}
              {lastUpdated && <span className="text-xs">最后更新: {lastUpdated.toLocaleTimeString()}</span>}
            </p>
            {nextUpdate && (
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span>下次更新: {formatTimeRemaining()}</span>
                <Progress value={refreshProgress} className="h-1 w-20" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData()}
              disabled={loading || !!configError}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              刷新数据
            </Button>
            {(error || !usingDemoData) && (
              <Button variant={usingDemoData ? "default" : "outline"} size="sm" onClick={useDemoData}>
                使用演示数据
              </Button>
            )}
          </div>
        </div>
      </div>

      {configError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-md">
          <p className="font-medium">ThingSpeak配置错误</p>
          <p className="text-sm mt-1">{configError}</p>
          <p className="text-sm mt-2">
            请在<code className="bg-amber-100 px-1 py-0.5 rounded">app/api/weather/route.ts</code>
            文件中配置正确的ThingSpeak频道ID和API密钥。
          </p>
        </div>
      )}

      {error && !configError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <p className="font-medium">数据获取失败</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2">请检查网络连接和API配置，或点击"使用演示数据"按钮查看演示效果。</p>
        </div>
      )}

      <Tabs defaultValue="today" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="today">今日</TabsTrigger>
          <TabsTrigger value="week">本周</TabsTrigger>
          <TabsTrigger value="ai">AI预测</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {loading && !error && !configError ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">加载数据中...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <WeatherMetricCard
                  title="温度"
                  value={`${currentWeather.temperature.toFixed(1)}°C`}
                  description="当前气温"
                  icon={<Thermometer className="h-4 w-4 text-rose-500" />}
                  trend={getTemperatureTrend()}
                />
                <WeatherMetricCard
                  title="湿度"
                  value={`${currentWeather.humidity.toFixed(0)}%`}
                  description="相对湿度"
                  icon={<Droplets className="h-4 w-4 text-blue-500" />}
                  trend={getHumidityTrend()}
                />
                 <LightIntensityCard value={currentWeather.lightIntensity} />
                <WeatherMetricCard
                  title="风速"
                  value={`${currentWeather.windSpeed.toFixed(1)} km/h`}
                  description="当前风速 (OpenWeather)"
                  icon={<Wind className="h-4 w-4 text-emerald-500" />}
                  trend={getWindTrend()}
                />
                <WeatherMetricCard
                  title="气压"
                  value={`${currentWeather.pressure.toFixed(0)} hPa`}
                  description="大气压力"
                  icon={<Gauge className="h-4 w-4 text-sky-500" />}
                  trend="稳定"
                />  
                <WeatherMetricCard
                  title="紫外线指数"
                  value={currentWeather.uvIndex.toFixed(0)}
                  description={
                    currentWeather.uvIndex <= 2
                      ? "弱 (OpenWeather)"
                      : currentWeather.uvIndex <= 5
                        ? "中等 (OpenWeather)"
                        : "强 (OpenWeather)"
                  }
                  icon={<Sun className="h-4 w-4 text-amber-500" />}
                  trend="无变化"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="col-span-3 md:col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">出行建议</CardTitle>
                    <Umbrella className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <TravelRecommendation weatherData={currentWeather} />
                  </CardContent>
                </Card>
                <Card className="col-span-3 md:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">天气概率预测</CardTitle>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <ProbabilityForecast weatherData={currentWeather} />
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>本周天气预报</CardTitle>
              <CardDescription>
                未来7天天气预测
                {activeTab === "week" && (
                  <span className="text-xs text-muted-foreground ml-2">(数据来源: OpenWeather)</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ForecastTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="col-span-2 md:col-span-1">
              <AIWeatherPrediction weatherData={currentWeather} usingDemoData={usingDemoData} />
            </div>
            <div className="col-span-2 md:col-span-1 grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    关于AI预测
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2">
                    <p>
                      AI预测功能使用DeepSeek大语言模型，基于当前气象数据分析未来12小时的天气趋势和变化。预测结果包括温度、湿度、气压等关键指标的变化趋势，以及相应的出行和生活建议。
                    </p>
                    <p>
                      预测结果仅供参考，实际天气可能受多种因素影响而变化。建议结合官方气象部门发布的天气预报一起参考。
                    </p>
                    <div className="text-xs text-muted-foreground mt-4 pt-2 border-t">
                      数据来源：ThingSpeak气象站 + DeepSeek AI
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>当前气象数据</CardTitle>
                  <CardDescription>AI预测的基础数据</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">温度:</span>
                      <span className="font-medium">{currentWeather.temperature.toFixed(1)}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">湿度:</span>
                      <span className="font-medium">{currentWeather.humidity.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">光强度:</span>
                      <span className="font-medium">{currentWeather.lightIntensity.toFixed(0)} lux</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">气压:</span>
                      <span className="font-medium">{currentWeather.pressure.toFixed(0)} hPa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">风速:</span>
                      <span className="font-medium">{currentWeather.windSpeed.toFixed(1)} km/h</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">紫外线指数:</span>
                      <span className="font-medium">{currentWeather.uvIndex.toFixed(0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
