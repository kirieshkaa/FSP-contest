"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import type { ForecastRow } from "@/lib/types"
import { BarChart3, LineChartIcon, TrendingUp, Eye, EyeOff } from "lucide-react"

interface ForecastChartProps {
  scenarioData: ForecastRow[]
  periodMonths: number
  scenarioName: string
}

type ChartType = "line" | "bar" | "area"
type ChartSet = "herd" | "heifers"

type ChartSeries = {
  id: string
  key: string
  name: string
  color: string
}

const herdSeries: ChartSeries[] = [
  { id: "milkingDays", key: "avgMilkingDays", name: "Средние дни доения", color: "var(--chart-1)" },
  { id: "milkingHerd", key: "milkingHeadCount", name: "Дойное стадо", color: "var(--chart-2)" },
  { id: "allAdults", key: "allAdults", name: "Все взрослые", color: "var(--chart-3)" },
  { id: "milk", key: "milk", name: "Молоко", color: "var(--chart-4)" },
]

const heifersSeries: ChartSeries[] = [
  { id: "ownHeifers", key: "ownHeifers", name: "Собственные первотёлки", color: "var(--chart-1)" },
  { id: "purchasedHeifers", key: "purchasedHeifers", name: "Купленные нетели", color: "var(--chart-2)" },
]

export function ForecastChart({
  scenarioData,
  periodMonths,
  scenarioName,
}: ForecastChartProps) {
  const [chartType, setChartType] = useState<ChartType>("line")
  const [chartSet, setChartSet] = useState<ChartSet>("herd")
  
  const [visibleHerd, setVisibleHerd] = useState<Record<string, boolean>>({
    avgMilkingDays: true,
    milkingHeadCount: true,
    allAdults: true,
    milk: true,
  })
  
  const [visibleHeifers, setVisibleHeifers] = useState<Record<string, boolean>>({
    ownHeifers: true,
    purchasedHeifers: true,
  })

  const sliced = scenarioData.slice(0, periodMonths)

  const chartData = sliced.map((row, i) => ({
    month: row.month,
    avgMilkingDays: row.avgMilkingDays,
    milkingHeadCount: row.milkingHeadCount,
    allAdults: row.milkingHeadCount + row.dryHeadCount,
    milk: Math.round(row.milkingHeadCount * row.avgMilkingDays * 0.8),
    ownHeifers: row.ownHeifers,
    purchasedHeifers: row.purchasedHeifers,
  }))

  const toggleSeries = (key: string, set: ChartSet) => {
    if (set === "herd") {
      setVisibleHerd((prev) => ({ ...prev, [key]: !prev[key] }))
    } else {
      setVisibleHeifers((prev) => ({ ...prev, [key]: !prev[key] }))
    }
  }

  const getVisibleSeries = (set: ChartSet) => {
    if (set === "herd") {
      return herdSeries.filter((s) => visibleHerd[s.key])
    }
    return heifersSeries.filter((s) => visibleHeifers[s.key])
  }

  const chartTypes: { type: ChartType; icon: React.ReactNode; label: string }[] = [
    { type: "line", icon: <LineChartIcon className="size-4" />, label: "Линия" },
    { type: "bar", icon: <BarChart3 className="size-4" />, label: "Столбцы" },
    { type: "area", icon: <TrendingUp className="size-4" />, label: "Область" },
  ]

  const visibleSeriesList = getVisibleSeries(chartSet)

  const renderSeries = (s: ChartSeries) => {
    if (chartType === "bar") {
      return (
        <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[2, 2, 0, 0]} />
      )
    }
    if (chartType === "area") {
      return (
        <Area
          key={s.key}
          type="monotone"
          dataKey={s.key}
          name={s.name}
          stroke={s.color}
          fill={s.color}
          fillOpacity={0.2}
        />
      )
    }
    return (
      <Line
        key={s.key}
        type="monotone"
        dataKey={s.key}
        name={s.name}
        stroke={s.color}
        strokeWidth={2}
        dot={false}
      />
    )
  }

  const renderLegend = () => {
    const series = chartSet === "herd" ? herdSeries : heifersSeries
    const visible = chartSet === "herd" ? visibleHerd : visibleHeifers
    return (
      <div className="flex flex-wrap gap-2 justify-center pt-2 border-t">
        {series.map((s) => (
          <Button
            key={s.id}
            variant={visible[s.key] ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSeries(s.key, chartSet)}
            className={`h-7 px-2 text-xs gap-1.5 rounded-full ${visible[s.key] ? "border-2 shadow-sm" : "opacity-60"}`}
            style={visible[s.key] ? { 
              borderColor: s.color, 
              backgroundColor: `${s.color}20`,
              color: s.color 
            } : {}}
          >
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: visible[s.key] ? s.color : '#888' }}
            />
            {s.name}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base font-semibold">Динамика</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/50 dark:bg-muted/30 rounded-lg p-0.5 border">
              <Button
                variant={chartSet === "herd" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartSet("herd")}
                className={`h-7 px-3 text-xs rounded-md ${chartSet === "herd" ? "shadow-sm" : ""}`}
              >
                Стадо
              </Button>
              <Button
                variant={chartSet === "heifers" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartSet("heifers")}
                className={`h-7 px-3 text-xs rounded-md ${chartSet === "heifers" ? "shadow-sm" : ""}`}
              >
                Первотёлки
              </Button>
            </div>
            <div className="flex gap-0.5 border-l pl-2">
              {chartTypes.map(({ type, icon, label }) => (
                <Button
                  key={type}
                  variant={chartType === type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartType(type)}
                  className={`h-8 px-2 text-xs ${chartType === type ? "shadow-sm" : ""}`}
                  title={label}
                >
                  {icon}
                </Button>
              ))}
            </div>
          </div>
        </div>
        {renderLegend()}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={380}>
          {chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
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
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {visibleSeriesList.map(renderSeries)}
            </BarChart>
          ) : chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
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
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {visibleSeriesList.map(renderSeries)}
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
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
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {visibleSeriesList.map(renderSeries)}
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
