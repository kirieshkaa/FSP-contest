"use client"

import { Card } from "@/components/ui/card"
import { Droplets, Gauge, TrendingUp, Scale, Baby, ArrowUpDown } from "lucide-react"
import type { ForecastRow } from "@/lib/types"

interface AnalyticsCardProps {
  data: ForecastRow[]
}

export function AnalyticsCard({ data }: AnalyticsCardProps) {
  const totalMonths = data.length
  const years = totalMonths / 12

  const totalMilk = data.reduce((sum, row) => sum + row.milk_total, 0)
  const avgMilkPerYear = years > 0 ? totalMilk / years : 0
  
  const avgHerdSize = data.reduce((sum, row) => sum + row.cows_count, 0) / totalMonths
  
  const peakMilk = Math.max(...data.map(row => row.milk_total))
  
  const totalFirstCalvings = data.reduce((sum, row) => sum + row.first_calvings, 0)
  
  const cumulativeExits = data.reduce((sum, row) => {
    const adults = row.total_adults - row.cows_count
    return sum + adults
  }, 0)
  const replacementBalance = totalFirstCalvings - cumulativeExits

  const stats = [
    {
      label: "Прогноз надоя (в год)",
      value: avgMilkPerYear,
      unit: "л",
      icon: Droplets,
      color: "text-blue-500",
    },
    {
      label: "Среднее поголовье",
      value: avgHerdSize,
      unit: "гол.",
      icon: Gauge,
      color: "text-green-500",
    },
    {
      label: "Пиковый надой",
      value: peakMilk,
      unit: "л/мес",
      icon: TrendingUp,
      color: "text-orange-500",
    },
    {
      label: "Всего первотёлок",
      value: totalFirstCalvings,
      unit: "гол.",
      icon: Baby,
      color: "text-purple-500",
    },
    {
      label: "Баланс ремонта",
      value: replacementBalance,
      unit: "гол.",
      icon: Scale,
      color: replacementBalance >= 0 ? "text-green-500" : "text-red-500",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {stats.map((s) => (
        <Card
          key={s.label}
          className="flex flex-col gap-1 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <s.icon className={`size-4 ${s.color}`} />
            <span className="text-[11px] font-medium text-muted-foreground">
              {s.label}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
              {s.unit === "гол." && !Number.isInteger(s.value) 
                ? s.value.toFixed(0)
                : s.value.toLocaleString("ru-RU", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-muted-foreground">{s.unit}</span>
          </div>
        </Card>
      ))}
    </div>
  )
}
