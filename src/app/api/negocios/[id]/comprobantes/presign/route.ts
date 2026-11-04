/**
 * API Route: /api/negocios/[id]/comprobantes/presign
 * POST — generate a presigned PUT URL for direct client upload to Spaces
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { isReadOnlyRole } from '@/features/auth/lib/roles'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { PresignResponse } from '@/features/business-supports/types/business-support.types'
import { ComprobanteError } from '@/features/business-supports/types/business-support.types'
import { assertBusinessAccess } from '@/features/negocios/services/business-access.service'
import { businessAccessDeniedResponse } from '@/features/negocios/lib/business-access-http'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { presignComprobanteUpload } from '@/features/business-supports/services/business-supports.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

const presignBodySchema = z.object({
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

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<PresignResponse>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }
  if (isReadOnlyRole(session.user.role)) {
    return NextResponse.json({ data: null, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const businessId = parseInt(id, 10)
  if (Number.isNaN(businessId)) {
    return NextResponse.json({ data: null, error: 'Invalid business id' }, { status: 422 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = presignBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 422 },
    )
  }

  const user = await getCurrentUserByEmail(session.user.email ?? '')
  if (!user) {
    return NextResponse.json({ data: null, error: 'User not found' }, { status: 401 })
  }
  const access = await assertBusinessAccess({
    user,
    businessId,
    mode: 'write',
  })
  if (!access.ok) {
    return businessAccessDeniedResponse(access.reason)
  }

  const headers = request.headers
  const ctx = {
    userId: user.idUser,
    email: user.email,
    ipAddress: getClientIp(headers),
    userAgent: getUserAgent(headers),
  }

  try {
    const result = await presignComprobanteUpload(
      businessId,
      parsed.data.mime,
      parsed.data.size,
      ctx,
    )
    return NextResponse.json({ data: result })
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
