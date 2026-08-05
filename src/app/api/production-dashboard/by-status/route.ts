/**
 * API Route: GET /api/production-dashboard/by-status
 * Returns per-status negocio counts for the Status Donut chart.
 * Only VENTA_EFECTUADA, EMITIDO, FONDEADO statuses are returned.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBusinessesByStatusRaw } from '@/features/production-dashboard/services/by-status.service'
import {
  parseDashboardAppliedFilters,
  parseIds,
} from '@/features/production-dashboard/lib/parse-dashboard-applied-filters'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { StatusDonutRaw } from '@/features/production-dashboard/types/production-kpi.types'

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

    const appliedFilters = parseDashboardAppliedFilters(searchParams)

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
