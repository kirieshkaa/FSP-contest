"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import type { ForecastRow } from "@/lib/types"

interface ForecastTableProps {
  data: ForecastRow[]
  periodMonths: number
}

const PAGE_SIZE = 12

export function ForecastTable({ data, periodMonths }: ForecastTableProps) {
  const sliced = data.slice(0, periodMonths)
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const totalPages = Math.ceil(sliced.length / PAGE_SIZE)
  const pageData = sliced.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Таблица прогноза
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="gap-1 text-xs text-muted-foreground"
        >
          {collapsed ? (
            <>
              Развернуть <ChevronDown className="size-3.5" />
            </>
          ) : (
            <>
              Свернуть <ChevronUp className="size-3.5" />
            </>
          )}
        </Button>
      </CardHeader>
      {!collapsed && (
        <CardContent className="px-0 pb-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 text-xs">Месяц</TableHead>
                  <TableHead className="text-right text-xs">
                    Средние дни доения
                  </TableHead>
                  <TableHead className="text-right text-xs">
                    Дойные, гол
                  </TableHead>
                  <TableHead className="text-right text-xs pr-6">
                    Сухостойные, гол
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="pl-6 text-sm font-medium">
                      {row.month}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.avgMilkingDays.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {row.milkingHeadCount}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums pr-6">
                      {row.dryHeadCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 pt-3">
              <span className="text-xs text-muted-foreground">
                Страница {page + 1} из {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="text-xs h-7"
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="text-xs h-7"
                >
                  Далее
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
