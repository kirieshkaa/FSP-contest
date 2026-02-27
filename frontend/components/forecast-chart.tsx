"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { ForecastRow } from "@/lib/types"

interface ForecastChartProps {
  scenarioData: ForecastRow[]
  baselineData: ForecastRow[]
  showBaseline: boolean
  periodMonths: number
  scenarioName: string
}

export function ForecastChart({
  scenarioData,
  baselineData,
  showBaseline,
  periodMonths,
  scenarioName,
}: ForecastChartProps) {
  const sliced = scenarioData.slice(0, periodMonths)
  const baseSliced = baselineData.slice(0, periodMonths)

  const chartData = sliced.map((row, i) => ({
    month: row.month,
    scenario: row.avgMilkingDays,
    baseline: baseSliced[i]?.avgMilkingDays ?? 0,
  }))

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Динамика</CardTitle>
        <CardDescription className="text-xs">
          На 1-е число каждого месяца
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-2 pb-4 sm:px-6">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border"
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              interval={periodMonths <= 12 ? 0 : "equidistantPreserveStart"}
              angle={periodMonths > 12 ? -45 : 0}
              textAnchor={periodMonths > 12 ? "end" : "middle"}
              height={periodMonths > 12 ? 60 : 30}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="fill-muted-foreground"
              domain={["auto", "auto"]}
              width={40}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--card)",
                color: "var(--card-foreground)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            {showBaseline && (
              <Line
                type="monotone"
                dataKey="baseline"
                name="Базовый"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="scenario"
              name={scenarioName}
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
