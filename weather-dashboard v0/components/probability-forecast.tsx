"use client"

import { useState, useEffect } from "react"
import { Progress } from "@/components/ui/progress"
import type { ThingSpeakData } from "@/lib/thingspeak-service"

interface ProbabilityForecastProps {
  weatherData: ThingSpeakData
}

export function ProbabilityForecast({ weatherData }: ProbabilityForecastProps) {
  const [aiProbabilities, setAiProbabilities] = useState<{
    probabilities: { type: string; probability: number }[]
    forecastText: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProbabilities = async () => {
      try {
        setLoading(true)
        setError(null)

        // 调用AI预测API获取概率预测
        const response = await fetch("/api/weather-probability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(weatherData),
          cache: "no-store",
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API error (${response.status}): ${errorText}`)
          throw new Error(`API responded with status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Weather probability API response:", data)

        // Validate the response data
        if (!data || !data.probabilities || !Array.isArray(data.probabilities)) {
          throw new Error("Invalid response format from API")
        }

        setAiProbabilities(data)
      } catch (error) {
        console.error("获取AI天气概率预测失败:", error)
        setError(error instanceof Error ? error.message : "未知错误")

        // 回退到本地逻辑
        const localProbabilities = calculateLocalProbabilities()
        setAiProbabilities(localProbabilities)
      } finally {
        setLoading(false)
      }
    }

    fetchProbabilities()
  }, [weatherData])

  // 本地逻辑作为备选
  const calculateLocalProbabilities = () => {
    const { temperature, humidity, rainfall, windSpeed } = weatherData

    // 这里使用简化的逻辑来计算概率，实际应用中可能需要更复杂的气象模型

    // 晴天概率 - 降雨量低且湿度低时概率高
    const sunnyProb = Math.max(0, Math.min(100, 100 - rainfall * 50 - (humidity - 40)))

    // 多云概率 - 中等湿度且无雨时概率高
    const cloudyProb = Math.max(0, Math.min(100, humidity > 60 ? 60 + (humidity - 60) * 1.5 : 30 + humidity / 2))

    // 降雨概率 - 基于当前降雨量和湿度
    const rainProb = Math.max(
      0,
      Math.min(100, rainfall > 0 ? 50 + rainfall * 20 : humidity > 80 ? (humidity - 80) * 5 : 0),
    )

    // 大风概率 - 基于当前风速
    const windyProb = Math.max(0, Math.min(100, windSpeed > 10 ? (windSpeed - 10) * 5 : 0))

    const probabilities = [
      { type: "晴天", probability: Math.round(sunnyProb) },
      { type: "多云", probability: Math.round(cloudyProb) },
      { type: "降雨", probability: Math.round(rainProb) },
      { type: "大风", probability: Math.round(windyProb) },
    ]

    // 生成专业预测文本
    let forecast = "专业预测："

    // 主要天气状况
    const highestProb = [...probabilities].sort((a, b) => b.probability - a.probability)[0]
    forecast += `今日天气以${highestProb.type}为主，`

    // 温度描述
    if (temperature > 30) {
      forecast += "气温较高，注意防暑，"
    } else if (temperature < 10) {
      forecast += "气温较低，注意保暖，"
    } else {
      forecast += "气温适宜，"
    }

    // 降雨描述
    if (rainfall > 0 || probabilities.find((p) => p.type === "降雨")?.probability! > 50) {
      forecast += "有降雨可能，建议携带雨具。"
    } else {
      forecast += "降雨概率低。"
    }

    // 风力描述
    if (windSpeed > 20) {
      forecast += "风力较大，注意防风。"
    } else if (windSpeed > 10) {
      forecast += "有轻微风力。"
    } else {
      forecast += "风力较小。"
    }

    return { probabilities, forecastText: forecast }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="animate-pulse bg-gray-100 h-6 rounde d w-full"></div>
          <div className="animate-pulse bg-gray-100 h-2 rounded w-full"></div>
        </div>
        <div className="space-y-2">
          <div className="animate-pulse bg-gray-100 h-6 rounded w-full"></div>
          <div className="animate-pulse bg-gray-100 h-2 rounded w-full"></div>
        </div>
        <div className="space-y-2">
          <div className="animate-pulse bg-gray-100 h-6 rounded w-full"></div>
          <div className="animate-pulse bg-gray-100 h-2 rounded w-full"></div>
        </div>
        <div className="animate-pulse bg-gray-100 h-16 rounded w-full mt-4"></div>
      </div>
    )
  }

  const probabilityData = aiProbabilities?.probabilities || calculateLocalProbabilities().probabilities
  const forecastText = aiProbabilities?.forecastText || calculateLocalProbabilities().forecastText

  // If there was an error but we're using local data, show a small error indicator
  const showErrorIndicator = error && aiProbabilities

  return (
    <div className="space-y-4">
      {probabilityData.map((item) => (
        <div key={item.type} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{item.type}</span>
            <span className="font-medium">{item.probability}%</span>
          </div>
          <Progress value={item.probability} className="h-2" />
        </div>
      ))}

      <div className="pt-2 text-sm text-muted-foreground">
        <p>
          {forecastText}
          {showErrorIndicator && <span className="text-xs text-amber-600 ml-1">(使用本地数据)</span>}
        </p>
      </div>
    </div>
  )
}
