"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import type { ScenarioParams } from "@/lib/types"

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Выбытие в месяц, %</Label>
          <span className="text-xs font-mono text-muted-foreground">
            {params.exitRatePercent}%
          </span>
        </div>
        <Slider
          min={0}
          max={10}
          step={0.5}
          value={[params.exitRatePercent]}
          onValueChange={([v]) => update({ exitRatePercent: v })}
        />
      </div>

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            Ввод собственных нетелей, % от дойного стада
          </Label>
          <span className="text-xs font-mono text-muted-foreground">
            {params.ownHeifersPercent}%
          </span>
        </div>
        <Slider
          min={0}
          max={60}
          step={1}
          value={[params.ownHeifersPercent]}
          onValueChange={([v]) => update({ ownHeifersPercent: v })}
        />
      </div>

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

    </div>
  )
}
