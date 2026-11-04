import { describe, it, expect, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { roles, seedRoles, PARTNER_ROLE } from '../roles'

describe('roles seed data', () => {
	it('defines the PARTNER role as active', () => {
		expect(PARTNER_ROLE).toMatchObject({ code: 'PARTNER', active: true })
		expect(roles).toContainEqual(PARTNER_ROLE)
	})

	it('keeps every pre-existing role code', () => {
		const codes = roles.map((role) => role.code)
		expect(codes).toEqual(
			expect.arrayContaining([
				'ADMIN',
				'DEFAULT',
				'ASISTENTE_GERENCIA_OPERATIVA',
				'ANALISTA_SOPORTE',
				'AGENTE',
				'CONSULTOR',
			])
		)
	})

	it('has unique role codes', () => {
		const codes = roles.map((role) => role.code)
		expect(new Set(codes).size).toBe(codes.length)
	})

	it('upserts PARTNER by code (idempotent)', async () => {
		const upsert = vi.fn().mockResolvedValue({ code: 'PARTNER', name: 'x' })
		const prisma = { role: { upsert } } as unknown as PrismaClient

		await seedRoles(prisma)
		await seedRoles(prisma)

		const partnerCalls = upsert.mock.calls.filter(
			([args]) => args.where.code === 'PARTNER'
		)
		expect(partnerCalls).toHaveLength(2)
		expect(partnerCalls[0][0].create).toEqual(PARTNER_ROLE)
	})
})
