export interface Scenario {
  id: string
  name: string
  updatedAt: string
  color: string
  params: ScenarioParams
  files: ScenarioFile[]
  activeFileId: string | null
}

export interface ScenarioFile {
  id: string
  name: string
  rows: number
  uploadedAt: string
}

export interface ScenarioParams {
  baseDate: string
  exitRatePercent: number
  heifersPurchasePerMonth: number
  ownHeifersPercent: number
  forecastDate: string
}

export interface ForecastRow {
  month: string
  avg_dim: number
  cows_count: number
  total_adults: number
  milk_total: number
  first_calvings: number
  purchased?: number
}

export type PeriodKey = "1" | "12" | "36"

export interface User {
  id: string
  name: string
  email: string
  password: string
  isAdmin: boolean
}
