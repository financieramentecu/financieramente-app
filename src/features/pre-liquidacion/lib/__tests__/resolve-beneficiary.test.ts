import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
	buildUplineChain,
	resolveBeneficiaryUserId,
	ppcConfigsNeedUplineAgent,
} from '@/features/pre-liquidacion/lib/resolve-beneficiary'

function cat(
	overrides: Partial<Parameters<typeof resolveBeneficiaryUserId>[0]> = {}
): Parameters<typeof resolveBeneficiaryUserId>[0] {
	return {
		idCategory: 10,
		code: 'TEST',
		beneficiaryMode: 'OVERRIDE',
		idFixedBeneficiaryUser: null,
		...overrides,
	}
}

describe('resolveBeneficiaryUserId', () => {
	it('FIXED_BENEFICIARY returns fixed user when active and relation loaded', () => {
		const r = resolveBeneficiaryUserId(
			cat({
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: 99,
				fixedBeneficiaryUser: { idUser: 99, active: true },
			}),
			[]
		)
		expect(r).toEqual({ ok: true, idUser: 99 })
	})

	it('FIXED_BENEFICIARY ignores upline chain', () => {
		const r = resolveBeneficiaryUserId(
			cat({
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: 99,
				fixedBeneficiaryUser: { idUser: 99, active: true },
			}),
			[{ idUser: 1, idCategoria: 10 }]
		)
		expect(r).toEqual({ ok: true, idUser: 99 })
	})

	it('FIXED_BENEFICIARY fails when idFixedBeneficiaryUser is null', () => {
		const r = resolveBeneficiaryUserId(
			cat({
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: null,
			}),
			[]
		)
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.code).toBe('FIXED_MISSING_USER')
	})

	it('FIXED_BENEFICIARY fails when fixed user missing or not loaded', () => {
		const r = resolveBeneficiaryUserId(
			cat({
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: 5,
				fixedBeneficiaryUser: null,
			}),
			[]
		)
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.code).toBe('FIXED_MISSING_USER')
	})

	it('FIXED_BENEFICIARY fails when fixed user inactive', () => {
		const r = resolveBeneficiaryUserId(
			cat({
				beneficiaryMode: 'BENEFICIARIO_GENERAL',
				idFixedBeneficiaryUser: 5,
				fixedBeneficiaryUser: { idUser: 5, active: false },
			}),
			[]
		)
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.code).toBe('FIXED_USER_INACTIVE')
	})

	it('UPLINE_CHAIN returns first chain user matching idCategory', () => {
		const r = resolveBeneficiaryUserId(
			cat({ idCategory: 3, code: 'LIDER' }),
			[
				{ idUser: 1, idCategoria: 1 },
				{ idUser: 2, idCategoria: 3 },
				{ idUser: 3, idCategoria: 3 },
			]
		)
		expect(r).toEqual({ ok: true, idUser: 2 })
	})

	it('UPLINE_CHAIN returns UPLINE_NO_MATCH when no category match', () => {
		const r = resolveBeneficiaryUserId(
			cat({ idCategory: 99, code: 'X' }),
			[
				{ idUser: 1, idCategoria: 1 },
				{ idUser: 2, idCategoria: 2 },
			]
		)
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.code).toBe('UPLINE_NO_MATCH')
	})

	it('UPLINE_CHAIN skips users with null idCategoria', () => {
		const r = resolveBeneficiaryUserId(
			cat({ idCategory: 5, code: 'C' }),
			[
				{ idUser: 1, idCategoria: null },
				{ idUser: 2, idCategoria: 5 },
			]
		)
		expect(r).toEqual({ ok: true, idUser: 2 })
	})
})

describe('buildUplineChain', () => {
	const findUnique = vi.fn()

	beforeEach(() => {
		findUnique.mockReset()
	})

	it('walks leader links and stops at null leader', async () => {
		findUnique
			.mockResolvedValueOnce({
				idUser: 1,
				idCategoria: 10,
				idUserLeader: 2,
			})
			.mockResolvedValueOnce({
				idUser: 2,
				idCategoria: 20,
				idUserLeader: null,
			})

		const chain = await buildUplineChain(
			{ user: { findUnique } } as never,
			1
		)

		expect(chain).toEqual([
			{ idUser: 1, idCategoria: 10 },
			{ idUser: 2, idCategoria: 20 },
		])
	})

	it('breaks on cycle', async () => {
		findUnique.mockResolvedValue({
			idUser: 1,
			idCategoria: 1,
			idUserLeader: 1,
		})

		const chain = await buildUplineChain(
			{ user: { findUnique } } as never,
			1
		)

		expect(chain.length).toBe(1)
	})

	it('returns empty chain when start user does not exist', async () => {
		findUnique.mockResolvedValueOnce(null)
		const chain = await buildUplineChain(
			{ user: { findUnique } } as never,
			999
		)
		expect(chain).toEqual([])
	})
})

describe('ppcConfigsNeedUplineAgent', () => {
	it('is true when any category is UPLINE_CHAIN', () => {
		expect(
			ppcConfigsNeedUplineAgent([
				{ category: { beneficiaryMode: 'BENEFICIARIO_GENERAL' } },
				{ category: { beneficiaryMode: 'OVERRIDE' } },
			])
		).toBe(true)
	})

	it('is false when all FIXED_BENEFICIARY', () => {
		expect(
			ppcConfigsNeedUplineAgent([
				{ category: { beneficiaryMode: 'BENEFICIARIO_GENERAL' } },
			])
		).toBe(false)
	})
})
