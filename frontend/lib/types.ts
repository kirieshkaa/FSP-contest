export interface Scenario {
  id: string
  name: string
  updatedAt: string
  color: string
  params: ScenarioParams
}

export interface ScenarioParams {
  baseDate: string
  exitRatePercent: number
  heifersPurchasePerMonth: number
  ownHeifersPercent: number
  forecastDate: string
  showBaseline: boolean
}

export interface ForecastRow {
  month: string
  avgMilkingDays: number
  milkingHeadCount: number
  dryHeadCount: number
}

export type PeriodKey = "1" | "12" | "36"
