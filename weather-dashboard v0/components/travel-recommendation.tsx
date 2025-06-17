"use client"

import { useState, useEffect } from "react"
import { Umbrella, Sun, Wind, Thermometer } from "lucide-react"
import type { ThingSpeakData } from "@/lib/thingspeak-service"

interface TravelRecommendationProps {
  weatherData: ThingSpeakData
}

export function TravelRecommendation({ weatherData }: TravelRecommendationProps) {
  const [aiRecommendation, setAiRecommendation] = useState<{
    suitable: boolean
    icon: JSX.Element
    title: string
    description: string
    className: string
    items: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        setLoading(true)
        setError(null)

        // 调用AI预测API获取建议
        const response = await fetch("/api/travel-advice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(weatherData),
          // Add cache: 'no-store' to prevent caching issues
          cache: "no-store",
        })

        // Check if the response is ok before trying to parse JSON
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API error (${response.status}): ${errorText}`)
          throw new Error(`API responded with status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Travel advice API response:", data)

        // Validate the response data
        if (!data || typeof data !== "object") {
          throw new Error("Invalid response format from API")
        }

        // 根据AI返回的建议设置图标和样式
        let icon = <Sun className="h-4 w-4" />
        let className = "bg-green-50 border-green-100 text-green-700"

        if (data.suitable === false) {
          if (data.reason === "rain") {
            icon = <Umbrella className="h-4 w-4" />
            className = "bg-blue-50 border-blue-100 text-blue-700"
          } else if (data.reason === "wind") {
            icon = <Wind className="h-4 w-4" />
            className = "bg-amber-50 border-amber-100 text-amber-700"
          } else if (data.reason === "temperature") {
            icon = <Thermometer className="h-4 w-4" />
            className = "bg-orange-50 border-orange-100 text-orange-700"
          }
        }

        setAiRecommendation({
          suitable: data.suitable,
          icon,
          title: data.title || "天气建议",
          description: data.description || "",
          className,
          items: data.items || [],
        })
      } catch (error) {
        console.error("获取AI出行建议失败:", error)
        setError(error instanceof Error ? error.message : "未知错误")

        // 回退到本地逻辑
        const recommendation = getLocalRecommendation()
        setAiRecommendation(recommendation)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendation()
  }, [weatherData])

  // 本地逻辑作为备选
  const getLocalRecommendation = () => {
    const { temperature, rainfall, windSpeed, uvIndex } = weatherData

    // 判断天气状况
    const isRainy = rainfall > 0.5
    const isWindy = windSpeed > 20
    const isHot = temperature > 30
    const isCold = temperature < 10
    const isHighUV = uvIndex > 5

    // 生成主要建议
    if (isRainy) {
      return {
        suitable: false,
        icon: <Umbrella className="h-4 w-4" />,
        title: "今日不宜外出",
        description: "有降雨，建议减少不必要的外出。外出时请携带雨具，穿着防水鞋。",
        className: "bg-blue-50 border-blue-100 text-blue-700",
        items: ["建议携带雨具", "穿着防水鞋", "减少户外活动时间"],
      }
    } else if (isWindy) {
      return {
        suitable: false,
        icon: <Wind className="h-4 w-4" />,
        title: "今日不宜外出",
        description: "风力较大，外出时注意防风，避免在树下、广告牌下等危险区域停留。",
        className: "bg-amber-50 border-amber-100 text-amber-700",
        items: ["注意防风", "避免在危险区域停留", "固定易被风吹走的物品"],
      }
    } else if (isHot) {
      return {
        suitable: true,
        icon: <Sun className="h-4 w-4" />,
        title: "今日需注意防暑",
        description: "气温较高，外出请做好防暑措施，多补充水分，避免长时间在烈日下活动。",
        className: "bg-orange-50 border-orange-100 text-orange-700",
        items: ["多补充水分", "穿着轻薄透气的衣物", "避免长时间在烈日下活动"],
      }
    } else if (isCold) {
      return {
        suitable: true,
        icon: <Thermometer className="h-4 w-4" />,
        title: "今日需注意保暖",
        description: "气温较低，外出请穿着保暖衣物，避免受凉感冒。",
        className: "bg-cyan-50 border-cyan-100 text-cyan-700",
        items: ["穿着保暖衣物", "避免长时间在户外停留", "注意保暖防寒"],
      }
    } else {
      return {
        suitable: true,
        icon: <Sun className="h-4 w-4" />,
        title: "今日适合外出",
        description: "天气良好，温度适宜，是进行户外活动的好时机。",
        className: "bg-green-50 border-green-100 text-green-700",
        items: ["适合户外活动", "穿着舒适的衣物", "享受良好天气"],
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-100 h-16 rounded-lg"></div>
        <div className="space-y-2">
          <div className="animate-pulse bg-gray-100 h-4 rounded w-3/4"></div>
          <div className="animate-pulse bg-gray-100 h-4 rounded"></div>
          <div className="animate-pulse bg-gray-100 h-4 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  // If there was an error but we're using local recommendation, show a small error indicator
  const showErrorIndicator = error && aiRecommendation

  const recommendation = aiRecommendation || getLocalRecommendation()

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-3 border ${recommendation.className}`}>
        <div className="flex items-center gap-2 font-medium mb-1">
          {recommendation.icon}
          <span>{recommendation.title}</span>
          {showErrorIndicator && <span className="text-xs text-amber-600 ml-auto">(使用本地数据)</span>}
        </div>
        <p className="text-sm">{recommendation.description}</p>
      </div>

      <div className="text-sm space-y-2">
        {recommendation.items.map((item, index) => {
          let iconComponent
          if (index === 0) {
            iconComponent = <Umbrella className="h-4 w-4 text-blue-500" />
          } else if (index === 1) {
            iconComponent = <Thermometer className="h-4 w-4 text-rose-500" />
          } else if (index === 2) {
            iconComponent = <Wind className="h-4 w-4 text-emerald-500" />
          } else {
            iconComponent = <Sun className="h-4 w-4 text-amber-500" />
          }

          return (
            <div key={index} className="flex items-center gap-2">
              {iconComponent}
              <span>{item}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
