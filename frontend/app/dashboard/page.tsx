"use client";
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CompactStats } from '@/components/compact-stats'
import { ForecastChart } from '@/components/forecast-chart'
import { ForecastTable } from '@/components/forecast-table'
import { AnalyticsCard } from '@/components/analytics-card'
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
  created_at?: string
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
      <Button size="sm" variant="ghost" className={`text-xs cursor-pointer ${className}`}>
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
      className={`text-xs cursor-pointer ${className}`}
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [initialLoaded, setInitialLoaded] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [queryParams, setQueryParams] = useState<CreateQueryParams>(defaultParams)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [draftTitle, setDraftTitle] = useState<string>('Новый расчёт')
  const [fileError, setFileError] = useState<string>('')

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
        const loadedSessions: ChatSession[] = data.items.map((q) => ({
          id: q.query_id,
          title: q.query_title || 'Расчёт',
          query_id: q.query_id,
          file: null,
          forecastData: [],
          created_at: q.created_at,
        }))
        setSessions(loadedSessions.reverse())
        createNewSession()
      }
    } catch (err) {
      console.error('Failed to load queries:', err)
    } finally {
      setInitialLoaded(true)
    }
  }

  useEffect(() => {
    if (activeSession?.query_id && activeSession.forecastData.length === 0) {
      const loadQueryData = async () => {
        try {
          const result = await getQuery(activeSession.query_id!)
          setSessions(prev => prev.map(s => 
            s.id === activeSessionId 
              ? { ...s, forecastData: result.response.response_json, created_at: result.query.created_at }
              : s
          ))
        } catch (err) {
          console.error('Failed to load query data:', err)
        }
      }
      loadQueryData()
    }
  }, [activeSessionId])

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  )

  const createNewSession = () => {
    if (activeSession && !activeSession.query_id) {
      setDraftFile(activeSession.file)
      setDraftTitle(activeSession.title)
      setQueryParams(queryParams)
    }
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: draftTitle,
      query_id: null,
      file: draftFile,
      forecastData: [],
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(newSession.id)
  }

  const handleSessionChange = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session && activeSession && !activeSession.query_id) {
      setDraftFile(activeSession.file)
      setDraftTitle(activeSession.title)
      setQueryParams(queryParams)
    }
    setActiveSessionId(sessionId)
  }

  const validateCSV = async (file: File): Promise<string | null> => {
    try {
      const text = await file.text()
      const lines = text.split('\n')
      if (lines.length < 2) {
        return 'Файл пустой или содержит только заголовки'
      }
      
      const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''))
      
      const requiredColumns = [
        'Номер животного',
        'Дата рождения',
        'Дни в доении',
        'Статус коровы'
      ]
      
      const missing = requiredColumns.filter(col => 
        !headers.some(h => h.toLowerCase() === col.toLowerCase() || h === col)
      )
      
      if (missing.length > 0) {
        return `Отсутствуют обязательные колонки: ${missing.join(', ')}`
      }
      
      return null
    } catch {
      return 'Не удалось прочитать файл'
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.csv')) {
      setFileError('Поддерживаются только CSV файлы')
      return
    }
    
    const error = await validateCSV(file)
    if (error) {
      setFileError(error)
      return
    }
    
    setFileError('')
    const title = file.name.replace('.csv', '')
    setSessions(prev => prev.map(s => 
      s.id === activeSessionId 
        ? { ...s, file, title }
        : s
    ))
    if (!activeSession?.query_id) {
      setDraftFile(file)
      setDraftTitle(title)
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
          ? { ...s, forecastData: data, query_id: response.query_id, file: null }
          : s
      ))
      setDraftFile(null)
      setDraftTitle('Новый расчёт')
      setQueryParams(defaultParams)
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
    
    const remainingSessions = sessions.filter(s => s.id !== sessionId)
    setSessions(remainingSessions)
    if (activeSessionId === sessionId && remainingSessions.length > 0) {
      setActiveSessionId(remainingSessions[0].id)
    } else if (activeSessionId === sessionId) {
      setActiveSessionId(null)
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
    if (!activeSession?.query_id) {
      setDraftTitle(title)
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {!sidebarOpen && (
          <motion.button
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex size-10 items-center justify-center rounded-r-full bg-primary text-primary-foreground shadow-lg cursor-pointer hover:bg-primary/90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed inset-y-0 left-0 z-50 w-[320px]"
      >
        <div className="flex h-full w-[320px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="flex items-center justify-between px-4 pt-5 pb-4">
            <div className="flex items-center gap-2">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Button>
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
                    {sessions.filter(s => s.query_id).map((s, index) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSessionChange(s.id)}
                        className={`flex items-center gap-2 rounded-md border px-2 py-2 text-xs cursor-pointer transition-colors group ${
                          activeSessionId === s.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <FileText className={`size-4 shrink-0 ${activeSessionId === s.id ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="truncate flex-1 font-medium">
                          {s.title}
                        </span>
                        <button
                          onClick={(e) => handleDeleteSession(s.id, e)}
                          className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          aria-label="Удалить"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </motion.div>
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
          </motion.div>

      {!initialLoaded ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-muted-foreground">Загрузка...</div>
        </div>
      ) : (
      <motion.main 
        className="flex flex-1 flex-col overflow-y-auto"
        initial={false}
        animate={{ 
          marginLeft: sidebarOpen ? 320 : 0,
          paddingLeft: sidebarOpen ? 0 : "6%",
          paddingRight: sidebarOpen ? 0 : "6%"
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h1 className="text-base font-semibold text-foreground sm:text-lg">
                {activeSession?.title || 'Прогноз стада'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {activeSession?.created_at 
                  ? `Создан: ${new Date(activeSession.created_at).toLocaleString('ru-RU')}`
                  : 'Прогнозирование поголовья КРС'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(activeSession?.forecastData?.length ?? 0) > 0 && (
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
                    <DropdownMenuItem onClick={() => handleExport('csv', activeSession!.forecastData.slice(0, period), activeSession?.title || 'query')}>
                      CSV (.csv)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('xlsx', activeSession!.forecastData.slice(0, period), activeSession?.title || 'query')}>
                      Excel (.xls)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json', activeSession!.forecastData.slice(0, period), activeSession?.title || 'query')}>
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
            <motion.div 
              id="forecast-content" 
              key={activeSessionId}
              className="flex flex-col gap-4 sm:gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <AnalyticsCard data={activeSession.forecastData} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CompactStats data={activeSession.forecastData.slice(0, period)} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ForecastChart
                  scenarioData={activeSession.forecastData}
                  periodMonths={period}
                  scenarioName={activeSession.title}
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <ForecastTable data={activeSession.forecastData} periodMonths={period} />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div 
              className="max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
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

                {fileError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{fileError}</p>
                  </div>
                )}

                <QueryParamsPanel
                  params={queryParams}
                  onChange={(params) => setQueryParams(params)}
                  trigger={
                    <Button variant="outline" className="w-full gap-2" disabled={!activeSession.file || loading || !!fileError}>
                      <Settings2 className="size-4" />
                      Параметры
                    </Button>
                  }
                />
                
                <Button 
                  className="w-full gap-2" 
                  onClick={handleCalculate}
                  disabled={!activeSession.file || loading || !!fileError}
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

                {(activeSession.file || draftFile) && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => {
                      setDraftFile(null)
                      setDraftTitle('Новый расчёт')
                      setQueryParams(defaultParams)
                      setFileError('')
                      setSessions(prev => prev.map(s => 
                        s.id === activeSessionId 
                          ? { ...s, file: null, title: 'Новый расчёт' }
                          : s
                      ))
                    }}
                  >
                    <X className="size-4" />
                    Сбросить
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </motion.main>
      )}
    </div>
  )
}
