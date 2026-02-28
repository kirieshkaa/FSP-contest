"use client"

import { cn } from "@/lib/utils"
import type { Scenario } from "@/lib/types"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ScenarioListProps {
  scenarios: Scenario[]
  activeId: string
  onSelect: (id: string) => void
  onCreateClick: () => void
}

export function ScenarioList({
  scenarios,
  activeId,
  onSelect,
  onCreateClick,
}: ScenarioListProps) {
  return (
    <div className="flex flex-col gap-3">
      <Button onClick={onCreateClick} className="w-full gap-2">
        <Plus className="size-4" />
        Создать
      </Button>
      <ScrollArea className="max-h-[260px]">
        <div className="flex flex-col gap-1">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                "hover:bg-sidebar-accent",
                activeId === s.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80"
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  s.color
                )}
                aria-hidden="true"
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {s.updatedAt}
                </span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
