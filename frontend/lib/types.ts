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
  avgMilkingDays: number
  milkingHeadCount: number
  dryHeadCount: number
  ownHeifers: number
  purchasedHeifers: number
}

export type PeriodKey = "1" | "12" | "36"
