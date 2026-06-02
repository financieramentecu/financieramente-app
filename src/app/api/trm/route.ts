/**
 * API Route: GET /api/trm
 * Generic BFF proxy for co.dolarapi.com/v1/trm.
 * Reusable across the app — not coupled to any single feature.
 * Enforces a 5-second server-side timeout; eliminates CORS issues.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { TrmResponse } from '@/features/production-dashboard/types/trm.types'

const DOLAR_API_URL = 'https://co.dolarapi.com/v1/trm'
const TIMEOUT_MS = 5_000

export interface TrmApiData extends TrmResponse {
  fetchedAt: string
}

export async function GET(): Promise<NextResponse<ApiResponse<TrmApiData>>> {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let upstream: Response
    try {
      upstream = await fetch(DOLAR_API_URL, { signal: controller.signal })
    } catch {
      return NextResponse.json(
        { data: null, error: 'No fue posible consultar la TRM automáticamente' },
        { status: 502 }
      )
    } finally {
      clearTimeout(timeout)
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { data: null, error: 'Servicio TRM no disponible' },
        { status: 502 }
      )
    }

    const payload = (await upstream.json()) as TrmResponse

    return NextResponse.json({
      data: {
        ...payload,
        fetchedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error en proxy TRM:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
