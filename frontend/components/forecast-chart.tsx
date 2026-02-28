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
import { BarChart3, LineChartIcon, TrendingUp } from "lucide-react"

interface ForecastChartProps {
  scenarioData: ForecastRow[]
  periodMonths: number
  scenarioName: string
}

type ChartType = "line" | "bar" | "area"
type ChartSet = "herd" | "heifers" | "milk"

type ChartSeries = {
  id: string
  key: string
  name: string
  color: string
}

const herdSeries: ChartSeries[] = [
  { id: "avg_dim", key: "avg_dim", name: "Средние дни доения", color: "#3b82f6" },
  { id: "cows_count", key: "cows_count", name: "Дойное стадо", color: "#10b981" },
  { id: "total_adults", key: "total_adults", name: "Все взрослые", color: "#f59e0b" },
]

const milkSeries: ChartSeries[] = [
  { id: "milk_total", key: "milk_total", name: "Молоко в месяц, ц", color: "#ef4444" },
]

const heifersSeries: ChartSeries[] = [
  { id: "first_calvings", key: "first_calvings", name: "Первотёлки", color: "#3b82f6" },
  { id: "purchased", key: "purchased", name: "Купленные", color: "#10b981" },
]

export function ForecastChart({
  scenarioData,
  periodMonths,
  scenarioName,
}: ForecastChartProps) {
  const [chartType, setChartType] = useState<ChartType>("line")
  const [chartSet, setChartSet] = useState<ChartSet>("herd")
  
  const [visibleHerd, setVisibleHerd] = useState<Record<string, boolean>>({
    avg_dim: true,
    cows_count: true,
    total_adults: true,
  })
  
  const [visibleHeifers, setVisibleHeifers] = useState<Record<string, boolean>>({
    first_calvings: true,
    purchased: true,
  })

  const [visibleMilk, setVisibleMilk] = useState<Record<string, boolean>>({
    milk_total: true,
  })

  const sliced = scenarioData.slice(0, periodMonths)

  const chartData = sliced.map((row) => ({
    month: row.month,
    avg_dim: row.avg_dim,
    cows_count: row.cows_count,
    total_adults: row.total_adults,
    milk_total: row.milk_total,
    first_calvings: row.first_calvings,
    purchased: row.purchased ?? 0,
  }))

  const toggleSeries = (key: string, set: ChartSet) => {
    if (set === "herd") {
      setVisibleHerd((prev) => ({ ...prev, [key]: !prev[key] }))
    } else if (set === "milk") {
      setVisibleMilk((prev) => ({ ...prev, [key]: !prev[key] }))
    } else {
      setVisibleHeifers((prev) => ({ ...prev, [key]: !prev[key] }))
    }
  }

  const getVisibleSeries = (set: ChartSet) => {
    if (set === "herd") {
      return herdSeries.filter((s) => visibleHerd[s.key])
    } else if (set === "milk") {
      return milkSeries.filter((s) => visibleMilk[s.key])
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

  const renderLegend = (set: ChartSet) => {
    const series = set === "herd" ? herdSeries : set === "milk" ? milkSeries : heifersSeries
    const visible = set === "herd" ? visibleHerd : set === "milk" ? visibleMilk : visibleHeifers
    return (
      <div className="flex flex-wrap gap-2 justify-center pt-2 border-t">
        {series.map((s) => (
          <Button
            key={s.id}
            variant={visible[s.key] ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSeries(s.key, set)}
            className={`h-7 px-2 text-xs gap-1.5 rounded-full cursor-pointer ${visible[s.key] ? "border-2 shadow-sm" : "opacity-60"}`}
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

  const renderChart = (set: ChartSet) => {
    const series = getVisibleSeries(set)
    const chartSetKey = set === "milk" ? "milk" : chartSet

    return (
      <>
        {renderLegend(set)}
        <ResponsiveContainer width="100%" height={set === "milk" ? 250 : 380}>
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
              {series.map(renderSeries)}
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
              {series.map(renderSeries)}
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
              {series.map(renderSeries)}
            </LineChart>
          )}
        </ResponsiveContainer>
      </>
    )
  }

  return (
    <div className="space-y-4">
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
                  className={`h-7 px-3 text-xs rounded-md cursor-pointer ${chartSet === "herd" ? "shadow-sm" : ""}`}
                >
                  Стадо
                </Button>
                <Button
                  variant={chartSet === "milk" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartSet("milk")}
                  className={`h-7 px-3 text-xs rounded-md cursor-pointer ${chartSet === "milk" ? "shadow-sm" : ""}`}
                >
                  Молоко
                </Button>
                <Button
                  variant={chartSet === "heifers" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartSet("heifers")}
                  className={`h-7 px-3 text-xs rounded-md cursor-pointer ${chartSet === "heifers" ? "shadow-sm" : ""}`}
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
                    className={`h-8 px-2 text-xs cursor-pointer ${chartType === type ? "shadow-sm" : ""}`}
                    title={label}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart(chartSet)}
        </CardContent>
      </Card>
    </div>
  )
}
