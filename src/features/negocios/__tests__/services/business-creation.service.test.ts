import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ProductPercentageCommission } from '@prisma/client'
import { UserRole } from '@/features/auth/lib/roles'

const mocks = vi.hoisted(() => ({
	getPpc: vi.fn(),
	userFindUnique: vi.fn(),
	userFindMany: vi.fn(),
}))

vi.mock('@/features/negocios/services/product-configuration.service', () => ({
	getPpcForNewBusinesses: (...args: unknown[]) => mocks.getPpc(...args),
}))
vi.mock('@/lib/prisma', () => ({
	prisma: {
		user: { findUnique: mocks.userFindUnique, findMany: mocks.userFindMany },
	},
}))

import {
	PARTNER_PRODUCT_UNAVAILABLE_ERROR,
	resolveBusinessCreationContext,
} from '@/features/negocios/services/business-creation.service'

const admin = { idUser: 1, role: { code: UserRole.ADMIN } }
const PPC = { idProductPercentageCommission: 99 } as ProductPercentageCommission

function mockOwner(levelCode: string, idLevel: number | null = 7) {
	mocks.userFindUnique.mockResolvedValue({
		idLevel,
		level: { code: levelCode },
	})
}

function resolve(
	overrides: Partial<{
		sessionUser: typeof admin
		requestedIdUser: number
	}> = {}
) {
	return resolveBusinessCreationContext({
		sessionUser: admin,
		requestedIdUser: 12,
		idProduct: 3,
		...overrides,
	})
}

beforeEach(() => {
	vi.clearAllMocks()
})

describe('resolveBusinessCreationContext (domain result, no HTTP shapes)', () => {
	it('resolves the PPC through getPpcForNewBusinesses with the owner level', async () => {
		mockOwner('LEVEL_3', 7)
		mocks.getPpc.mockResolvedValue({ configExists: true, ppc: PPC })

		const result = await resolve()

		expect(result).toEqual({
			ok: true,
			idUser: 12,
			idLevel: 7,
			idProductPercentageCommission: 99,
		})
		expect(mocks.getPpc).toHaveBeenCalledWith({ idProduct: 3, idLevel: 7 })
	})

	it('answers the generic message when a non-partner config has no active PPC for new businesses', async () => {
		mockOwner('LEVEL_3', 7)
		mocks.getPpc.mockResolvedValue({ configExists: true, ppc: null })

		expect(await resolve()).toEqual({
			ok: false,
			error:
				'No hay configuración de comisión para nuevos negocios en esta combinación producto/categoría.',
		})
	})

	it('relays the lookup failure message for non-partner owners', async () => {
		mockOwner('LEVEL_3', 7)
		mocks.getPpc.mockRejectedValue(new Error('No existe configuración X'))

		expect(await resolve()).toEqual({
			ok: false,
			error: 'No existe configuración X',
		})
	})

	it('maps both the missing PPC and a lookup failure to the partner message for PARTNER_EXTERNAL owners', async () => {
		mockOwner('PARTNER_EXTERNAL', 40)

		mocks.getPpc.mockResolvedValue({ configExists: true, ppc: null })
		expect(await resolve()).toEqual({
			ok: false,
			error: PARTNER_PRODUCT_UNAVAILABLE_ERROR,
		})

		mocks.getPpc.mockRejectedValue(new Error('No existe configuración'))
		expect(await resolve()).toEqual({
			ok: false,
			error: PARTNER_PRODUCT_UNAVAILABLE_ERROR,
		})
	})

	it('denies a role without owner rights before any lookup', async () => {
		const result = await resolve({
			sessionUser: { idUser: 3, role: { code: UserRole.DEFAULT } },
		})

		expect(result).toEqual({ ok: false, error: 'Sin permisos' })
		expect(mocks.userFindUnique).not.toHaveBeenCalled()
		expect(mocks.getPpc).not.toHaveBeenCalled()
	})

	it('fails when the owner does not exist or has no level', async () => {
		mocks.userFindUnique.mockResolvedValueOnce(null)
		expect(await resolve()).toEqual({
			ok: false,
			error: 'El agente seleccionado no existe',
		})

		mockOwner('LEVEL_3', null)
		expect(await resolve()).toEqual({
			ok: false,
			error: 'El agente seleccionado no tiene un nivel asignado',
		})
		expect(mocks.getPpc).not.toHaveBeenCalled()
	})
})

describe('layering of business creation (static)', () => {
	const read = (relative: string) =>
		readFileSync(path.resolve(__dirname, '../..', relative), 'utf8')

	it('the service no longer knows ApiResponse nor the Server Action', () => {
		const source = read('services/business-creation.service.ts')
		expect(source).not.toContain('ApiResponse')
		expect(source).not.toContain('find-product-percentage-commission')
		expect(source).not.toContain('findPpc')
	})

	it.each(['actions/check-business-creation.ts', 'actions/create-business.ts'])(
		'%s does not call the PPC Server Action (one authentication per flow)',
		(file) => {
			expect(read(file)).not.toContain('find-product-percentage-commission')
		}
	)

	it('the check action leaves the Prisma client to the service', () => {
		expect(read('actions/check-business-creation.ts')).not.toMatch(
			/@\/lib\/prisma/
		)
	})
})
