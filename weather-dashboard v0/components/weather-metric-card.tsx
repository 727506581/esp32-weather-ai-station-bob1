import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react"

interface WeatherMetricCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  trend: "上升" | "下降" | "稳定" | "无变化"
}

export function WeatherMetricCard({ title, value, description, icon, trend }: WeatherMetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="mt-2 flex items-center text-xs">
          {trend === "上升" && <ArrowUp className="mr-1 h-3 w-3 text-rose-500" />}
          {trend === "下降" && <ArrowDown className="mr-1 h-3 w-3 text-emerald-500" />}
          {trend === "稳定" && <ArrowRight className="mr-1 h-3 w-3 text-amber-500" />}
          <span
            className={
              trend === "上升"
                ? "text-rose-500"
                : trend === "下降"
                  ? "text-emerald-500"
                  : trend === "稳定"
                    ? "text-amber-500"
                    : "text-muted-foreground"
            }
          >
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
