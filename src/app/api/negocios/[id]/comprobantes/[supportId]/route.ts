/**
 * API Route: /api/negocios/[id]/comprobantes/[supportId]
 * DELETE — soft-delete a comprobante (sets status = false)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'
import { deactivateComprobante } from '@/features/business-supports/services/business-supports.service'

interface RouteParams {
  params: Promise<{ id: string; supportId: string }>
}

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

export async function DELETE(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<{ success: true }>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { supportId } = await params

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
    await deactivateComprobante(supportId, ctx)
    return NextResponse.json({ data: { success: true } })
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
