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

type TableSet = "herd" | "milk" | "heifers"

const PAGE_SIZE = 12

export function ForecastTable({ data, periodMonths }: ForecastTableProps) {
  const sliced = data.slice(0, periodMonths)
  const [page, setPage] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [tableSet, setTableSet] = useState<TableSet>("herd")
  const totalPages = Math.ceil(sliced.length / PAGE_SIZE)
  const pageData = sliced.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Таблица прогноза
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/50 dark:bg-muted/30 rounded-md p-0.5 border text-xs">
            <Button
              variant={tableSet === "herd" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTableSet("herd")}
              className={`h-6 px-2 text-xs rounded-sm cursor-pointer ${tableSet === "herd" ? "shadow-sm" : ""}`}
            >
              Стадо
            </Button>
            <Button
              variant={tableSet === "milk" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTableSet("milk")}
              className={`h-6 px-2 text-xs rounded-sm cursor-pointer ${tableSet === "milk" ? "shadow-sm" : ""}`}
            >
              Молоко
            </Button>
            <Button
              variant={tableSet === "heifers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTableSet("heifers")}
              className={`h-6 px-2 text-xs rounded-sm cursor-pointer ${tableSet === "heifers" ? "shadow-sm" : ""}`}
            >
              Первотёлки
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="gap-1 text-xs text-muted-foreground cursor-pointer"
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
        </div>
      </CardHeader>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${collapsed ? 'max-h-0 opacity-0' : 'max-h-[600px] opacity-100'}`}
      >
        <CardContent className="px-0 pb-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 text-xs">Месяц</TableHead>
                  {tableSet === "herd" ? (
                    <>
                      <TableHead className="text-right text-xs">
                        Средние дни доения
                      </TableHead>
                      <TableHead className="text-right text-xs">
                        Дойные, гол
                      </TableHead>
                      <TableHead className="text-right text-xs pr-6">
                        Сухостойные, гол
                      </TableHead>
                    </>
                  ) : tableSet === "milk" ? (
                    <>
                      <TableHead className="text-right text-xs">
                        Всего голов
                      </TableHead>
                      <TableHead className="text-right text-xs">
                        Удой всего, ц
                      </TableHead>
                      <TableHead className="text-right text-xs pr-6">
                        Первотёлки, гол
                      </TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="text-right text-xs">
                        Первотёлки, гол
                      </TableHead>
                      <TableHead className="text-right text-xs pr-6">
                        Купленные, гол
                      </TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="pl-6 text-sm font-medium">
                      {row.month}
                    </TableCell>
                    {tableSet === "herd" ? (
                      <>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.avg_dim.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.cows_count}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums pr-6">
                          {row.total_adults - row.cows_count}
                        </TableCell>
                      </>
                    ) : tableSet === "milk" ? (
                      <>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.total_adults}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.milk_total}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums pr-6">
                          {row.first_calvings}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right text-sm tabular-nums">
                          {row.first_calvings}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums pr-6">
                          {row.purchased ?? 0}
                        </TableCell>
                      </>
                    )}
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
                  className="text-xs h-7 cursor-pointer"
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="text-xs h-7 cursor-pointer"
                >
                  Далее
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
