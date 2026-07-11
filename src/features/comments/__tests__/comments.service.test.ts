import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommentError } from '../types/comment.types'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    comment: { create: vi.fn(), findMany: vi.fn() },
    notification: { createMany: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('@/features/auth/lib/audit-logger', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/lib/audit-logger')>(
    '@/features/auth/lib/audit-logger',
  )
  return {
    ...actual,
    logAuditEvent: vi.fn(),
  }
})

const mockSendNotification = vi.fn().mockResolvedValue(undefined)
const mockSseSend = vi.fn()
vi.mock('@/features/shared/services/notifications/sse-notification-provider', () => ({
  notificationProvider: { sendNotification: mockSendNotification },
}))
vi.mock('@/features/shared/services/notifications/sse-store', () => ({
  sseStore: { send: mockSseSend },
}))

import { prisma } from '@/lib/prisma'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import { createComment, getCommentsByBusinessId } from '../services/comments.service'

const mockPrisma = prisma as unknown as {
  business: { findUnique: ReturnType<typeof vi.fn> }
  user: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  comment: { create: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
  notification: { createMany: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> }
}
const mockLogAuditEvent = logAuditEvent as ReturnType<typeof vi.fn>

const CTX = { userId: 1, email: 'author@example.com' }

const BUSINESS = { idBusiness: 10, contract: 'CTR-001', idUser: 99 }

function commentRow(overrides: Partial<{ author: { idUser: number; name: string; role: { code: string } | null } }> = {}) {
  return {
    id: 'comment-1',
    businessId: 10,
    title: 'Seguimiento',
    detail: 'Falta el comprobante',
    createdAt: new Date('2026-07-01T12:00:00Z'),
    author: { idUser: 1, name: 'Ana Agente', role: { code: 'AGENTE' } },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.notification.createMany.mockResolvedValue({ count: 0 })
  mockPrisma.notification.findMany.mockResolvedValue([])
})

describe('createComment', () => {
  it('throws NOT_FOUND when the business does not exist', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(null)

    await expect(
      createComment(99, { title: 'a', detail: 'b' }, CTX),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(CommentError).toBeDefined()
  })

  it('persists the comment and writes a COMMENT_CREATED audit log', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(BUSINESS)
    mockPrisma.user.findUnique.mockResolvedValue({ idUser: 1, role: { code: 'AGENTE' } })
    mockPrisma.comment.create.mockResolvedValue(commentRow())

    const result = await createComment(10, { title: 'Seguimiento', detail: 'Falta el comprobante' }, CTX)

    expect(result.id).toBe('comment-1')
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COMMENT_CREATED' }),
    )
  })

  it('routes AGENTE author comments to all active ANALISTA_SOPORTE users, excluding self', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(BUSINESS)
    mockPrisma.user.findUnique.mockResolvedValue({ idUser: 1, role: { code: 'AGENTE' } })
    mockPrisma.comment.create.mockResolvedValue(commentRow())
    mockPrisma.user.findMany.mockResolvedValue([{ idUser: 2 }, { idUser: 3 }, { idUser: 1 }])
    mockPrisma.notification.findMany.mockResolvedValue([
      { idUser: 2, idNotification: 100 },
      { idUser: 3, idNotification: 101 },
    ])

    await createComment(10, { title: 'Seguimiento', detail: 'Falta el comprobante' }, CTX)

    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ idUser: 2 }),
          expect.objectContaining({ idUser: 3 }),
        ]),
      }),
    )
    const createManyArg = mockPrisma.notification.createMany.mock.calls[0][0]
    expect(createManyArg.data).toHaveLength(2)
    expect(mockSendNotification).toHaveBeenCalledTimes(2)
    expect(mockSseSend).toHaveBeenCalledTimes(2)
  })

  it('routes ANALISTA_SOPORTE author comments to the assigned Money Strategist only', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(BUSINESS)
    mockPrisma.user.findUnique.mockResolvedValue({ idUser: 5, role: { code: 'ANALISTA_SOPORTE' } })
    mockPrisma.comment.create.mockResolvedValue(
      commentRow({ author: { idUser: 5, name: 'Beto Analista', role: { code: 'ANALISTA_SOPORTE' } } }),
    )
    mockPrisma.notification.findMany.mockResolvedValue([{ idUser: 99, idNotification: 200 }])

    await createComment(10, { title: 'Seguimiento', detail: 'Falta el comprobante' }, { ...CTX, userId: 5 })

    const createManyArg = mockPrisma.notification.createMany.mock.calls[0][0]
    expect(createManyArg.data).toHaveLength(1)
    expect(createManyArg.data[0]).toMatchObject({ idUser: 99 })
  })

  it('skips notification when Business.idUser is null (defensive guard)', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ ...BUSINESS, idUser: null })
    mockPrisma.user.findUnique.mockResolvedValue({ idUser: 5, role: { code: 'ANALISTA_SOPORTE' } })
    mockPrisma.comment.create.mockResolvedValue(commentRow())

    const result = await createComment(10, { title: 'a', detail: 'b' }, { ...CTX, userId: 5 })

    expect(result.id).toBe('comment-1')
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
  })

  it('resolves an empty fan-out when there are no active analysts', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(BUSINESS)
    mockPrisma.user.findUnique.mockResolvedValue({ idUser: 1, role: { code: 'AGENTE' } })
    mockPrisma.comment.create.mockResolvedValue(commentRow())
    mockPrisma.user.findMany.mockResolvedValue([])

    const result = await createComment(10, { title: 'a', detail: 'b' }, CTX)

    expect(result.id).toBe('comment-1')
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
  })

  it('does not block the write when notification fan-out fails', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(BUSINESS)
    mockPrisma.user.findUnique.mockResolvedValue({ idUser: 1, role: { code: 'AGENTE' } })
    mockPrisma.comment.create.mockResolvedValue(commentRow())
    mockPrisma.user.findMany.mockRejectedValue(new Error('db down'))

    const result = await createComment(10, { title: 'a', detail: 'b' }, CTX)

    expect(result.id).toBe('comment-1')
  })
})

describe('getCommentsByBusinessId', () => {
  it('returns comments ordered oldest to newest', async () => {
    mockPrisma.comment.findMany.mockResolvedValue([commentRow()])

    const result = await getCommentsByBusinessId(10)

    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    )
    expect(result).toHaveLength(1)
  })
})
