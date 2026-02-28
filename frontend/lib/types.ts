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
  ageFirstInsem: number
  probInsem: number
  gestation: number
  dryPeriod: number
  cullingRate: number
  maintainReplacement: boolean
  growthTarget: number | null
  purchaseMode: 'fixed' | 'curve'
  purchaseCurve: number[]
  purchaseAdjustment: number | null
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

export interface User {
  id: string
  name: string
  email: string
  password: string
  isAdmin: boolean
}
