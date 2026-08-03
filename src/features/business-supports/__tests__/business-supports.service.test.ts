import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ComprobanteError } from '../types/business-support.types'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    business: {
      findUnique: vi.fn(),
    },
    businessSupport: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock spaces-client
vi.mock('../lib/spaces-client', () => ({
  presignPutUrl: vi.fn(),
  presignGetUrl: vi.fn(),
  getSpacesConfig: vi.fn().mockReturnValue({ prefix: 'prod', bucket: 'test-bucket', endpoint: 'https://example.com', key: 'k', secret: 's' }),
}))

// Mock audit logger
vi.mock('@/features/auth/lib/audit-logger', () => ({
  logAuditEvent: vi.fn(),
  AuditAction: {
    COMPROBANTE_UPLOADED: 'COMPROBANTE_UPLOADED',
    COMPROBANTE_DEACTIVATED: 'COMPROBANTE_DEACTIVATED',
  },
}))

import { prisma } from '@/lib/prisma'
import { presignPutUrl, presignGetUrl } from '../lib/spaces-client'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'
import {
  listComprobantes,
  presignComprobanteUpload,
  persistComprobante,
  deactivateComprobante,
} from '../services/business-supports.service'

const mockPrisma = prisma as unknown as {
  business: { findUnique: ReturnType<typeof vi.fn> }
  businessSupport: {
    findMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

const mockPresignPutUrl = presignPutUrl as ReturnType<typeof vi.fn>
const mockPresignGetUrl = presignGetUrl as ReturnType<typeof vi.fn>
const mockLogAuditEvent = logAuditEvent as ReturnType<typeof vi.fn>

const CTX = {
  userId: 1,
  email: 'test@example.com',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
}

const ACTIVE_BUSINESS = {
  idBusiness: 10,
  contract: 'CTR-001',
  status: 'EMITIDO',
}

const SUPPORT_ROW = {
  id: 'supp-1',
  businessId: 10,
  objectKey: 'prod/negocios/CTR-001/comprobantes/CTR-001-123-abc.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  uploadedBy: 1,
  status: true,
  createdAt: new Date('2026-05-14T00:00:00Z'),
  updatedAt: new Date('2026-05-14T00:00:00Z'),
  uploader: { idUser: 1, name: 'John' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── listComprobantes ─────────────────────────────────────────────────────────

describe('listComprobantes', () => {
  it('returns DTOs with presigned view URLs', async () => {
    mockPrisma.businessSupport.findMany.mockResolvedValue([SUPPORT_ROW])
    mockPresignGetUrl.mockResolvedValue('https://view.example.com/url')

    const result = await listComprobantes(10)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('supp-1')
    expect(result[0].viewUrl).toBe('https://view.example.com/url')
    expect(result[0].uploadedBy.name).toBe('John')
  })

  it('returns empty array when no comprobantes', async () => {
    mockPrisma.businessSupport.findMany.mockResolvedValue([])
    const result = await listComprobantes(10)
    expect(result).toHaveLength(0)
  })
})

// ─── presignComprobanteUpload ─────────────────────────────────────────────────

describe('presignComprobanteUpload', () => {
  it('returns url and key on happy path', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(ACTIVE_BUSINESS)
    mockPresignPutUrl.mockResolvedValue('https://put.example.com/url')

    const result = await presignComprobanteUpload(10, 'image/jpeg', 1024, CTX)

    expect(result.url).toBe('https://put.example.com/url')
    expect(result.key).toContain('CTR-001')
  })

  it('throws NOT_FOUND when business does not exist', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(null)

    await expect(
      presignComprobanteUpload(99, 'image/jpeg', 1024, CTX),
    ).rejects.toThrow(ComprobanteError)

    await expect(
      presignComprobanteUpload(99, 'image/jpeg', 1024, CTX),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('throws INVALID_STATUS when business is PENDIENTE', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      ...ACTIVE_BUSINESS,
      status: 'PENDIENTE',
    })

    await expect(
      presignComprobanteUpload(10, 'image/jpeg', 1024, CTX),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS' })
  })

  it('succeeds for VENTA_EFECTUADA without contract using negocio-{id} key', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      ...ACTIVE_BUSINESS,
      status: 'VENTA_EFECTUADA',
      contract: null,
    })
    mockPresignPutUrl.mockResolvedValue('https://put.example.com/url')

    const result = await presignComprobanteUpload(10, 'image/jpeg', 1024, CTX)

    expect(result.url).toBe('https://put.example.com/url')
    expect(result.key).toContain('negocio-10')
  })

  it('throws INVALID_MIME for unsupported mime type', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(ACTIVE_BUSINESS)

    await expect(
      presignComprobanteUpload(10, 'application/msword', 1024, CTX),
    ).rejects.toMatchObject({ code: 'INVALID_MIME' })
  })

  it('succeeds for application/pdf', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(ACTIVE_BUSINESS)
    mockPresignPutUrl.mockResolvedValue('https://put.example.com/pdf-url')

    const result = await presignComprobanteUpload(10, 'application/pdf', 1024, CTX)

    expect(result.url).toBe('https://put.example.com/pdf-url')
    expect(result.key).toContain('CTR-001')
  })
})

// ─── persistComprobante ───────────────────────────────────────────────────────

describe('persistComprobante', () => {
  it('creates a record and calls logAuditEvent on happy path', async () => {
    mockPrisma.businessSupport.create.mockResolvedValue({
      ...SUPPORT_ROW,
      uploader: { idUser: 1, name: 'John' },
    })
    mockLogAuditEvent.mockResolvedValue(undefined)

    const result = await persistComprobante(
      10,
      { key: SUPPORT_ROW.objectKey, mime: 'image/jpeg', size: 1024 },
      CTX,
    )

    expect(result.id).toBe('supp-1')
    expect(mockLogAuditEvent).toHaveBeenCalledOnce()
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COMPROBANTE_UPLOADED' }),
    )
  })

  it('throws INVALID_MIME for unsupported mime type', async () => {
    await expect(
      persistComprobante(
        10,
        { key: 'path/file.docx', mime: 'application/msword', size: 1024 },
        CTX,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_MIME' })
  })

  it('succeeds for application/pdf', async () => {
    mockPrisma.businessSupport.create.mockResolvedValue({
      ...SUPPORT_ROW,
      objectKey: 'path/file.pdf',
      mimeType: 'application/pdf',
      uploader: { idUser: 1, name: 'John' },
    })
    mockLogAuditEvent.mockResolvedValue(undefined)

    const result = await persistComprobante(
      10,
      { key: 'path/file.pdf', mime: 'application/pdf', size: 1024 },
      CTX,
    )

    expect(result.mimeType).toBe('application/pdf')
    expect(mockLogAuditEvent).toHaveBeenCalledOnce()
  })
})

// ─── deactivateComprobante ────────────────────────────────────────────────────

describe('deactivateComprobante', () => {
  it('sets status false and calls logAuditEvent', async () => {
    mockPrisma.businessSupport.findUnique.mockResolvedValue(SUPPORT_ROW)
    mockPrisma.businessSupport.update.mockResolvedValue({
      ...SUPPORT_ROW,
      status: false,
    })
    mockLogAuditEvent.mockResolvedValue(undefined)

    await deactivateComprobante('supp-1', CTX)

    expect(mockPrisma.businessSupport.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'supp-1' },
        data: { status: false },
      }),
    )
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COMPROBANTE_DEACTIVATED' }),
    )
  })

  it('throws NOT_FOUND when support does not exist', async () => {
    mockPrisma.businessSupport.findUnique.mockResolvedValue(null)

    await expect(deactivateComprobante('missing', CTX)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
