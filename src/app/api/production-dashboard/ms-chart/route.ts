/**
 * API Route: GET /api/production-dashboard/ms-chart
 * Returns per-user, per-currency production aggregation for MS bar chart.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getMsChartRaw } from '@/features/production-dashboard/services/ms-chart.service'
import {
  parseDashboardAppliedFilters,
  parseIds,
} from '@/features/production-dashboard/lib/parse-dashboard-applied-filters'
import { scopeUserIdsToSession } from '@/features/production-dashboard/lib/scope-user-ids'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { MsKpiRaw } from '@/features/production-dashboard/types/production-kpi.types'

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiResponse<MsKpiRaw[]>>> {
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

    const requestedUserIds = parseIds(rawUserIds)
    if (requestedUserIds === null) {
      return NextResponse.json(
        { data: null, error: 'El parámetro userIds contiene valores inválidos' },
        { status: 400 }
      )
    }

    // PARTNER sessions are pinned to their own businesses (PD-01, PA-07)
    const userIds = scopeUserIdsToSession(session, requestedUserIds)

    if (userIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const appliedFilters = parseDashboardAppliedFilters(searchParams)

    const result = await getMsChartRaw({ userIds, appliedFilters })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Error al obtener producción por MS:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
