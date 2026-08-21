/**
 * API Route: GET /api/production-dashboard/kpis
 * Returns production KPI aggregation scoped by selectedUserIds + appliedFilters.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getProductionKpiRaw } from '@/features/production-dashboard/services/production-kpi.service'
import {
  parseDashboardAppliedFilters,
  parseIds,
} from '@/features/production-dashboard/lib/parse-dashboard-applied-filters'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ProductionKpiRaw } from '@/features/production-dashboard/types/production-kpi.types'

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

    const appliedFilters = parseDashboardAppliedFilters(searchParams)

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
