/**
 * API Route: GET /api/production-dashboard/heatmap
 * Returns per-user, per-company production heatmap data.
 * Server-side scope resolution ensures role-based visibility.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { getHeatmapRaw, resolveViewerScope } from '@/features/production-dashboard/services/heatmap.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { HeatmapRaw } from '@/features/production-dashboard/types/production-kpi.types'
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

/** Build DashboardAppliedFilters from URL search params — mirrors ms-chart/route.ts */
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
    // isInternacional is accepted in the query string but ALWAYS discarded here
    isInternacional: false,
  }
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<HeatmapRaw[]>>> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
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

    const callerUserIds = parseIds(rawUserIds)
    if (callerUserIds === null) {
      return NextResponse.json(
        { data: null, error: 'El parámetro userIds contiene valores inválidos' },
        { status: 400 }
      )
    }

    if (callerUserIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // Resolve viewer identity for server-side scope enforcement
    const viewer = await getCurrentUserByEmail(session.user.email)
    if (!viewer) {
      return NextResponse.json(
        { data: null, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Server-side scope: determines which users the viewer can see
    const viewerScope = await resolveViewerScope(
      viewer.idUser,
      viewer.role?.code,
      viewer.level?.code
    )

    // Intersect caller's requested userIds with the viewer's allowed scope
    const scopeSet = new Set(viewerScope)
    const effectiveUserIds = callerUserIds.filter((id) => scopeSet.has(id))

    if (effectiveUserIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const appliedFilters = buildFiltersFromSearchParams(searchParams)

    const result = await getHeatmapRaw({ userIds: effectiveUserIds, appliedFilters })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error al obtener datos de heatmap:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
