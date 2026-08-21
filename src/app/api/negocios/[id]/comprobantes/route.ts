/**
 * API Route: /api/negocios/[id]/comprobantes
 * GET  — list active comprobantes for a negocio
 * POST — persist a record after direct client upload to Spaces
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { BusinessSupportDTO } from '@/features/business-supports/types/business-support.types'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'
import {
  listComprobantes,
  persistComprobante,
} from '@/features/business-supports/services/business-supports.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

const persistBodySchema = z.object({
  key: z.string().min(1),
  mime: z.string().min(1),
  size: z.number().int().positive(),
})

function comprobanteErrorToStatus(code: ComprobanteError['code']): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404
    case 'INVALID_STATUS':
    case 'INVALID_MIME':
    case 'FILE_TOO_LARGE':
      return 422
    default:
      return 500
  }
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<BusinessSupportDTO[]>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const businessId = parseInt(id, 10)

  try {
    const comprobantes = await listComprobantes(businessId)
    return NextResponse.json({ data: comprobantes })
  } catch (error) {
    if (error instanceof ComprobanteError) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: comprobanteErrorToStatus(error.code) },
      )
    }
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<BusinessSupportDTO>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const businessId = parseInt(id, 10)

  const rawBody = await request.json().catch(() => null)
  const parsed = persistBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { idUser: true, email: true },
  })
  if (!user) {
    return NextResponse.json({ data: null, error: 'User not found' }, { status: 401 })
  }

  const headers = request.headers
  const ctx = {
    userId: user.idUser,
    email: user.email,
    ipAddress: getClientIp(headers),
    userAgent: getUserAgent(headers),
  }

  try {
    const dto = await persistComprobante(businessId, parsed.data, ctx)
    return NextResponse.json({ data: dto }, { status: 201 })
  } catch (error) {
    if (error instanceof ComprobanteError) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: comprobanteErrorToStatus(error.code) },
      )
    }
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
