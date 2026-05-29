/**
 * API Route: GET /api/production-dashboard/by-status
 * Returns per-status negocio counts for the Status Donut chart.
 * Only VENTA_EFECTUADA, EMITIDO, FONDEADO statuses are returned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBusinessesByStatusRaw } from '@/features/production-dashboard/services/by-status.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { StatusDonutRaw } from '@/features/production-dashboard/types/production-kpi.types'
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

/** Build DashboardAppliedFilters from URL search params — mirrors by-company/route.ts */
function buildFiltersFromSearchParams(searchParams: URLSearchParams): DashboardAppliedFilters {
  const rawStatuses = searchParams.get('statuses')
  const statuses = rawStatuses ? rawStatuses.split(',').map((s) => s.trim()).filter(Boolean) : []
  const rawPeriodicidades = searchParams.get('periodicidades')
  const periodicidades = rawPeriodicidades
    ? rawPeriodicidades.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const categoryIds = parseIds(searchParams.get('categoryIds')) ?? []
  const productIds = parseIds(searchParams.get('productIds')) ?? []
  const companyIds = parseIds(searchParams.get('companyIds')) ?? []
  const originIds = parseIds(searchParams.get('originIds')) ?? []
  const plazos = parseIds(searchParams.get('plazos')) ?? []

  const rawDateFrom = searchParams.get('dateFrom')
  const rawDateTo = searchParams.get('dateTo')

  const dateRange = {
    start: rawDateFrom
      ? new Date(rawDateFrom)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: rawDateTo
      ? new Date(rawDateTo)
      : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  }

  return {
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
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<StatusDonutRaw[]>>> {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = req.nextUrl

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

    if (userIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const appliedFilters = buildFiltersFromSearchParams(searchParams)

    const result = await getBusinessesByStatusRaw({ userIds, appliedFilters })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error al obtener distribución por estado:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
