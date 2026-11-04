import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		businessSupport: { create: vi.fn() },
		user: { findMany: vi.fn() },
		notification: { create: vi.fn() },
	},
}))

vi.mock('../lib/spaces-client', () => ({
	presignPutUrl: vi.fn(),
	presignGetUrl: vi.fn().mockResolvedValue('https://example.com/view'),
	getSpacesConfig: vi.fn().mockReturnValue({
		prefix: 'prod',
		bucket: 'b',
		endpoint: 'https://e',
		key: 'k',
		secret: 's',
	}),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	logAuditEvent: vi.fn(),
	AuditAction: { COMPROBANTE_UPLOADED: 'COMPROBANTE_UPLOADED' },
}))

const mockSendNotification = vi.fn().mockResolvedValue(undefined)
vi.mock(
	'@/features/shared/services/notifications/sse-notification-provider',
	() => ({
		notificationProvider: { sendNotification: mockSendNotification },
	})
)

import { prisma } from '@/lib/prisma'
import { persistComprobante } from '../services/business-supports.service'

const mockPrisma = prisma as unknown as {
	businessSupport: { create: ReturnType<typeof vi.fn> }
	user: { findMany: ReturnType<typeof vi.fn> }
	notification: { create: ReturnType<typeof vi.fn> }
}

const CTX = {
	userId: 77,
	email: 'u@test.com',
	ipAddress: '127.0.0.1',
	userAgent: 'vitest',
}
const INPUT = {
	key: 'prod/negocios/10/a.pdf',
	mime: 'application/pdf',
	size: 1024,
}

function supportRow(ownerName: string) {
	return {
		id: 's1',
		businessId: 10,
		objectKey: INPUT.key,
		mimeType: INPUT.mime,
		sizeBytes: 1024,
		uploadedBy: 77,
		status: true,
		createdAt: new Date('2026-07-01T12:00:00Z'),
		uploader: { idUser: 77, name: 'Uploader' },
		business: { contract: 'CTR-001', user: { name: ownerName } },
	}
}

describe('persistComprobante notifications (BS-02 parity)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockPrisma.user.findMany.mockResolvedValue([{ idUser: 2 }, { idUser: 3 }])
		mockPrisma.notification.create.mockImplementation(
			async ({ data }: { data: { idUser: number } }) => ({
				idNotification: data.idUser,
				...data,
			})
		)
	})

	it('notifies the support audience for a business owned by a partner exactly as for an agent', async () => {
		mockPrisma.businessSupport.create.mockResolvedValueOnce(
			supportRow('Pat Partner')
		)
		await persistComprobante(10, INPUT, CTX)
		const partnerCalls = mockPrisma.notification.create.mock.calls.map(
			(c) => c[0].data
		)

		vi.clearAllMocks()
		mockPrisma.user.findMany.mockResolvedValue([{ idUser: 2 }, { idUser: 3 }])
		mockPrisma.notification.create.mockImplementation(
			async ({ data }: { data: { idUser: number } }) => ({
				idNotification: data.idUser,
				...data,
			})
		)
		mockPrisma.businessSupport.create.mockResolvedValueOnce(
			supportRow('Ana Agente')
		)
		await persistComprobante(10, INPUT, CTX)
		const agentCalls = mockPrisma.notification.create.mock.calls.map(
			(c) => c[0].data
		)

		expect(partnerCalls).toHaveLength(2)
		expect(partnerCalls.map((d) => d.idUser)).toEqual(
			agentCalls.map((d) => d.idUser)
		)
		expect(partnerCalls.map((d) => d.title)).toEqual(
			agentCalls.map((d) => d.title)
		)
		expect(partnerCalls.map((d) => d.callbackUrl)).toEqual(
			agentCalls.map((d) => d.callbackUrl)
		)
		expect(partnerCalls[0].message).toBe(
			'Se ha subido un soporte para el contrato CTR-001 (Agente: Pat Partner)'
		)
	})

	it('targets only ADMIN, ANALISTA_SOPORTE and ASISTENTE_GERENCIA_OPERATIVA, independent of the uploader role', async () => {
		mockPrisma.businessSupport.create.mockResolvedValueOnce(
			supportRow('Pat Partner')
		)

		await persistComprobante(10, INPUT, CTX)

		expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
			where: {
				role: {
					code: {
						in: ['ADMIN', 'ANALISTA_SOPORTE', 'ASISTENTE_GERENCIA_OPERATIVA'],
					},
				},
				active: true,
			},
			select: { idUser: true },
		})
		expect(mockSendNotification).toHaveBeenCalledTimes(2)
	})
})
