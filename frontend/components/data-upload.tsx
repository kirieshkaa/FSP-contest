"use client"

import { useState, useCallback } from "react"
import { Upload, FileText, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ScenarioFile } from "@/lib/types"

interface DataUploadProps {
  files: ScenarioFile[]
  activeFileId: string | null
  onFileSelect: (fileId: string) => void
  onFileAdd: (file: ScenarioFile) => void
  onFileRemove: (fileId: string) => void
}

export function DataUpload({ 
  files, 
  activeFileId, 
  onFileSelect, 
  onFileAdd, 
  onFileRemove 
}: DataUploadProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').filter((line) => line.trim())
        const newFile: ScenarioFile = {
          id: `f${Date.now()}`,
          name: f.name,
          rows: lines.length,
          uploadedAt: new Date().toLocaleDateString("ru-RU"),
        }
        onFileAdd(newFile)
      }
      reader.readAsText(f)
    }
  }, [onFileAdd])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && f.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n').filter((line) => line.trim())
        const newFile: ScenarioFile = {
          id: `f${Date.now()}`,
          name: f.name,
          rows: lines.length,
          uploadedAt: new Date().toLocaleDateString("ru-RU"),
        }
        onFileAdd(newFile)
      }
      reader.readAsText(f)
    }
  }, [onFileAdd])

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
          "flex flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-3 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/50"
        )}
      >
        <Upload className="size-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Перетащите CSV или нажмите
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

      {files.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Файлы ({files.length})
          </span>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => onFileSelect(file.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors group",
                  activeFileId === file.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <FileText className={cn(
                  "size-4 shrink-0", 
                  activeFileId === file.id ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="truncate flex-1 font-medium">{file.name}</span>
                <span className="text-muted-foreground shrink-0 text-[10px]">
                  {file.rows} строк
                </span>
                {activeFileId === file.id && (
                  <Check className="size-3.5 text-primary shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onFileRemove(file.id)
                  }}
                  className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Удалить файл"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Нет прикреплённых файлов
        </p>
      )}
    </div>
  )
}
