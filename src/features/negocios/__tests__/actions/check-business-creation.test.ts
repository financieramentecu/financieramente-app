import type { ProductPercentageCommission } from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkBusinessCreation } from '@/features/negocios/actions/check-business-creation'
import { getPpcForNewBusinesses } from '@/features/negocios/services/product-configuration.service'
import { requireActionPermission } from '@/lib/auth/require-action-permission'
import { requireWriteAccess } from '@/lib/auth/require-write-access'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'

vi.mock('@/lib/prisma', () => ({
	prisma: { user: { findUnique: vi.fn(), findMany: vi.fn() } },
}))
vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	getPpcForNewBusinesses: vi.fn(),
}))
vi.mock('@/lib/auth/require-action-permission', () => ({
	requireActionPermission: vi.fn(),
}))
vi.mock('@/lib/auth/require-write-access', () => ({
	requireWriteAccess: vi.fn(),
}))

function setSession(id: number, role: UserRole | null) {
	vi.mocked(requireWriteAccess).mockResolvedValue({
		ok: true,
		session: { user: { id: String(id), role } },
	} as never)
}

describe('checkBusinessCreation (pre-flight before client persistence)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			idLevel: 40,
			level: { code: 'PARTNER_EXTERNAL' },
		} as never)
		vi.mocked(getPpcForNewBusinesses).mockResolvedValue({
			configExists: true,
			ppc: { idProductPercentageCommission: 1 } as ProductPercentageCommission,
		})
	})

	it('succeeds for a PARTNER whose product has a PARTNER_EXTERNAL PPC and writes nothing', async () => {
		setSession(77, UserRole.PARTNER)

		const result = await checkBusinessCreation({ idUser: 5, idProduct: 3 })

		expect(result.data).toEqual({ ok: true })
		expect(getPpcForNewBusinesses).toHaveBeenCalledWith({
			idProduct: 3,
			idLevel: 40,
		})
		expect(prisma.user.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({ where: { idUser: 77 } })
		)
	})

	it('authenticates once: no nested Server Action re-runs a permission guard', async () => {
		setSession(77, UserRole.PARTNER)

		await checkBusinessCreation({ idUser: 5, idProduct: 3 })

		expect(requireWriteAccess).toHaveBeenCalledTimes(1)
		expect(requireActionPermission).not.toHaveBeenCalled()
	})

	it.each([
		[{ idUser: 0, idProduct: 3 }, 'El agente es obligatorio'],
		[{ idUser: 1.5, idProduct: 3 }, 'El agente es obligatorio'],
		[{ idUser: 5, idProduct: -1 }, 'El producto es obligatorio'],
		[{ idUser: 5, idProduct: Number.NaN }, 'El producto es obligatorio'],
	])('validates the input with Zod (%o)', async (input, message) => {
		setSession(77, UserRole.PARTNER)

		const result = await checkBusinessCreation(input)

		expect(result).toEqual({ data: null, error: message })
		expect(prisma.user.findUnique).not.toHaveBeenCalled()
		expect(getPpcForNewBusinesses).not.toHaveBeenCalled()
	})

	it('returns the Spanish partner error when the product has no partner configuration', async () => {
		setSession(77, UserRole.PARTNER)
		vi.mocked(getPpcForNewBusinesses).mockRejectedValue(
			new Error('No existe configuración')
		)

		const result = await checkBusinessCreation({ idUser: 5, idProduct: 3 })

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toMatch(/partners/)
	})

	it('rejects a read-only role through the write guard', async () => {
		vi.mocked(requireWriteAccess).mockResolvedValue({
			ok: false,
			response: { status: 403 },
		} as never)

		const result = await checkBusinessCreation({ idUser: 5, idProduct: 3 })

		expect(result.data).toBeNull()
		expect('error' in result && result.error).toBe('Sin permisos')
		expect(prisma.user.findUnique).not.toHaveBeenCalled()
	})

	it('denies an unknown role', async () => {
		setSession(3, UserRole.DEFAULT)

		const result = await checkBusinessCreation({ idUser: 5, idProduct: 3 })

		expect('error' in result && result.error).toBe('Sin permisos')
	})
})
