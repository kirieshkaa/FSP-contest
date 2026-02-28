"use client"

import { Card } from "@/components/ui/card"
import type { ForecastRow } from "@/lib/types"

interface CompactStatsProps {
  data: ForecastRow[]
  customDateValue?: number | null
}

export function CompactStats({ data, customDateValue }: CompactStatsProps) {
  const now = data[0]?.avg_dim ?? 0
  const in12 = data[Math.min(11, data.length - 1)]?.avg_dim ?? 0
  const in36 = data[Math.min(35, data.length - 1)]?.avg_dim ?? 0

  const stats = [
    { label: "Сейчас", value: now },
    { label: "Через 12 мес", value: in12 },
    { label: "Через 36 мес", value: in36 },
    { label: "На выбранную дату", value: customDateValue ?? in36 },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <Card
          key={s.label}
          className="flex flex-col gap-0.5 px-4 py-3"
        >
          <span className="text-[11px] font-medium text-muted-foreground">
            {s.label}
          </span>
          <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {s.value.toFixed(1)}
          </span>
          <span className="text-[10px] text-muted-foreground">дней</span>
        </Card>
      ))}
    </div>
  )
}
