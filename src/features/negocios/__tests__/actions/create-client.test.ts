import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/features/negocios/actions/create-client'
import { prisma } from '@/lib/prisma'
import { requireWriteAccess } from '@/lib/auth/require-write-access'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		client: {
			findUnique: vi.fn(),
			create: vi.fn(),
		},
	},
}))

vi.mock('@/lib/auth/require-write-access', () => ({
	requireWriteAccess: vi.fn(),
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
			session: { user: {} },
		} as never)
		vi.mocked(prisma.client.findUnique).mockResolvedValue(null)
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
		expect(prisma.client.create).toHaveBeenCalled()
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
})
