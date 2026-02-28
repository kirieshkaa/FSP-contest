"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { ScenarioList } from "@/components/scenario-list"
import { ScenarioDialog } from "@/components/scenario-dialog"
import { DataUpload } from "@/components/data-upload"
import { ParamsForm } from "@/components/params-form"
import type { Scenario, ScenarioParams, ScenarioFile } from "@/lib/types"
import { Database, SlidersHorizontal } from "lucide-react"
import { useState } from "react"

interface AppSidebarProps {
  scenarios: Scenario[]
  activeScenarioId: string
  onSelectScenario: (id: string) => void
  onCreateScenario: (name: string) => void
  params: ScenarioParams
  onParamsChange: (p: ScenarioParams) => void
  activeFileId: string | null
  onFileSelect: (fileId: string) => void
  onFileAdd: (file: ScenarioFile) => void
  onFileRemove: (fileId: string) => void
}

export function AppSidebar({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
  params,
  onParamsChange,
  activeFileId,
  onFileSelect,
  onFileAdd,
  onFileRemove,
}: AppSidebarProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-4 pt-5 pb-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary">
          <span className="text-xs font-bold text-primary-foreground">ПС</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground">
            Прогноз стада
          </span>
          <span className="text-[11px] text-muted-foreground">
            Мои сценарии
          </span>
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <ScenarioList
          scenarios={scenarios}
          activeId={activeScenarioId}
          onSelect={onSelectScenario}
          onCreateClick={() => setDialogOpen(true)}
        />

        <Separator className="my-3" />

        <Accordion type="multiple" defaultValue={["data", "params"]} className="w-full">
          <AccordionItem value="data" className="border-b-0">
            <AccordionTrigger className="py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <Database className="size-3.5" />
                Данные
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <DataUpload
                files={scenarios.find(s => s.id === activeScenarioId)?.files || []}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                onFileAdd={onFileAdd}
                onFileRemove={onFileRemove}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="params" className="border-b-0">
            <AccordionTrigger className="py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5" />
                Параметры
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <ParamsForm params={params} onChange={onParamsChange} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <ScenarioDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={onCreateScenario}
      />
    </aside>
  )
}
