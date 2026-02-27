"use client"

import { useState, useCallback } from "react"
import { Upload, FileCheck, FileWarning, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface DataUploadProps {
  activeDataset: string
  onDatasetChange: (ds: string) => void
}

export function DataUpload({ activeDataset, onDatasetChange }: DataUploadProps) {
  const [file, setFile] = useState<{ name: string; rows: number; valid: boolean } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile({ name: f.name, rows: 1247, valid: f.name.endsWith(".csv") })
    }
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFile({ name: f.name, rows: 1247, valid: f.name.endsWith(".csv") })
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Загрузить CSV файл"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("csv-upload")?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            document.getElementById("csv-upload")?.click()
          }
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/50"
        )}
      >
        <Upload className="size-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {"Загрузите CSV (разделитель ;, даты DD.MM.YYYY)"}
        </p>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFileInput}
          aria-label="Выберите CSV файл"
        />
      </div>

      {file && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
            file.valid
              ? "border-accent/30 bg-accent/5 text-accent"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          )}
        >
          {file.valid ? (
            <FileCheck className="size-3.5 shrink-0" />
          ) : (
            <FileWarning className="size-3.5 shrink-0" />
          )}
          <span className="truncate flex-1">{file.name}</span>
          <span className="text-muted-foreground shrink-0">
            {file.rows} строк
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setFile(null)
            }}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Сбросить файл"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Или выберите датасет
        </span>
        <Tabs value={activeDataset} onValueChange={onDatasetChange}>
          <TabsList className="w-full">
            <TabsTrigger value="1" className="flex-1 text-xs">
              Датасет 1
            </TabsTrigger>
            <TabsTrigger value="2" className="flex-1 text-xs">
              Датасет 2
            </TabsTrigger>
            <TabsTrigger value="3" className="flex-1 text-xs">
              Датасет 3
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
