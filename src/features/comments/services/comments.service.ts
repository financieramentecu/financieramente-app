import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { UserRole } from '@/features/auth/lib/roles'
import { toCommentDTO, type CommentWithAuthor } from '../mappers/comment.mapper'
import { CommentError, type CommentDTO, type CreateCommentInput, type RequestContext } from '../types/comment.types'

const AUTHOR_INCLUDE = {
  author: {
    select: {
      idUser: true,
      name: true,
      role: { select: { code: true } },
    },
  },
} as const

/**
 * Resolve which users should be notified for a newly created comment.
 * - Author AGENTE (Money Strategist) -> broadcast to all active ANALISTA_SOPORTE users.
 * - Author ANALISTA_SOPORTE -> notify the contract's assigned Money Strategist (`Business.idUser`).
 * - Always exclude the author (no self-notify).
 * - Defensive: missing `businessOwnerId` or no active analysts both resolve to an empty list.
 */
async function resolveRecipients(
  authorRole: UserRole | undefined,
  authorId: number,
  businessOwnerId: number | null,
): Promise<number[]> {
  if (authorRole === UserRole.AGENTE) {
    const analysts = await prisma.user.findMany({
      where: { role: { code: UserRole.ANALISTA_SOPORTE }, active: true },
      select: { idUser: true },
    })
    return analysts.map((u) => u.idUser).filter((id) => id !== authorId)
  }

  if (authorRole === UserRole.ANALISTA_SOPORTE) {
    if (businessOwnerId == null || businessOwnerId === authorId) return []
    return [businessOwnerId]
  }

  return []
}

/** Persist a new comment, log the audit event, then fan out notifications (best-effort). */
export async function createComment(
  businessId: number,
  input: CreateCommentInput,
  ctx: RequestContext,
): Promise<CommentDTO> {
  const business = await prisma.business.findUnique({
    where: { idBusiness: businessId },
    select: { idBusiness: true, contract: true, idUser: true },
  })

  if (!business) {
    throw new CommentError('NOT_FOUND', `Negocio ${businessId} not found`)
  }

  const author = await prisma.user.findUnique({
    where: { idUser: ctx.userId },
    select: { idUser: true, role: { select: { code: true } } },
  })

  const row = await prisma.comment.create({
    data: {
      businessId,
      authorId: ctx.userId,
      title: input.title,
      detail: input.detail,
    },
    include: AUTHOR_INCLUDE,
  })

  await logAuditEvent({
    userId: ctx.userId,
    email: ctx.email,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    action: AuditAction.COMMENT_CREATED,
    details: `Comment created for negocio ${businessId}: ${row.id}`,
  })

  try {
    const authorRole = author?.role?.code as UserRole | undefined
    const recipients = await resolveRecipients(authorRole, ctx.userId, business.idUser)

    if (recipients.length > 0) {
      const title = `Nuevo comentario en contrato ${business.contract ?? businessId}`
      const message = `${input.title} - ${row.author.name}`
      const callbackUrl = `/dashboard/negocios/${businessId}?openComments=true`

      await prisma.notification.createMany({
        data: recipients.map((idUser) => ({ idUser, title, message, callbackUrl })),
      })

      const createdNotifications = await prisma.notification.findMany({
        where: { idUser: { in: recipients }, title, message },
        orderBy: { createdAt: 'desc' },
        take: recipients.length,
      })

      const { notificationProvider } = await import(
        '@/features/shared/services/notifications/sse-notification-provider'
      )
      const { sseStore } = await import('@/features/shared/services/notifications/sse-store')
      const dto = toCommentDTO(row as CommentWithAuthor)

      for (const n of createdNotifications) {
        await notificationProvider.sendNotification(n.idUser, n).catch((err) => {
          console.error('Error in sendNotification for comment:', err)
        })
        sseStore.send(n.idUser, 'comment-added', dto)
      }
    }
  } catch (error) {
    console.error('Error creating notifications for new comment:', error)
  }

  return toCommentDTO(row as CommentWithAuthor)
}

/** List all comments for a negocio, ordered chronologically (oldest -> newest) */
export async function getCommentsByBusinessId(businessId: number): Promise<CommentDTO[]> {
  const rows = await prisma.comment.findMany({
    where: { businessId, status: true },
    orderBy: { createdAt: 'asc' },
    include: AUTHOR_INCLUDE,
  })

  return rows.map((row) => toCommentDTO(row as CommentWithAuthor))
}
