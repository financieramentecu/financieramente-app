/**
 * API Route: /api/negocios/[id]/comments
 * GET  — list comments for a negocio, chronological (oldest -> newest)
 * POST — create a comment; persists + audits + fans out notifications
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { CommentDTO } from '@/features/comments/types/comment.types'
import { CommentError } from '@/features/comments/types/comment.types'
import { createCommentSchema } from '@/features/comments/schemas/comment.schema'
import {
  createComment,
  getCommentsByBusinessId,
} from '@/features/comments/services/comments.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

function commentErrorToStatus(code: CommentError['code']): number {
  switch (code) {
    case 'NOT_FOUND':
      return 404
    case 'INVALID_ROLE':
      return 422
    default:
      return 500
  }
}

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<CommentDTO[]>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const businessId = parseInt(id, 10)

  try {
    const comments = await getCommentsByBusinessId(businessId)
    return NextResponse.json({ data: comments })
  } catch (error) {
    if (error instanceof CommentError) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: commentErrorToStatus(error.code) },
      )
    }
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<CommentDTO>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const businessId = parseInt(id, 10)

  const rawBody = await request.json().catch(() => null)
  const parsed = createCommentSchema.safeParse(rawBody)
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
    const dto = await createComment(businessId, parsed.data, ctx)
    return NextResponse.json({ data: dto }, { status: 201 })
  } catch (error) {
    if (error instanceof CommentError) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: commentErrorToStatus(error.code) },
      )
    }
    return NextResponse.json({ data: null, error: 'Internal server error' }, { status: 500 })
  }
}
