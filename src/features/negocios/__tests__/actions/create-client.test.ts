import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/features/negocios/actions/create-client'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/auth/require-write-access'
import { logAuditEvent } from '@/features/auth/lib/audit-logger'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		client: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
		documentType: {
			findFirst: vi.fn(),
		},
	},
}))

vi.mock('@/lib/auth/require-write-access', () => ({
	requireWriteAccess: vi.fn(),
}))

vi.mock('next/headers', () => ({
	headers: vi.fn(async () => new Headers()),
}))

vi.mock('@/features/auth/lib/audit-logger', () => ({
	AuditAction: { CLIENT_CREATED: 'CLIENT_CREATED' },
	getClientIp: vi.fn(() => '127.0.0.1'),
	getUserAgent: vi.fn(() => 'test'),
	logAuditEvent: vi.fn(),
}))

const basePayload = {
	name: 'Ana',
	lastName: 'Pérez',
	typeIdentity: 'CC',
	identityNumber: '1234567890',
	country: 'Colombia',
}

describe('createClient', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(requireWriteAccess).mockResolvedValue({
			ok: true,
			session: { user: { id: '5', email: 'agent@test.com' } },
		} as never)
		vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			idDocumentType: 1,
			name: 'Cédula de Ciudadanía',
			code: 'CC',
			dataType: 'NUMERIC',
			minLength: 6,
			maxLength: 10,
			status: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never)
		vi.mocked(prisma.client.create).mockResolvedValue({
			idClient: 1,
			...basePayload,
			email: null,
			phone: null,
			direcction: null,
			city: null,
			country: 'Colombia',
			status: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never)
	})

	it('returns rejected ApiResponse for CONSULTOR (read-only role)', async () => {
		vi.mocked(requireWriteAccess).mockResolvedValueOnce({
			ok: false,
			response: { status: 403 },
		} as never)

		const result = await createClient(basePayload)

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBeTruthy()
		expect(prisma.client.create).not.toHaveBeenCalled()
	})

	it('creates a client when the caller has write access', async () => {
		const result = await createClient(basePayload)

		expect(result.data?.idClient).toBe(1)
		expect(prisma.client.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				typeIdentity: 'CC',
				idDocumentType: 1,
				identityNumber: '1234567890',
			}),
		})
	})

	it('logs a CLIENT_CREATED audit event with the actor', async () => {
		await createClient(basePayload)

		expect(logAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 5,
				email: 'agent@test.com',
				action: 'CLIENT_CREATED',
				details: expect.stringContaining('1'),
			})
		)
	})

	it('does not log when the client already exists', async () => {
		vi.mocked(prisma.client.findUnique).mockResolvedValue({
			idClient: 99,
		} as never)

		await createClient(basePayload)

		expect(logAuditEvent).not.toHaveBeenCalled()
	})

	it('rejects a create without a document type', async () => {
		const result = await createClient({
			...basePayload,
			typeIdentity: ' ',
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(
			'El tipo de documento es obligatorio'
		)
		expect(prisma.client.create).not.toHaveBeenCalled()
	})

	it('rejects an unknown document type', async () => {
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue(null)

		const result = await createClient({
			...basePayload,
			typeIdentity: 'ZZ',
		})

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(
			'El tipo de documento no existe'
		)
		expect(prisma.client.create).not.toHaveBeenCalled()
	})

	it('rejects a duplicate identityNumber + typeIdentity', async () => {
		vi.mocked(prisma.client.findUnique).mockResolvedValue({
			idClient: 99,
		} as never)

		const result = await createClient(basePayload)

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(
			'Ya existe un cliente con este número de identificación'
		)
		expect(prisma.client.create).not.toHaveBeenCalled()
	})

	it('rejects an inactive document type', async () => {
		vi.mocked(prisma.documentType.findFirst).mockResolvedValue({
			idDocumentType: 1,
			name: 'Cédula de Ciudadanía',
			code: 'CC',
			dataType: 'NUMERIC',
			minLength: 6,
			maxLength: 10,
			status: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never)

		const result = await createClient(basePayload)

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe(
			'El tipo de documento no está disponible para nuevos registros'
		)
		expect(prisma.client.create).not.toHaveBeenCalled()
	})
})
