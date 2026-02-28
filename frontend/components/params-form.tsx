"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import type { ScenarioParams } from "@/lib/types"
import { useState, useCallback, useEffect } from "react"
import { ChevronLeft, ChevronRight, X, Save, FolderOpen, Plus, Trash2 } from "lucide-react"
import { createPortal } from "react-dom"

interface SliderInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  suffix?: string
  formatValue?: (value: number) => string
}

interface SliderInputWithSwitchProps {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  min: number
  max: number
  step: number
}

function SliderInputWithSwitch({ label, value, onChange, min, max, step }: SliderInputWithSwitchProps) {
  const isEnabled = value !== null
  
  const handleSwitchChange = (checked: boolean) => {
    onChange(checked ? 0 : null)
  }
  
  const handleSliderChange = (values: number[]) => {
    onChange(values[0])
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (!isNaN(val)) {
      const clamped = Math.min(max, Math.max(min, val))
      onChange(clamped)
    }
  }
  
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (isNaN(val) || val < min || val > max) {
      onChange(Math.min(max, Math.max(min, value ?? 0)))
    }
  }
  
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 justify-start">
          <Switch
            checked={isEnabled}
            onCheckedChange={handleSwitchChange}
          />
          <Label className="text-xs">{label}</Label>
        </div>
        {isEnabled && (
          <Input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value ?? 0}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="h-6 w-20 text-xs py-1 px-2"
          />
        )}
      </div>
      {isEnabled && (
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value ?? 0]}
          onValueChange={handleSliderChange}
        />
      )}
    </div>
  )
}

function SliderInput({ label, value, onChange, min, max, step, formatValue }: SliderInputProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0])
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (!isNaN(val)) {
      const clamped = Math.min(max, Math.max(min, val))
      onChange(clamped)
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (isNaN(val) || val < min || val > max) {
      onChange(Math.min(max, Math.max(min, value)))
    }
  }

  const displayValue = formatValue ? formatValue(value) : value

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={typeof displayValue === 'string' && displayValue.includes('%') ? value : displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="h-6 w-20 text-xs py-1 px-2"
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleSliderChange}
      />
    </div>
  )
}

interface PurchaseCurveEditorProps {
  value: number[]
  onChange: (value: number[]) => void
}

function PurchaseCurveEditor({ value, onChange }: PurchaseCurveEditorProps) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 800, height: 600 })
  const [presets, setPresets] = useState<{name: string, curve: number[]}[]>([])
  const [presetName, setPresetName] = useState("")
  const [showPresets, setShowPresets] = useState(false)
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("purchaseCurvePresets")
    if (saved) {
      setPresets(JSON.parse(saved))
    }
  }, [])

  const savePreset = () => {
    if (!presetName.trim()) return
    const newPresets = [...presets, { name: presetName, curve: [...value] }]
    setPresets(newPresets)
    localStorage.setItem("purchaseCurvePresets", JSON.stringify(newPresets))
    setPresetName("")
  }

  const loadPreset = (curve: number[], index: number) => {
    onChange(curve)
    setSelectedPresetIndex(index)
  }

  const deletePreset = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const newPresets = presets.filter((_, i) => i !== index)
    setPresets(newPresets)
    localStorage.setItem("purchaseCurvePresets", JSON.stringify(newPresets))
    if (selectedPresetIndex === index) {
      setSelectedPresetIndex(null)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      }
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const maxValue = 2
  const width = 200
  const height = 60
  const padding = { left: 20, right: 8, top: 8, bottom: 8 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const expandedWidth = windowSize.width * 0.7
  const expandedHeight = windowSize.height * 0.4
  const expandedPadding = { left: 60, right: 30, top: 30, bottom: 40 }
  const expandedChartWidth = expandedWidth - expandedPadding.left - expandedPadding.right
  const expandedChartHeight = expandedHeight - expandedPadding.top - expandedPadding.bottom

  const getX = (index: number, chartW: number, padLeft: number) => padLeft + (index / (value.length - 1)) * chartW
  const getY = (val: number, chartH: number, padTop: number) => padTop + chartH - (Math.min(val, maxValue) / maxValue) * chartH

  const getPoints = (w: number, h: number, pt: number, pl: number) => 
    value.map((v, i) => ({ x: getX(i, w, pl), y: getY(v, h, pt), value: v, index: i }))

  const points = getPoints(chartWidth, chartHeight, padding.top, padding.left)
  const expandedPoints = getPoints(expandedChartWidth, expandedChartHeight, expandedPadding.top, expandedPadding.left)

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    setDraggingIndex(index)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent, expanded: boolean) => {
    if (draggingIndex === null) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    
    const chartH = expanded ? expandedChartHeight : chartHeight
    const padTop = expanded ? expandedPadding.top : padding.top
    
    const normalizedY = Math.max(0, Math.min(1, 1 - (y - padTop) / chartH))
    const newValue = Math.round(normalizedY * maxValue * 10) / 10
    
    const newCurve = [...value]
    newCurve[draggingIndex] = Math.max(0, Math.min(maxValue, newValue))
    onChange(newCurve)
  }, [draggingIndex, maxValue, chartHeight, expandedChartHeight, value, onChange, expandedPadding.top, padding.top])

  const handleMouseUp = () => {
    setDraggingIndex(null)
  }

  const handleMouseLeave = () => {
    setDraggingIndex(null)
    setHoveredIndex(null)
  }

  const handlePointHover = (index: number | null) => {
    setHoveredIndex(index)
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const renderChart = (pts: typeof points, w: number, h: number, pad: typeof padding, chartH: number, expanded: boolean = false) => (
    <svg 
      width={w} 
      height={h} 
      className="border border-border rounded-md bg-background"
      onMouseMove={(e) => handleMouseMove(e, expanded)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const y = pad.top + (chartH / 4) * i
        return (
          <line 
            key={i}
            x1={pad.left} 
            y1={y} 
            x2={w - pad.right} 
            y2={y} 
            stroke="currentColor" 
            strokeWidth="1"
            strokeDasharray="3 3"
            className="text-border/50"
          />
        )
      })}
      
      <line 
        x1={pad.left} 
        y1={h - pad.bottom} 
        x2={w - pad.right} 
        y2={h - pad.bottom} 
        stroke="currentColor" 
        strokeWidth="1"
        className="text-border/50"
      />

      <path 
        d={pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
        fill="none" 
        stroke="#3b82f6" 
        strokeWidth={expanded ? 3 : 2} 
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {pts.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={draggingIndex === i || hoveredIndex === i ? (expanded ? 10 : 8) : (expanded ? 7 : 5)}
            fill={draggingIndex === i ? "#1d4ed8" : hoveredIndex === i ? "#60a5fa" : "#3b82f6"}
            stroke="white"
            strokeWidth="2"
            className="cursor-grab active:cursor-grabbing transition-colors"
            onMouseDown={(e) => handleMouseDown(i, e)}
            onMouseEnter={() => handlePointHover(i)}
            onMouseLeave={() => handlePointHover(null)}
          />
          {hoveredIndex === i && (
            <g>
              <rect
                x={p.x - 22}
                y={p.y > 40 ? p.y - 32 : p.y + 10}
                width={44}
                height={20}
                rx={4}
                fill="#1f2937"
              />
              <text
                x={p.x}
                y={p.y > 40 ? p.y - 18 : p.y + 24}
                textAnchor="middle"
                fontSize={expanded ? 12 : 10}
                fill="white"
                fontWeight="500"
              >
                {p.value.toFixed(1)}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  )

  return (
    <div className="flex flex-col gap-2 relative">
      <div className="flex items-center gap-2">
        {renderChart(points, width, height, padding, chartHeight, false)}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 w-8 shrink-0"
        >
          {isExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </Button>
      </div>
      {isExpanded && typeof document !== 'undefined' && createPortal(
        <div className="fixed left-[320px] top-0 right-0 bottom-0 z-[60] p-6 overflow-auto flex items-center justify-center bg-background/30 backdrop-blur-md">
          <div className="relative flex flex-col gap-4">
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="absolute -top-3 -right-3 h-8 w-8 p-0 bg-foreground text-background border-2 border-background rounded-full z-10 hover:bg-foreground/90 shadow-lg"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2 bg-background rounded-lg border border-border p-2 shadow-sm">
              <Input
                type="text"
                placeholder="Название пресета"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="h-8 w-40 text-sm"
              />
              <Button variant="outline" size="sm" onClick={savePreset} className="h-8 gap-1">
                <Save className="h-4 w-4" />
                Сохранить
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPresets(!showPresets)} className="h-8 gap-1">
                <FolderOpen className="h-4 w-4" />
                Загрузить
              </Button>
            </div>

            {presets.length > 0 && (
              <div className="bg-background rounded-lg border border-border p-2 shadow-sm max-h-40 overflow-auto">
                {presets.map((preset, index) => (
                  <div 
                    key={index} 
                    onClick={() => loadPreset(preset.curve, index)}
                    className={`flex items-center justify-between gap-2 p-1 rounded cursor-pointer ${selectedPresetIndex === index ? 'bg-primary/20 border border-primary' : 'hover:bg-accent'}`}
                  >
                    <span className={`flex-1 text-left text-sm px-2 py-1 ${selectedPresetIndex === index ? 'font-medium' : ''}`}>
                      {preset.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => deletePreset(index, e)}
                      className="h-6 w-6 text-red-500 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {renderChart(expandedPoints, expandedWidth, expandedHeight, expandedPadding, expandedChartHeight, true)}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

interface ParamsFormProps {
  params: ScenarioParams
  onChange: (params: ScenarioParams) => void
}

export function ParamsForm({ params, onChange }: ParamsFormProps) {
  function update(patch: Partial<ScenarioParams>) {
    onChange({ ...params, ...patch })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="base-date" className="text-xs">
          Базовая дата отчёта
        </Label>
        <Input
          id="base-date"
          type="text"
          value={params.baseDate}
          onChange={(e) => update({ baseDate: e.target.value })}
          placeholder="DD.MM.YYYY"
          className="h-8 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Режим закупки</Label>
        <Tabs 
          value={params.purchaseMode} 
          onValueChange={(v) => update({ purchaseMode: v as 'fixed' | 'curve' })}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger value="fixed" className="flex-1">Фиксированная</TabsTrigger>
            <TabsTrigger value="curve" className="flex-1">График</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {params.purchaseMode === 'fixed' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="heifers" className="text-xs">
            Покупка нетелей, шт/мес
          </Label>
          <Input
            id="heifers"
            type="number"
            min={0}
            max={200}
            value={params.heifersPurchasePerMonth}
            onChange={(e) =>
              update({ heifersPurchasePerMonth: Number(e.target.value) })
            }
            className="h-8 text-sm"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">График закупок (перетаскивайте для настройки)</Label>
          <PurchaseCurveEditor
            value={params.purchaseCurve}
            onChange={(curve) => update({ purchaseCurve: curve })}
          />
        </div>
      )}

      <SliderInputWithSwitch
        label="Целевой годовой темп роста"
        value={params.purchaseAdjustment}
        onChange={(v) => update({ purchaseAdjustment: v })}
        min={-1}
        max={1}
        step={0.1}
      />

      {/* Режим роста удалён в откате */}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forecast-date" className="text-xs">
          Рассчитать на дату
        </Label>
        <Input
          id="forecast-date"
          type="text"
          value={params.forecastDate}
          onChange={(e) => update({ forecastDate: e.target.value })}
          placeholder="DD.MM.YYYY"
          className="h-8 text-sm"
        />
      </div>

      <div className="border-t border-border my-1" />

      <div className="flex flex-col gap-3">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          Параметры воспроизводства
        </Label>

        <SliderInput
          label="Возраст первого осеменения, дни"
          value={params.ageFirstInsem}
          onChange={(v) => update({ ageFirstInsem: v })}
          min={300}
          max={500}
          step={5}
        />

        <SliderInput
          label="Вероятность осеменения в месяц"
          value={params.probInsem}
          onChange={(v) => update({ probInsem: v })}
          min={0.05}
          max={1}
          step={0.01}
        />

        <SliderInput
          label="Длительность стельности, дни"
          value={params.gestation}
          onChange={(v) => update({ gestation: v })}
          min={260}
          max={300}
          step={1}
        />

        <SliderInput
          label="День запуска (сухостой), дни"
          value={params.dryPeriod}
          onChange={(v) => update({ dryPeriod: v })}
          min={180}
          max={270}
          step={5}
        />

        <SliderInput
          label="Базовая ставка выбраковки в месяц"
          value={params.cullingRate}
          onChange={(v) => update({ cullingRate: v })}
          min={0}
          max={0.1}
          step={0.005}
        />
      </div>
    </div>
  )
}
// GrowthGraph removed in rollback (original UI only)
