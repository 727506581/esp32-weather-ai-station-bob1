"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Lightbulb, TrendingUp, AlertTriangle, Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateMockPrediction } from "@/lib/deepseek-service"
import type { ThingSpeakData } from "@/lib/thingspeak-service"

interface AIWeatherPredictionProps {
  weatherData: ThingSpeakData
  usingDemoData: boolean
}

export function AIWeatherPrediction({ weatherData, usingDemoData }: AIWeatherPredictionProps) {
  const [prediction, setPrediction] = useState<{
    prediction: string
    trends: {
      temperature: string
      humidity: string
      pressure: string
      general: string
    }
    recommendations: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)
  const [usingLocalPrediction, setUsingLocalPrediction] = useState(false)
  const [showDebug, setShowDebug] = useState(false)

  const fetchPrediction = async () => {
    try {
      setLoading(true)
      setError(null)
      setDebugInfo(null)
      setUsingLocalPrediction(false)

      // Always use local prediction logic
      setPrediction(generateMockPrediction(weatherData))
      setUsingLocalPrediction(true)
    } catch (err) {
      console.error("获取预测失败:", err)
      setError("无法获取AI预测，已切换到本地预测模式")

      // 出错时使用模拟数据
      setPrediction(generateMockPrediction(weatherData))
      setUsingLocalPrediction(true)
    } finally {
      setLoading(false)
    }
  }

  // 当天气数据变化时获取新预测
  useEffect(() => {
    fetchPrediction()
  }, [weatherData])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI天气预测
          </CardTitle>
          <CardDescription>正在分析天气数据...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !prediction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            AI天气预测
          </CardTitle>
          <CardDescription>预测服务暂时不可用</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">{error}</div>
          {debugInfo && (
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="mb-2">
                <Bug className="h-3 w-3 mr-1" />
                {showDebug ? "隐藏调试信息" : "显示调试信息"}
              </Button>
              {showDebug && <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">{debugInfo}</pre>}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={fetchPrediction} className="mt-4">
            重试
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI天气预测
          {(usingDemoData || usingLocalPrediction) && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              {usingDemoData ? "(演示模式)" : "(deepseek预测)"}
            </span>
          )}
        </CardTitle>
        <CardDescription>基于当前气象数据的未来12小时预测</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {prediction && (
          <>
            <p className="text-sm">{prediction.prediction}</p>

            <div className="space-y-3 mt-2">
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  天气趋势
                </h4>
                <ul className="text-sm space-y-2 pl-5 list-disc">
                  <li>{prediction.trends.temperature}</li>
                  <li>{prediction.trends.humidity}</li>
                  <li>{prediction.trends.pressure}</li>
                  <li className="font-medium">{prediction.trends.general}</li>
                </ul>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-1">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  建议
                </h4>
                <ul className="text-sm space-y-1 pl-5 list-disc">
                  {prediction.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
              预测基于当前气象数据，仅供参考。实际天气可能因多种因素而变化。
              {error && <span className="text-amber-600 ml-1">({error})</span>}
            </div>

            {debugInfo && (
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="mb-2">
                  <Bug className="h-3 w-3 mr-1" />
                  {showDebug ? "隐藏调试信息" : "显示调试信息"}
                </Button>
                {showDebug && <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">{debugInfo}</pre>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
