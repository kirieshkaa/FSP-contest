"use client";
import { useState, useCallback, useMemo, useEffect } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { CompactStats } from '@/components/compact-stats'
import { ForecastChart } from '@/components/forecast-chart'
import { ForecastTable } from '@/components/forecast-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BarChart3, Upload, AlertCircle, Menu, X, Sun, Moon, Download } from 'lucide-react'
import { defaultScenarios, scenarioDatasets } from '@/lib/mock-data'
import type { Scenario, ScenarioParams, ScenarioFile, ForecastRow } from '@/lib/types'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ExportFormat = 'csv' | 'xlsx' | 'json'

function exportToCSV(data: ForecastRow[], filename: string) {
  const headers = ['Месяц', 'Средние дни доения', 'Дойные, гол', 'Сухостойные, гол', 'Собственные первотёлки, гол', 'Купленные нетели, гол']
  const rows = data.map(row => [
    row.month,
    row.avgMilkingDays.toFixed(1),
    row.milkingHeadCount,
    row.dryHeadCount,
    row.ownHeifers,
    row.purchasedHeifers
  ].join(';'))
  
  const csvContent = '\ufeff' + [headers.join(';'), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

function exportToXLSX(data: ForecastRow[], filename: string) {
  const headers = ['Месяц', 'Средние дни доения', 'Дойные, гол', 'Сухостойные, гол', 'Собственные первотёлки, гол', 'Купленные нетели, гол']
  const rows = data.map(row => [
    row.month,
    row.avgMilkingDays,
    row.milkingHeadCount,
    row.dryHeadCount,
    row.ownHeifers,
    row.purchasedHeifers
  ])
  
  let xlsxContent = headers.join('\t') + '\n'
  rows.forEach(row => {
    xlsxContent += row.join('\t') + '\n'
  })
  
  const blob = new Blob([xlsxContent], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.xls`
  link.click()
}

function exportToJSON(data: ForecastRow[], filename: string) {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.json`
  link.click()
}

function handleExport(format: ExportFormat, data: ForecastRow[], scenarioName: string) {
  const filename = `forecast_${scenarioName}_${new Date().toISOString().split('T')[0]}`
  switch (format) {
    case 'csv':
      exportToCSV(data, filename)
      break
    case 'xlsx':
      exportToXLSX(data, filename)
      break
    case 'json':
      exportToJSON(data, filename)
      break
  }
}

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button size="sm" variant="ghost" className={`text-xs transition-all duration-300 hover:bg-accent hover:scale-105 active:scale-95 ${className}`}>
        <Moon className="size-4 animate-pulse" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button 
      size="sm" 
      variant="ghost" 
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`text-xs transition-all duration-300 hover:bg-accent hover:scale-105 active:scale-95 ${className}`}
      aria-label="Переключить тему"
    >
      <div className="relative w-4 h-4">
        <span className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}`}>
          <Moon className="size-4" />
        </span>
        <span className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}`}>
          <Sun className="size-4" />
        </span>
      </div>
    </Button>
  );
}

export default function DashboardPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>(defaultScenarios)
  const [activeId, setActiveId] = useState('1')
  const [period, setPeriod] = useState<number>(36)
  const [loading, setLoading] = useState(false)
  const [hasData, setHasData] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const activeScenario = useMemo(
    () => scenarios.find((s) => s.id === activeId) ?? scenarios[0],
    [scenarios, activeId]
  )

  const scenarioData = useMemo(
    () => scenarioDatasets[activeId] ?? scenarioDatasets['1'],
    [activeId]
  )

  const periodMonths = period

  const handleParamsChange = useCallback(
    (params: ScenarioParams) => {
      setScenarios((prev) =>
        prev.map((s) => (s.id === activeId ? { ...s, params } : s))
      )
    },
    [activeId]
  )

  const handleCreateScenario = useCallback((name: string) => {
    const newId = String(Date.now())
    const newScenario: Scenario = {
      id: newId,
      name,
      updatedAt: 'только что',
      color: 'bg-chart-3',
        params: {
          baseDate: '26.02.2026',
          exitRatePercent: 3,
          heifersPurchasePerMonth: 0,
          ownHeifersPercent: 15,
          forecastDate: '26.02.2029',
          ageFirstInsem: 395,
          probInsem: 0.2,
          gestation: 282,
          dryPeriod: 220,
          cullingRate: 0.025,
          maintainReplacement: false,
          growthTarget: null,
          purchaseMode: 'fixed',
          purchaseCurve: [1,1,1,1,1,1,1,1,1,1,1,1],
          purchaseAdjustment: null,
        },
      files: [],
      activeFileId: null,
    }
    setScenarios((prev) => [...prev, newScenario])
    setActiveId(newId)
  }, [])

  const handleFileSelect = useCallback((fileId: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeId ? { ...s, activeFileId: fileId } : s))
    )
    setHasData(true)
  }, [activeId])

  const handleFileAdd = useCallback((file: ScenarioFile) => {
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== activeId) return s
        const newFiles = [...s.files, file]
        return { ...s, files: newFiles, activeFileId: file.id }
      })
    )
    setHasData(true)
  }, [activeId])

  const handleFileRemove = useCallback((fileId: string) => {
    setScenarios((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== activeId) return s
        const newFiles = s.files.filter((f) => f.id !== fileId)
        const newActiveId = s.activeFileId === fileId 
          ? (newFiles.length > 0 ? newFiles[0].id : null)
          : s.activeFileId
        return { ...s, files: newFiles, activeFileId: newActiveId }
      })
      const scenario = updated.find((s) => s.id === activeId)
      return updated
    })
    setHasData(true)
  }, [activeId])

  const handleCalculate = useCallback(() => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = parseInt(new URLSearchParams(window.location.search).get('period') || '36', 10)
      if (!Number.isNaN(p)) setPeriod(Math.max(1, Math.min(36, p)))
    }
  }, [])

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <AppSidebar
          scenarios={scenarios}
          activeScenarioId={activeId}
          onSelectScenario={(id) => {
            setActiveId(id)
            setSidebarOpen(false)
          }}
          onCreateScenario={handleCreateScenario}
          params={activeScenario?.params}
          onParamsChange={handleParamsChange}
          activeFileId={activeScenario?.activeFileId ?? null}
          onFileSelect={handleFileSelect}
          onFileAdd={handleFileAdd}
          onFileRemove={handleFileRemove}
        />
      </div>

      <main className="flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Открыть меню"
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-foreground sm:text-lg">Сценарии</h1>
              <p className="text-xs text-muted-foreground">{"Средние дни доения — прогноз"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm">Период: {period} мес</span>
            <input type="range" min={1} max={36} value={period} onChange={(e)=>setPeriod(parseInt(e.target.value))} className="w-48" />
            <Button size="sm" onClick={handleCalculate} className="gap-1.5 text-xs">
              <BarChart3 className="size-3.5" />
              <span className="hidden sm:inline">Рассчитать</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                  <Download className="size-3.5" />
                  <span className="hidden sm:inline">Скачать</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv', scenarioData.slice(0, periodMonths), activeScenario?.name || 'scenario')}>
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx', scenarioData.slice(0, periodMonths), activeScenario?.name || 'scenario')}>
                  Excel (.xls)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json', scenarioData.slice(0, periodMonths), activeScenario?.name || 'scenario')}>
                  JSON (.json)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle className="ml-2" />
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6">
          {!hasData ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted"><Upload className="size-7 text-muted-foreground" /></div>
              <div className="text-center">
                <h2 className="text-base font-semibold text-foreground">Нет данных</h2>
                <p className="mt-1 text-sm text-muted-foreground">Загрузите CSV или выберите датасет в боковой панели</p>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => setSidebarOpen(true)}>
                <Upload className="size-4" /> Загрузить CSV
              </Button>
            </div>
          ) : loading ? (
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}</div>
              <Skeleton className="h-[420px] rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ) : (
            <div id="forecast-content" className="flex flex-col gap-4 sm:gap-6">
              {false && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{"Не удалось прочитать CSV: проверьте разделитель ; и формат дат"}</AlertDescription>
                </Alert>
              )}

              <CompactStats data={scenarioData} />

              

              <ForecastChart
                scenarioData={scenarioData}
                periodMonths={periodMonths}
                scenarioName={activeScenario?.name}
              />

              <ForecastTable data={scenarioData} periodMonths={periodMonths} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
