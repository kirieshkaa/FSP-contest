"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CompactStats } from '@/components/compact-stats'
import { ForecastChart } from '@/components/forecast-chart'
import { ForecastTable } from '@/components/forecast-table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { BarChart3, Upload, Menu, X, Sun, Moon, Download, FileText, Trash2, Plus, Send, Shield, User, LogOut, Settings2 } from 'lucide-react'
import type { ForecastRow } from '@/lib/types'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createQuery, getQuery, getQueries, deleteQuery, logout, isAuthenticated, getBaseUrl, CreateQueryParams } from '@/lib/api'
import { QueryParamsPanel, defaultParams } from '@/components/query-params-panel'

type ExportFormat = 'csv' | 'xlsx' | 'json'

interface ChatSession {
  id: string
  title: string
  query_id: string | null
  file: File | null
  forecastData: ForecastRow[]
}

function exportToCSV(data: ForecastRow[], filename: string) {
  const headers = ['Месяц', 'Средние дни доения', 'Дойные, гол', 'Сухостойные, гол', 'Первотёлки, гол', 'Купленные, гол']
  const rows = data.map(row => [
    row.month,
    row.avg_dim.toFixed(1),
    row.cows_count,
    row.total_adults - row.cows_count,
    row.first_calvings,
    row.purchased ?? 0
  ].join(';'))
  
  const csvContent = '\ufeff' + [headers.join(';'), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.click()
}

function exportToXLSX(data: ForecastRow[], filename: string) {
  const headers = ['Месяц', 'Средние дни доения', 'Дойные, гол', 'Сухостойные, гол', 'Первотёлки, гол', 'Купленные, гол']
  const rows = data.map(row => [
    row.month,
    row.avg_dim,
    row.cows_count,
    row.total_adults - row.cows_count,
    row.first_calvings,
    row.purchased ?? 0
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

function handleExport(format: ExportFormat, data: ForecastRow[], name: string) {
  const filename = `forecast_${name}_${new Date().toISOString().split('T')[0]}`
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
      <Button size="sm" variant="ghost" className={`text-xs ${className}`}>
        <Moon className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button 
      size="sm" 
      variant="ghost" 
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`text-xs ${className}`}
      aria-label="Переключить тему"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export default function DashboardPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const baseUrl = getBaseUrl()
  
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [period, setPeriod] = useState<number>(36)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [queryParams, setQueryParams] = useState<CreateQueryParams>(defaultParams)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(baseUrl + '/login')
      return
    }
    setIsAdmin(localStorage.getItem('user_role') === 'admin')
    loadQueries()
  }, [router])

  const loadQueries = async () => {
    try {
      const data = await getQueries(1, 50)
      if (data.items.length > 0) {
        const loadedSessions: ChatSession[] = await Promise.all(
          data.items.map(async (q) => {
            try {
              const result = await getQuery(q.query_id)
              return {
                id: q.query_id,
                title: q.query_title || 'Расчёт',
                query_id: q.query_id,
                file: null,
                forecastData: result.response.response_json,
              }
            } catch {
              return {
                id: q.query_id,
                title: q.query_title || 'Расчёт',
                query_id: q.query_id,
                file: null,
                forecastData: [],
              }
            }
          })
        )
        setSessions(loadedSessions.reverse())
        createNewSession()
      }
    } catch (err) {
      console.error('Failed to load queries:', err)
    } finally {
      setInitialLoaded(true)
    }
  }

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  )

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'Новый расчёт',
      query_id: null,
      file: null,
      forecastData: [],
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, file, title: file.name.replace('.csv', '') }
          : s
      ))
    }
  }

  const handleCalculate = async () => {
    if (!isAuthenticated()) {
      router.push(baseUrl + '/login')
      return
    }

    if (!activeSession?.file) {
      setError('Пожалуйста, загрузите файл с данными')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await createQuery(
        activeSession.file,
        activeSession.title,
        queryParams
      )
      
      const queryResult = await getQuery(response.query_id)
      const data = queryResult.response.response_json
      
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId 
          ? { ...s, forecastData: data, query_id: response.query_id }
          : s
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка расчёта')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const session = sessions.find(s => s.id === sessionId)
    if (session?.query_id) {
      try {
        await deleteQuery(session.query_id)
      } catch (err) {
        console.error('Failed to delete query from backend')
      }
    }
    
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeSessionId === sessionId) {
      setActiveSessionId(sessions.length > 1 ? sessions[1].id : null)
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push(baseUrl + '/login')
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push(baseUrl + '/login')
    }
  }, [router])

  const handleTitleChange = (title: string) => {
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId ? { ...s, title } : s
    ))
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
           style={{ width: 320 }}>
        <div className="flex h-full w-[320px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2 px-4 pt-5 pb-4">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary">
              <span className="text-xs font-bold text-primary-foreground">ПС</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                Прогноз стада
              </span>
              <span className="text-[11px] text-muted-foreground">
                Расчёты
              </span>
            </div>
          </div>
          
          <div className="px-3 py-2">
            <Button 
              variant="outline" 
              className="w-full gap-2 cursor-pointer" 
              onClick={createNewSession}
            >
              <Plus className="size-4" />
              Новый расчёт
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2">
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Нет сохранённых расчётов
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`flex items-center gap-2 rounded-md border px-2 py-2 text-xs cursor-pointer transition-colors group ${
                      activeSessionId === s.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <FileText className={`size-4 shrink-0 ${activeSessionId === s.id ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="truncate flex-1 font-medium">
                      {s.query_id ? '✓ ' : ''}{s.title}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Удалить"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-sidebar-border p-3 flex flex-col gap-2">
            <Button variant="outline" className="w-full cursor-pointer gap-2" onClick={() => router.push(baseUrl + '/profile')}>
              <User className="size-4" />
              Профиль
            </Button>
            {isAdmin && (
              <Button variant="outline" className="w-full cursor-pointer gap-2" onClick={() => router.push(baseUrl + '/admin')}>
                <Shield className="size-4" />
                Админ
              </Button>
            )}
            <Button variant="outline" className="w-full cursor-pointer gap-2" onClick={handleLogout}>
              <LogOut className="size-4" />
              Выйти
            </Button>
          </div>
        </div>
      </div>

      <main className="flex flex-1 flex-col overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden shrink-0 cursor-pointer"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Открыть меню"
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-foreground sm:text-lg">
                {activeSession?.title || 'Прогноз стада'}
              </h1>
              <p className="text-xs text-muted-foreground">Прогнозирование поголовья КРС</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeSession?.forecastData.length > 0 && (
              <>
                <span className="text-sm">Период: {period} мес</span>
                <Slider
                  value={[period]}
                  onValueChange={([v]) => setPeriod(v)}
                  min={1}
                  max={activeSession?.forecastData?.length || 1}
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground">/ {activeSession?.forecastData?.length || 0} мес</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs cursor-pointer">
                      <Download className="size-3.5" />
                      <span className="hidden sm:inline">Скачать</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('csv', activeSession.forecastData.slice(0, period), activeSession?.title || 'query')}>
                      CSV (.csv)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx', activeSession.forecastData.slice(0, period), activeSession?.title || 'query')}>
                      Excel (.xls)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json', activeSession.forecastData.slice(0, period), activeSession?.title || 'query')}>
                      JSON (.json)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <ThemeToggle className="ml-2" />
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          
          {!activeSession ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
                <BarChart3 className="size-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-base font-semibold text-foreground">Новый расчёт</h2>
                <p className="mt-1 text-sm text-muted-foreground">Нажмите "Новый расчёт" чтобы начать</p>
              </div>
              <Button variant="outline" className="gap-2 cursor-pointer" onClick={createNewSession}>
                <Plus className="size-4" /> Новый расчёт
              </Button>
            </div>
          ) : activeSession.forecastData.length > 0 ? (
            <div id="forecast-content" className="flex flex-col gap-4 sm:gap-6">
              <CompactStats data={activeSession.forecastData.slice(0, period)} />
              <ForecastChart
                scenarioData={activeSession.forecastData}
                periodMonths={period}
                scenarioName={activeSession.title}
              />
              <ForecastTable data={activeSession.forecastData} periodMonths={period} />
            </div>
          ) : (
            <div className="max-w-xl mx-auto">
              <div className="bg-card border rounded-lg p-6 space-y-4">
                <div>
                  <Label htmlFor="chat-title">Название (опционально)</Label>
                  <Input
                    id="chat-title"
                    placeholder="Мой расчёт"
                    value={activeSession.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label>Файл с данными</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        fileInputRef.current?.click()
                      }
                    }}
                    className="mt-1 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/50 transition-colors"
                  >
                    {activeSession.file ? (
                      <>
                        <FileText className="size-8 text-primary" />
                        <p className="text-sm font-medium">{activeSession.file.name}</p>
                        <p className="text-xs text-muted-foreground">Нажмите чтобы изменить</p>
                      </>
                    ) : (
                      <>
                        <Upload className="size-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Нажмите или перетащите CSV файл</p>
                      </>
                    )}
                  </div>
                </div>

                <QueryParamsPanel
                  params={queryParams}
                  onChange={setQueryParams}
                  trigger={
                    <Button variant="outline" className="w-full gap-2" disabled={!activeSession.file || loading}>
                      <Settings2 className="size-4" />
                      Параметры
                    </Button>
                  }
                />
                
                <Button 
                  className="w-full gap-2" 
                  onClick={handleCalculate}
                  disabled={!activeSession.file || loading}
                >
                  {loading ? (
                    <>
                      <Skeleton className="size-4 animate-spin" />
                      Расчёт...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Рассчитать
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
