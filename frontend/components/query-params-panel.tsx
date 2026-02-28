"use client"

import { useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CreateQueryParams } from '@/lib/api'

interface QueryParamsPanelProps {
  params: CreateQueryParams
  onChange: (params: CreateQueryParams) => void
  trigger?: React.ReactNode
}

const defaultParams: CreateQueryParams = {
  months: 36,
  purchase: 0,
  target_date: '',
  params_source: 'empirical',
  maintain_replacement: true,
  growth_target: 1.0,
  purchase_curve: '',
  age_first_insem: 15,
  prob_insem: 0.6,
  gestation: 280,
  dry_period: 60,
  culling_rate: 0.25,
}

export function QueryParamsPanel({ params, onChange, trigger }: QueryParamsPanelProps) {
  const [localParams, setLocalParams] = useState<CreateQueryParams>(params || defaultParams)
  const [open, setOpen] = useState(false)

  const updateParam = <K extends keyof CreateQueryParams>(key: K, value: CreateQueryParams[K]) => {
    const updated = { ...localParams, [key]: value }
    setLocalParams(updated)
    onChange(updated)
  }

  const handleApply = () => {
    onChange(localParams)
    setOpen(false)
  }

  const handleReset = () => {
    setLocalParams(defaultParams)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Settings2 className="size-4" />
            Параметры
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            Параметры расчёта
          </DialogTitle>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={['basic', 'purchase', 'herd', 'reproduction', 'culling']} className="w-full">
          <AccordionItem value="basic">
            <AccordionTrigger>Основные параметры</AccordionTrigger>
            <AccordionContent className="space-y-6 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Период прогнозирования</Label>
                  <span className="text-sm font-medium text-primary">{localParams.months} мес</span>
                </div>
                <Slider
                  value={[localParams.months || 36]}
                  onValueChange={([v]) => updateParam('months', v)}
                  min={1}
                  max={120}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 мес</span>
                  <span>120 мес</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Источник параметров</Label>
                <Select
                  value={localParams.params_source}
                  onValueChange={(v) => updateParam('params_source', v as 'empirical' | 'constants' | 'custom')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="empirical">Эмпирические (по данным)</SelectItem>
                    <SelectItem value="constants">Константы (справочник)</SelectItem>
                    <SelectItem value="custom">Свои значения</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Целевая дата</Label>
                <Input
                  type="date"
                  value={localParams.target_date || ''}
                  onChange={(e) => updateParam('target_date', e.target.value)}
                  placeholder="Не задана"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="purchase">
            <AccordionTrigger>Закупка коров</AccordionTrigger>
            <AccordionContent className="space-y-6 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Количество закупаемых коров</Label>
                  <span className="text-sm font-medium text-primary">{localParams.purchase || 0}</span>
                </div>
                <Slider
                  value={[localParams.purchase || 0]}
                  onValueChange={([v]) => updateParam('purchase', v)}
                  min={0}
                  max={500}
                  step={10}
                />
              </div>

              <div className="space-y-2">
                <Label>Кривая закупки</Label>
                <Select
                  value={localParams.purchase_curve || 'constant'}
                  onValueChange={(v) => updateParam('purchase_curve', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите кривую" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="constant">Равномерно</SelectItem>
                    <SelectItem value="front">Сначала</SelectItem>
                    <SelectItem value="back">В конце</SelectItem>
                    <SelectItem value="middle">В середине</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="herd">
            <AccordionTrigger>Параметры стада</AccordionTrigger>
            <AccordionContent className="space-y-6 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Поддерживать ремонт</Label>
                  <p className="text-xs text-muted-foreground">Сохранять поголовье нетелей</p>
                </div>
                <Switch
                  checked={localParams.maintain_replacement ?? true}
                  onCheckedChange={(v) => updateParam('maintain_replacement', v)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Темп роста стада</Label>
                  <span className="text-sm font-medium text-primary">{localParams.growth_target?.toFixed(2) || '1.00'}</span>
                </div>
                <Slider
                  value={[localParams.growth_target || 1.0]}
                  onValueChange={([v]) => updateParam('growth_target', v)}
                  min={0.5}
                  max={2.0}
                  step={0.05}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.5x</span>
                  <span>2.0x</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="reproduction">
            <AccordionTrigger>Воспроизводство</AccordionTrigger>
            <AccordionContent className="space-y-6 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Возраст первого осеменения</Label>
                  <span className="text-sm font-medium text-primary">{localParams.age_first_insem} мес</span>
                </div>
                <Slider
                  value={[localParams.age_first_insem || 15]}
                  onValueChange={([v]) => updateParam('age_first_insem', v)}
                  min={12}
                  max={24}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Вероятность осеменения</Label>
                  <span className="text-sm font-medium text-primary">{((localParams.prob_insem || 0.6) * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[localParams.prob_insem || 0.6]}
                  onValueChange={([v]) => updateParam('prob_insem', v)}
                  min={0.3}
                  max={0.9}
                  step={0.05}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Стельность</Label>
                  <span className="text-sm font-medium text-primary">{localParams.gestation} дн</span>
                </div>
                <Slider
                  value={[localParams.gestation || 280]}
                  onValueChange={([v]) => updateParam('gestation', v)}
                  min={270}
                  max={290}
                  step={1}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Сухостойный период</Label>
                  <span className="text-sm font-medium text-primary">{localParams.dry_period} дн</span>
                </div>
                <Slider
                  value={[localParams.dry_period || 60]}
                  onValueChange={([v]) => updateParam('dry_period', v)}
                  min={40}
                  max={70}
                  step={5}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="culling">
            <AccordionTrigger>Выбытие</AccordionTrigger>
            <AccordionContent className="space-y-6 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Процент выбытия</Label>
                  <span className="text-sm font-medium text-primary">{((localParams.culling_rate || 0.25) * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[localParams.culling_rate || 0.25]}
                  onValueChange={([v]) => updateParam('culling_rate', v)}
                  min={0.1}
                  max={0.5}
                  step={0.05}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10%</span>
                  <span>50%</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            Сбросить
          </Button>
          <Button onClick={handleApply}>
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { defaultParams }
