"use client"

import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"

interface WeatherChartProps {
  data: { time: string; value: number }[]
  dataKey: string
  name: string
  unit: string
  color: string
  type?: "line" | "bar"
  animate?: boolean
}

export function WeatherChart({ data, dataKey, name, unit, color, type = "line", animate = true }: WeatherChartProps) {
  const [chartData, setChartData] = useState(data || [])
  const [isAnimating, setIsAnimating] = useState(false)

  // 对chartData进行随机变化（仅用于演示效果）
  const animateData = () => {
    if (!animate || !data || data.length === 0) return

    setIsAnimating(true)

    // 创建微小的随机变化
    const newData = data.map((point) => {
      const randomVariation = (Math.random() - 0.5) * (point.value * 0.05) // 5%的随机变化
      return {
        ...point,
        value: Math.max(0, Number((point.value + randomVariation).toFixed(2))),
      }
    })

    setChartData(newData)
    setTimeout(() => setIsAnimating(false), 500)
  }

  // 每10秒更新一次数据以展示变化效果
  useEffect(() => {
    if (!animate) return

    const interval = setInterval(animateData, 10000)
    return () => clearInterval(interval)
  }, [data, animate])

  // 当传入的数据变化时更新
  useEffect(() => {
    if (data && data.length > 0) {
      console.log(`Updating chart data for ${name}:`, data)
      setChartData(data)
    } else {
      console.log(`No data for ${name} chart`)
    }
  }, [data, name])

  // 确保数据按时间排序
  const sortedData = [...(chartData || [])].sort((a, b) => {
    if (!a || !b) return 0
    const timeA = a.time?.split(":").map(Number) || [0, 0]
    const timeB = b.time?.split(":").map(Number) || [0, 0]
    return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1])
  })

  // 计算数据统计值
  const getStats = () => {
    if (!sortedData.length) return { avg: 0, min: 0, max: 0 }

    const values = sortedData.map((d) => d.value)
    return {
      avg: Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1)),
      min: Number(Math.min(...values).toFixed(1)),
      max: Number(Math.max(...values).toFixed(1)),
    }
  }

  const stats = getStats()

  // 如果没有数据，显示空状态
  if (!sortedData.length) {
    return <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground">暂无数据</div>
  }

  // 确保数据格式正确
  const validData = sortedData.filter((item) => item && typeof item.time === "string" && typeof item.value === "number")

  if (validData.length === 0) {
    return <div className="h-[200px] w-full flex items-center justify-center text-muted-foreground">数据格式不正确</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <div>
          <span>24小时平均: </span>
          <span className="font-medium">
            {stats.avg}
            {unit}
          </span>
        </div>
        <div>
          <span>最低: </span>
          <span className="font-medium">
            {stats.min}
            {unit}
          </span>
          <span className="mx-2">|</span>
          <span>最高: </span>
          <span className="font-medium">
            {stats.max}
            {unit}
          </span>
        </div>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={validData}>
            <defs>
              <linearGradient id={`color-${name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              // 只显示部分时间点，避免拥挤
              tickFormatter={(value, index) => {
                // 每3个点显示一个标签
                return index % 3 === 0 ? value : ""
              }}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}${unit}`}
              // 确保Y轴有合理的范围
              domain={type === "bar" ? [0, "auto"] : ["auto", "auto"]}
            />
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <Card className="border shadow-sm p-2 bg-white">
                      <div className="text-xs text-muted-foreground">{payload[0].payload.time}</div>
                      <div className="font-bold text-sm">
                        {payload[0].value} {unit}
                      </div>
                    </Card>
                  )
                }
                return null
              }}
            />
            {type === "line" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={name}
                  isAnimationActive={isAnimating}
                  animationDuration={500}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  fill={`url(#color-${name})`}
                  fillOpacity={0.3}
                  stroke="transparent"
                  isAnimationActive={isAnimating}
                  animationDuration={500}
                />
              </>
            ) : (
              <Bar
                dataKey="value"
                fill={color}
                radius={[4, 4, 0, 0]}
                name={name}
                isAnimationActive={isAnimating}
                animationDuration={500}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
