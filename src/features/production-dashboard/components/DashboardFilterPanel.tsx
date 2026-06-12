'use client'

import { Button } from '@/features/shared/ui/button'
import { Card, CardContent } from '@/features/shared/ui/card'
import { Separator } from '@/features/shared/ui/separator'
import { useHierarchySelection } from './HierarchySelectionContext'
import { useDashboardFilter } from './DashboardFilterContext'
import { useDashboardCatalogs } from '../hooks/use-dashboard-catalogs'
import { isDateRangeValid } from '../lib/validate-date-range'
import { MonthRangePicker } from './filters/MonthRangePicker'
import { MultiSelectFilter } from './filters/MultiSelectFilter'
import { SingleSelectFilter } from './filters/SingleSelectFilter'
import { ActiveFilterBadges } from './filters/ActiveFilterBadges'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

// ─── Constants ─────────────────────────────────────────────────────────────────

const TODAS_SENTINEL = '__todas__'

const STATUS_OPTIONS = [
  { value: TODAS_SENTINEL, label: 'Todos' },
  { value: BUSINESS_STATUS.VENTA_EFECTUADA, label: 'Venta efectuada' },
  { value: BUSINESS_STATUS.EMITIDO,         label: 'Emitido' },
  { value: BUSINESS_STATUS.FONDEADO,        label: 'Fondeado' },
  { value: BUSINESS_STATUS.CANCELADO,       label: 'Cancelado' },
]

const PLAZO_OPTIONS = [
  { value: TODAS_SENTINEL, label: 'Todos' },
  { value: '1', label: '1 año' },
  { value: '2', label: '2 años' },
  { value: '3', label: '3 años' },
  { value: '5', label: '5 años' },
  { value: '10', label: '10 años' },
  { value: '15', label: '15 años' },
  { value: '20', label: '20 años' },
]


// ─── DashboardFilterPanel ────────────────────────────────────────────────────

export function DashboardFilterPanel() {
  const { draft, dispatch, isApplyEnabled, activeBadges } =
    useDashboardFilter()
  const { dispatch: hierarchyDispatch } = useHierarchySelection()
  const catalogState = useDashboardCatalogs()
  const { companies, products, categories, origins, periodicidades } =
    catalogState.status === 'success'
      ? catalogState.data
      : { companies: [], products: [], origins: [], categories: [], periodicidades: [] }

  const dateRangeError = !isDateRangeValid(draft.dateRange.start, draft.dateRange.end)
    ? 'La fecha de inicio debe ser anterior a la fecha fin'
    : undefined

  // ─── Catalog items mapped to { id, label } shape ─────────────────────────
  // All catalog items already use `id` (normalized by the catalogs endpoint)
  const companyItems  = companies.map((c) => ({ id: c.id,   label: c.name }))
  const categoryItems = categories.map((c) => ({ id: c.id,  label: c.name }))
  const originItems   = origins.map((o) => ({ id: o.id,     label: o.name }))

  // ─── Product cascade: only show products from selected companies ──────────
  const selectedCompanySet = new Set(draft.companyIds)
  const filteredProductItems =
    selectedCompanySet.size === 0
      ? products.map((p) => ({ id: p.id, label: p.name }))
      : products
          .filter((p) => selectedCompanySet.has(p.idCompany))
          .map((p) => ({ id: p.id, label: p.name }))

  const handleApply = () => {
    dispatch({ type: 'APPLY' })
  }

  const handleClear = () => {
    dispatch({ type: 'CLEAR' })
    hierarchyDispatch({ type: 'SELECT_ALL' })
  }

  return (
    <Card className="border border-border shadow-sm bg-card">
      <CardContent className="p-3 space-y-2">

        {/* Header */}
        <h3 className="text-xs font-semibold text-foreground leading-none">
          Filtros del reporte
        </h3>

        {/* Filter grid — Row 1: [Desde+Hasta col-span-2] + Estado + Categoría */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
            <MonthRangePicker
              value={draft.dateRange}
              onChange={(range) =>
                dispatch({ type: 'SET_DATE_RANGE', payload: range })
              }
              error={dateRangeError}
            />

            <SingleSelectFilter
              options={STATUS_OPTIONS}
              value={draft.statuses[0] ?? TODAS_SENTINEL}
              onChange={(v) => {
                if (v === TODAS_SENTINEL) {
                  dispatch({ type: 'SET_TODAS', field: 'statuses' })
                } else {
                  dispatch({ type: 'SET_STATUS', payload: v })
                }
              }}
              placeholder="Estado"
            />

            <MultiSelectFilter
              items={categoryItems}
              value={draft.categoryIds}
              onChange={(ids) => {
                if (ids.length === 0) {
                  dispatch({ type: 'SET_TODAS', field: 'categoryIds' })
                } else {
                  dispatch({ type: 'SET_CATEGORY_IDS', ids })
                }
              }}
              placeholder="Categoría"
              todasLabel="Todas"
            />
          </div>

          {/* Filter grid — Row 2: Compañía + Producto + Origen + Plazo + Periodicidad */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <MultiSelectFilter
              items={companyItems}
              value={draft.companyIds}
              onChange={(ids) => {
                if (ids.length === 0) {
                  dispatch({ type: 'SET_TODAS', field: 'companyIds' })
                } else {
                  dispatch({
                    type: 'SET_COMPANY_IDS',
                    ids,
                    allProducts: products.map((p) => ({ idProduct: p.id, idCompany: p.idCompany })),
                  })
                }
              }}
              placeholder="Compañía"
              todasLabel="Todas"
              searchable
            />

            <MultiSelectFilter
              items={filteredProductItems}
              value={draft.productIds}
              onChange={(ids) => {
                if (ids.length === 0) {
                  dispatch({ type: 'SET_TODAS', field: 'productIds' })
                } else {
                  dispatch({ type: 'SET_PRODUCT_IDS', ids })
                }
              }}
              placeholder="Producto"
              todasLabel="Todos"
              searchable
            />

            <MultiSelectFilter
              items={originItems}
              value={draft.originIds}
              onChange={(ids) => {
                if (ids.length === 0) {
                  dispatch({ type: 'SET_TODAS', field: 'originIds' })
                } else {
                  dispatch({ type: 'SET_ORIGIN_IDS', ids })
                }
              }}
              placeholder="Origen"
              todasLabel="Todas"
            />

            <SingleSelectFilter
              options={PLAZO_OPTIONS}
              value={draft.plazos[0] ? String(draft.plazos[0]) : TODAS_SENTINEL}
              onChange={(v) => {
                if (v === TODAS_SENTINEL) {
                  dispatch({ type: 'SET_TODAS', field: 'plazos' })
                } else {
                  dispatch({ type: 'SET_PLAZO', payload: Number(v) })
                }
              }}
              placeholder="Plazo (Años)"
            />

            <SingleSelectFilter
              options={[
                { value: TODAS_SENTINEL, label: 'Todas' },
                ...periodicidades.map((p) => ({ value: p.name, label: p.name })),
              ]}
              value={draft.periodicidades[0] ?? TODAS_SENTINEL}
              onChange={(v) => {
                if (v === TODAS_SENTINEL) {
                  dispatch({ type: 'SET_TODAS', field: 'periodicidades' })
                } else {
                  dispatch({ type: 'SET_PERIODICIDAD', payload: v })
                }
              }}
              placeholder="Periodicidad"
            />
          </div>
        </div>

        <Separator />

        {/* Footer: active badges + action buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">

          <ActiveFilterBadges badges={activeBadges} />

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleClear}
            >
              Limpiar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isApplyEnabled}
              className="h-7 px-4 text-xs bg-green-600 hover:bg-green-700 active:bg-green-800 text-white dark:bg-green-600 dark:hover:bg-green-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleApply}
            >
              Aplicar
            </Button>
          </div>

        </div>
      </CardContent>
    </Card>
  )
}
