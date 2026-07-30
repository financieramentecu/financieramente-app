'use client'

import { useMemo, useState } from 'react'
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react'
import { useHeatmapTable } from '../hooks/use-heatmap-table'
import { useDashboardFilter } from './DashboardFilterContext'
import { useDashboardCatalogs } from '../hooks/use-dashboard-catalogs'
import { HeatmapCellBusinessList } from './HeatmapCellBusinessList'
import type { PersonRow, CompanyColumn } from '../types/production-kpi.types'
import type { CellExpansionKey } from '../types/heatmap-cell-expansion.types'
import React from 'react'

interface HeatmapTablePanelProps {
  readonly trmRate: number | null
}

/** Sticky first column — shadow on right creates frozen-pane visual separator. */
const STICKY_CELL_STYLE: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 2,
  backgroundColor: 'hsl(var(--card))',
  boxShadow: '2px 0 6px -2px rgba(0,0,0,0.12)',
}

/**
 * Computes heatmap cell background intensity.
 * Non-zero: rgba(59,130,246, intensity) with min 0.05 for visibility.
 * Zero: no background. Negative: no background (plain text only).
 */
function computeCellStyle(usdTotal: number, maxUsd: number): React.CSSProperties {
  if (usdTotal <= 0) return {}
  const intensity = maxUsd > 0 ? Math.max(0.05, usdTotal / maxUsd) : 0.05
  return {
    backgroundColor: `rgba(59, 130, 246, ${intensity})`,
    color: intensity >= 0.55 ? 'white' : undefined,
  }
}

const numFormatter = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const formatUsd = (v: number) => `$${numFormatter.format(v)} USD`
const formatCop = (v: number) => `$${numFormatter.format(v)} COP`

/** USD cell with optional COP sub-line for local-currency production. */
function UsdCell({ row, column }: { row: PersonRow; column: CompanyColumn }) {
  const cell = row.cellsByCompany.get(column.idCompany)
  const usdTotal = cell?.usdTotal ?? 0
  const copTotal = cell?.copTotal ?? 0
  const cellStyle = computeCellStyle(usdTotal, column.maxUsd)

  return (
    <td
      className="px-3 py-2 text-right text-xs whitespace-nowrap border-b border-l-2 border-r border-border"
      style={cellStyle}
    >
      {usdTotal > 0 ? (
        <div className="flex flex-col gap-0.5">
          <span>{formatUsd(usdTotal)}</span>
          {copTotal > 0 && (
            <span className="text-[10px] opacity-80">
              {formatCop(copTotal)}
            </span>
          )}
        </div>
      ) : (
        '—'
      )}
    </td>
  )
}

/** NEG cell — plain count, no heatmap. */
function NegCell({ row, column }: { row: PersonRow; column: CompanyColumn }) {
  const cell = row.cellsByCompany.get(column.idCompany)
  const count = cell?.count ?? 0

  return (
    <td className="px-3 py-2 text-right text-xs whitespace-nowrap border-b border-r border-border text-muted-foreground">
      {count > 0 ? count : '—'}
    </td>
  )
}

/**
 * Heatmap table panel showing per-user × per-company USD production.
 * First column is sticky for horizontal scroll. Intensity uses inline rgba styles.
 */
export function HeatmapTablePanel({ trmRate }: HeatmapTablePanelProps) {
  const state = useHeatmapTable(trmRate)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [expandedKeys, setExpandedKeys] = useState<ReadonlySet<CellExpansionKey>>(new Set())
  const { appliedFilters } = useDashboardFilter()
  const catalogsState = useDashboardCatalogs()

  const periodicidades = catalogsState.status === 'success' ? catalogsState.data.periodicidades : null
  const periodicityIdByName = useMemo(
    () => new Map<string, number>(periodicidades?.map((p) => [p.name, p.id]) ?? []),
    [periodicidades]
  )

  function toggleRow(rowKeys: CellExpansionKey[]) {
    if (rowKeys.length === 0) return
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      const anyExpanded = rowKeys.some((key) => next.has(key))
      for (const key of rowKeys) {
        if (anyExpanded) next.delete(key)
        else next.add(key)
      }
      return next
    })
  }

  if (state.status === 'idle') {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Producción por empresa (heatmap)
        </h2>
        <p className="text-xs text-muted-foreground">
          Seleccioná un rango de fechas y aplicá los filtros para ver el heatmap.
        </p>
      </section>
    )
  }

  if (state.status === 'loading') {
    return (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-4 w-48 animate-pulse rounded bg-muted-foreground/20" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted-foreground/15" />
          </div>
          <div className="flex gap-2">
            <div className="h-4 w-16 animate-pulse rounded-full bg-muted-foreground/15" />
            <div className="h-4 w-16 animate-pulse rounded-full bg-muted-foreground/15" />
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-border">
          {/* Header skeleton */}
          <div className="flex gap-px bg-muted-foreground/10 border-b border-border">
            <div className="w-40 shrink-0 px-3 py-2">
              <div className="h-3 w-6 animate-pulse rounded bg-muted-foreground/20" />
            </div>
            {[80, 72, 68, 76].map((w, i) => (
              <div key={i} className="flex-1 px-3 py-2 flex justify-center">
                <div className="h-3 animate-pulse rounded bg-muted-foreground/20" style={{ width: w }} />
              </div>
            ))}
          </div>
          {/* Row skeletons */}
          {Array.from({ length: 6 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex gap-px border-b border-border last:border-b-0"
              style={{ animationDelay: `${rowIdx * 60}ms` }}
            >
              <div className="w-40 shrink-0 px-3 py-2.5 flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-muted-foreground/20" />
                <div className="h-3 flex-1 animate-pulse rounded bg-muted-foreground/15" />
              </div>
              {[60, 20, 55, 20, 40, 20, 50, 20].map((w, i) => (
                <div key={i} className="flex-1 px-3 py-2.5 flex justify-end">
                  <div
                    className="h-3 animate-pulse rounded bg-muted-foreground/20"
                    style={{ width: w, animationDelay: `${rowIdx * 60 + i * 30}ms` }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Producción por empresa (heatmap)
        </h2>
        <p className="text-xs text-destructive">{state.error}</p>
      </section>
    )
  }

  const { rows, companyColumns, legend } = state.data
  const sortedRows = sortDir === 'desc' ? rows : [...rows].reverse()

  return (
    <section>
      {/* Header: title + subtitle + legend */}
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Producción por empresa (heatmap)
          </h2>
          <p className="text-xs text-muted-foreground">{rows.length} asesores</p>
        </div>

        {/* Category legend */}
        {legend.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs justify-end">
            {legend.map((item) => (
              <span key={item.categoryName} className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.levelColor }}
                />
                {item.categoryName}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            {/* Row 1: "MS" header spanning both header rows + company names spanning 2 cols each */}
            <tr className="bg-muted/50">
              <th
                rowSpan={2}
                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground border-b border-r border-border"
                style={STICKY_CELL_STYLE}
              >
                <button
                  type="button"
                  onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
                  title={sortDir === 'desc' ? 'Orden: Partner → MS Junior (click para invertir)' : 'Orden: MS Junior → Partner (click para invertir)'}
                  className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                >
                  Money Strategist
                  <ArrowUpDown className="size-3 shrink-0 opacity-60" />
                </button>
              </th>
              {companyColumns.map((col) => (
                <th
                  key={col.idCompany}
                  colSpan={2}
                  className="px-3 py-2 text-center text-xs font-medium text-muted-foreground border-b border-l-2 border-r border-border whitespace-nowrap"
                >
                  {col.companyName.toUpperCase()}
                </th>
              ))}
            </tr>
            {/* Row 2: USD / NEG sub-headers per company */}
            <tr className="bg-muted/30">
              {companyColumns.map((col) => (
                <>
                  <th
                    key={`${col.idCompany}-usd`}
                    className="px-2 py-1 text-right text-[10px] font-medium text-muted-foreground border-b border-l-2 border-r border-border w-20"
                  >
                    USD
                  </th>
                  <th
                    key={`${col.idCompany}-neg`}
                    className="px-2 py-1 text-right text-[10px] font-medium text-muted-foreground border-b border-r border-border w-10"
                  >
                    NEG
                  </th>
                </>
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedRows.map((row, idx) => {
              const isNewGroup = idx === 0 || sortedRows[idx - 1].categoryName !== row.categoryName
              const totalCols = 1 + companyColumns.length * 2

              const rowKeys: CellExpansionKey[] = companyColumns
                .filter((col) => (row.cellsByCompany.get(col.idCompany)?.count ?? 0) > 0)
                .map((col) => `${row.idUser}:${col.idCompany}` as CellExpansionKey)
              const isRowExpanded = rowKeys.some((key) => expandedKeys.has(key))

              return (
                <React.Fragment key={row.idUser}>
                  {isNewGroup && (
                    <tr>
                      <td
                        colSpan={totalCols}
                        className="px-3 py-1 text-[11px] font-semibold tracking-wide border-b border-t border-border"
                        style={{ backgroundColor: `${row.levelColor}22`, color: row.levelColor }}
                      >
                        {row.categoryName}
                      </td>
                    </tr>
                  )}
                  <tr className="hover:bg-muted/30">
                    <td
                      className="px-3 py-2 text-xs border-b border-r border-border"
                      style={STICKY_CELL_STYLE}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleRow(rowKeys)}
                          disabled={rowKeys.length === 0}
                          aria-expanded={isRowExpanded}
                          aria-label={isRowExpanded ? 'Colapsar negocios del asesor' : 'Expandir negocios del asesor'}
                          title={isRowExpanded ? 'Colapsar negocios del asesor' : 'Expandir negocios del asesor'}
                          className="shrink-0 cursor-pointer rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 disabled:cursor-default disabled:opacity-30"
                        >
                          {isRowExpanded ? (
                            <ChevronDown className="size-3.5" />
                          ) : (
                            <ChevronRight className="size-3.5" />
                          )}
                        </button>
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.levelColor }}
                        />
                        <span className="font-medium whitespace-nowrap">{row.fullName}</span>
                      </div>
                    </td>
                    {companyColumns.map((col) => (
                      <>
                        <UsdCell key={`${row.idUser}-${col.idCompany}-usd`} row={row} column={col} />
                        <NegCell key={`${row.idUser}-${col.idCompany}-neg`} row={row} column={col} />
                      </>
                    ))}
                  </tr>
                  {isRowExpanded && (
                    <tr>
                      <td colSpan={totalCols} className="border-b border-border bg-muted/10 p-0">
                        <div className="divide-y divide-border">
                          {rowKeys
                            .filter((key) => expandedKeys.has(key))
                            .map((key) => {
                              const idCompany = Number(key.split(':')[1])
                              const companyName =
                                companyColumns.find((c) => c.idCompany === idCompany)?.companyName ?? ''
                              return (
                                <div key={key} className="border-l-2 border-primary/40 bg-gray-100 pl-3">
                                  <div className="bg-gray-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {companyName}
                                  </div>
                                  <HeatmapCellBusinessList
                                    idUser={row.idUser}
                                    idCompany={idCompany}
                                    appliedFilters={appliedFilters}
                                    periodicityIdByName={periodicityIdByName}
                                  />
                                </div>
                              )
                            })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
