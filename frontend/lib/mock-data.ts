import type { Scenario, ForecastRow } from "./types"

// Simple deterministic PRNG (mulberry32) to avoid hydration mismatches
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Format month index to "MM.YYYY" without locale-dependent APIs
function formatMonth(baseYear: number, baseMonth: number, offset: number): string {
  const totalMonth = baseMonth + offset
  const year = baseYear + Math.floor(totalMonth / 12)
  const month = (totalMonth % 12) + 1
  return `${String(month).padStart(2, "0")}.${year}`
}

// --- Generate 36 months of mock data ---
function generateForecastData(
  months: number,
  baseDays: number,
  trend: number,
  noise: number,
  seed: number
): ForecastRow[] {
  const rng = mulberry32(seed)
  const rows: ForecastRow[] = []
  for (let i = 0; i < months; i++) {
    const monthStr = formatMonth(2026, 1, i) // Feb 2026 = month index 1
    const val =
      baseDays + trend * i + (Math.sin(i * 0.7) * noise + rng() * noise * 0.3)
    const milking = 420 + Math.round(Math.sin(i * 0.4) * 30) - Math.round(trend * i * 0.8)
    const dry = 80 + Math.round(Math.cos(i * 0.5) * 15)
    rows.push({
      month: monthStr,
      avgMilkingDays: Math.round(val * 10) / 10,
      milkingHeadCount: Math.max(200, milking),
      dryHeadCount: Math.max(30, dry),
    })
  }
  return rows
}

export const baselineData: ForecastRow[] = generateForecastData(36, 145, 0.8, 8, 1001)

export const scenarioDatasets: Record<string, ForecastRow[]> = {
  "1": generateForecastData(36, 145, 0.8, 8, 2001),
  "2": generateForecastData(36, 145, 2.5, 12, 2002),
  "3": generateForecastData(36, 140, -0.5, 6, 2003),
}

export const defaultScenarios: Scenario[] = [
  {
    id: "1",
    name: "Базовый",
    updatedAt: "обновлено 2 мин назад",
    color: "bg-chart-1",
    params: {
      baseDate: "26.02.2026",
      exitRatePercent: 3,
      heifersPurchasePerMonth: 0,
      ownHeifersPercent: 15,
      forecastDate: "26.02.2029",
      showBaseline: true,
    },
  },
  {
    id: "2",
    name: "Агрессивное выбытие",
    updatedAt: "обновлено 15 мин назад",
    color: "bg-chart-2",
    params: {
      baseDate: "26.02.2026",
      exitRatePercent: 8,
      heifersPurchasePerMonth: 0,
      ownHeifersPercent: 10,
      forecastDate: "26.02.2029",
      showBaseline: true,
    },
  },
  {
    id: "3",
    name: "Покупка 20 нетелей/мес",
    updatedAt: "обновлено 1 час назад",
    color: "bg-chart-3",
    params: {
      baseDate: "26.02.2026",
      exitRatePercent: 3,
      heifersPurchasePerMonth: 20,
      ownHeifersPercent: 15,
      forecastDate: "26.02.2029",
      showBaseline: false,
    },
  },
]
