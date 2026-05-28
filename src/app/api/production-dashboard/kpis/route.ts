/**
 * API Route: GET /api/production-dashboard/kpis
 * Returns production KPI aggregation scoped by selectedUserIds + appliedFilters.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getProductionKpiRaw } from '@/features/production-dashboard/services/production-kpi.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ProductionKpiRaw } from '@/features/production-dashboard/types/production-kpi.types'
import type { DashboardAppliedFilters } from '@/features/production-dashboard/types/dashboard-filter.types'

/** Parse a comma-separated string of integers; returns null on invalid input */
function parseIds(raw: string | null): number[] | null {
  if (raw === null) return null
  if (raw.trim() === '') return []
  const parts = raw.split(',').map((s) => s.trim())
  const ids = parts.map(Number)
  if (ids.some((n) => !Number.isInteger(n) || isNaN(n))) return null
  return ids
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<ProductionKpiRaw>>> {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)

    // userIds is required (empty string is valid → empty array → returns zeros)
    const rawUserIds = searchParams.get('userIds')
    if (rawUserIds === null) {
      return NextResponse.json(
        { data: null, error: 'El parámetro userIds es requerido' },
        { status: 400 }
      )
    }

    const userIds = parseIds(rawUserIds)
    if (userIds === null) {
      return NextResponse.json(
        { data: null, error: 'El parámetro userIds contiene valores inválidos' },
        { status: 400 }
      )
    }

    // Short-circuit: empty userIds → zeros without querying DB
    if (userIds.length === 0) {
      return NextResponse.json({
        data: {
          totalCop: 0,
          totalForeignUsd: 0,
          nationalCount: 0,
          foreignCount: 0,
        },
      })
    }

    // Parse optional filters
    const rawStatuses = searchParams.get('statuses')
    const statuses = rawStatuses ? rawStatuses.split(',').map((s) => s.trim()).filter(Boolean) : []
    const rawPeriodicidades = searchParams.get('periodicidades')
    const periodicidades = rawPeriodicidades ? rawPeriodicidades.split(',').map((s) => s.trim()).filter(Boolean) : []
    const categoryIds = parseIds(searchParams.get('categoryIds')) ?? []
    const productIds = parseIds(searchParams.get('productIds')) ?? []
    const companyIds = parseIds(searchParams.get('companyIds')) ?? []
    const originIds = parseIds(searchParams.get('originIds')) ?? []
    const plazos = parseIds(searchParams.get('plazos')) ?? []

    const rawDateFrom = searchParams.get('dateFrom')
    const rawDateTo = searchParams.get('dateTo')

    const dateRange = {
      start: rawDateFrom ? new Date(rawDateFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: rawDateTo ? new Date(rawDateTo) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    }

    const appliedFilters: DashboardAppliedFilters = {
      dateRange,
      statuses,
      categoryIds,
      companyIds,
      productIds,
      originIds,
      plazos,
      periodicidades,
      isInternacional: false,
    }

    const result = await getProductionKpiRaw({ userIds, appliedFilters })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error al obtener KPIs de producción:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
