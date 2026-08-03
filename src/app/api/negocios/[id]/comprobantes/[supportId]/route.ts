/**
 * API Route: /api/negocios/[id]/comprobantes/[supportId]
 * DELETE — soft-delete a comprobante (sets status = false)
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import { canDeleteBusinessComprobante, UserRole } from '@/features/auth/lib/roles'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'
import { deactivateComprobante } from '@/features/business-supports/services/business-supports.service'
import { resolveVisibleUserIds } from '@/features/negocios/services/user-hierarchy.service'

interface RouteParams {
  params: Promise<{ id: string; supportId: string }>
}

function comprobanteErrorToStatus(code: ComprobanteError['code']): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404
    case 'FORBIDDEN':
      return 403
    case 'INVALID_STATUS':
    case 'NO_CONTRACT':
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

  const { id, supportId } = await params
  const businessId = parseInt(id, 10)
  if (Number.isNaN(businessId)) {
    return NextResponse.json({ data: null, error: 'Invalid business id' }, { status: 422 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      idUser: true,
      email: true,
      role: { select: { code: true } },
    },
  })
  if (!user) {
    return NextResponse.json({ data: null, error: 'User not found' }, { status: 401 })
  }

  const roleCode = user.role?.code
  if (!canDeleteBusinessComprobante(roleCode)) {
    return NextResponse.json(
      { data: null, error: 'No tiene permiso para eliminar comprobantes' },
      { status: 403 },
    )
  }

  const headers = request.headers
  const ctx = {
    userId: user.idUser,
    email: user.email,
    ipAddress: getClientIp(headers),
    userAgent: getUserAgent(headers),
  }

  try {
    const visibleUserIds =
      roleCode === UserRole.AGENTE
        ? await resolveVisibleUserIds(prisma, {
            idUser: user.idUser,
            role: user.role,
          })
        : undefined

    await deactivateComprobante(supportId, ctx, {
      businessId,
      visibleUserIds,
    })
    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    if (error instanceof ComprobanteError) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: comprobanteErrorToStatus(error.code) },
      )
    }
    return NextResponse.json(
      {
        data: null,
        error: 'No se pudo eliminar el comprobante. Intente nuevamente.',
      },
      { status: 500 },
    )
  }
}
