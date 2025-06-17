"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SunMedium } from "lucide-react"
import { useState, useEffect } from "react"

interface LightIntensityCardProps {
  value: number
}

export function LightIntensityCard({ value }: LightIntensityCardProps) {
  const [intensityLevel, setIntensityLevel] = useState<string>("")
  const [intensityColor, setIntensityColor] = useState<string>("")

  useEffect(() => {
    // 根据光强度值确定级别和颜色
    if (value < 50) {
      setIntensityLevel("非常暗")
      setIntensityColor("bg-gray-200")
    } else if (value < 200) {
      setIntensityLevel("暗")
      setIntensityColor("bg-gray-300")
    } else if (value < 400) {
      setIntensityLevel("室内照明")
      setIntensityColor("bg-yellow-100")
    } else if (value < 600) {
      setIntensityLevel("阴天")
      setIntensityColor("bg-yellow-200")
    } else if (value < 800) {
      setIntensityLevel("多云")
      setIntensityColor("bg-yellow-300")
    } else if (value < 1000) {
      setIntensityLevel("晴天")
      setIntensityColor("bg-yellow-400")
    } else {
      setIntensityLevel("强光")
      setIntensityColor("bg-yellow-500")
    }
  }, [value])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">光强度</CardTitle>
        <SunMedium className="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toFixed(0)} lux</div>
        <p className="text-xs text-muted-foreground">当前光照强度</p>
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span>暗</span>
            <span>{intensityLevel}</span>
            <span>强光</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${intensityColor} rounded-full`}
              style={{ width: `${Math.min(100, (value / 1200) * 100)}%` }}
            ></div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
