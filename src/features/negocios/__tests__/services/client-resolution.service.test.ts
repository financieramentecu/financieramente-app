import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resolveExistingClient } from '@/features/negocios/services/client-resolution.service'

vi.mock('@/lib/prisma', () => ({
	prisma: {
		client: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
		},
	},
}))

const activeClient = {
	idClient: 1,
	name: 'Ana',
	lastName: 'Pérez',
	typeIdentity: 'CC',
	identityNumber: '1234567890',
	email: 'ana@example.com',
	phone: '3001234567',
	direcction: null,
	city: null,
	country: 'Colombia',
	active: true,
	createdAt: new Date(),
	updatedAt: new Date(),
}

const inactiveClient = {
	...activeClient,
	idClient: 2,
	active: false,
}

describe('resolveExistingClient (D1/D5/D7)', () => {
	beforeEach(() => {
		vi.resetAllMocks()
	})

	it('returns a document match scoped to active: true', async () => {
		vi.mocked(prisma.client.findFirst).mockResolvedValueOnce(
			activeClient as never
		)

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			email: 'ana@example.com',
			allowReactivation: false,
		})

		expect(result).toEqual({ client: activeClient, source: 'document' })
		expect(prisma.client.findFirst).toHaveBeenCalledWith({
			where: {
				typeIdentity: 'CC',
				identityNumber: '1234567890',
				active: true,
			},
		})
		expect(prisma.client.findMany).not.toHaveBeenCalled()
	})

	it('never matches an inactive client that carries the same email as the typed data (D1)', async () => {
		vi.mocked(prisma.client.findFirst).mockResolvedValueOnce(null) // active document lookup
		vi.mocked(prisma.client.findMany).mockResolvedValueOnce([])

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '9999999999',
			email: 'inactive@example.com',
			allowReactivation: false,
		})

		expect(result).toBeNull()
		expect(prisma.client.findMany).toHaveBeenCalledWith({
			where: { email: 'inactive@example.com', active: true },
			take: 2,
		})
	})

	it('returns an email match when exactly one active client matches', async () => {
		vi.mocked(prisma.client.findFirst).mockResolvedValueOnce(null)
		vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
			activeClient,
		] as never)

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '0000000000',
			email: 'ana@example.com',
			allowReactivation: false,
		})

		expect(result).toEqual({ client: activeClient, source: 'email' })
	})

	it('returns null when no email is supplied', async () => {
		vi.mocked(prisma.client.findFirst).mockResolvedValueOnce(null)

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '0000000000',
			email: null,
			allowReactivation: false,
		})

		expect(result).toBeNull()
		expect(prisma.client.findMany).not.toHaveBeenCalled()
	})

	it('returns null when 0 active clients match the email', async () => {
		vi.mocked(prisma.client.findFirst).mockResolvedValueOnce(null)
		vi.mocked(prisma.client.findMany).mockResolvedValueOnce([])

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '0000000000',
			email: 'nobody@example.com',
			allowReactivation: false,
		})

		expect(result).toBeNull()
	})

	it('returns null when 2+ active clients match the email', async () => {
		vi.mocked(prisma.client.findFirst).mockResolvedValueOnce(null)
		vi.mocked(prisma.client.findMany).mockResolvedValueOnce([
			activeClient,
			{ ...activeClient, idClient: 5 },
		] as never)

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '0000000000',
			email: 'shared@example.com',
			allowReactivation: false,
		})

		expect(result).toBeNull()
	})

	it('reactivates an inactive document match and returns source "reactivated" when allowReactivation is true', async () => {
		vi.mocked(prisma.client.findFirst)
			.mockResolvedValueOnce(null) // active document lookup
			.mockResolvedValueOnce(inactiveClient as never) // inactive document lookup
		vi.mocked(prisma.client.findMany).mockResolvedValueOnce([])
		vi.mocked(prisma.client.update).mockResolvedValueOnce({
			...inactiveClient,
			active: true,
		} as never)

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			email: null,
			allowReactivation: true,
		})

		expect(result).toEqual({
			client: { ...inactiveClient, active: true },
			source: 'reactivated',
		})
		expect(prisma.client.update).toHaveBeenCalledWith({
			where: { idClient: inactiveClient.idClient },
			data: { active: true },
		})
	})

	it('does not reactivate and returns null when allowReactivation is false, even with an inactive document match available', async () => {
		vi.mocked(prisma.client.findFirst).mockResolvedValueOnce(null) // active document lookup
		vi.mocked(prisma.client.findMany).mockResolvedValueOnce([])

		const result = await resolveExistingClient({
			typeIdentity: 'CC',
			identityNumber: '1234567890',
			email: null,
			allowReactivation: false,
		})

		expect(result).toBeNull()
		expect(prisma.client.update).not.toHaveBeenCalled()
		// Only the active document lookup should run — no inactive lookup attempted
		expect(prisma.client.findFirst).toHaveBeenCalledTimes(1)
	})
})
