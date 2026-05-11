/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { obtenerResumenPreliquidacionPorUsuario } from '../services/pre-liquidacion.service'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

vi.mock('@/features/email/lib/preliquidacion-resumen-notification', () => ({
	sendResumenPreliquidacionEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/prisma', () => ({
	prisma: {
		settlementCommission: { findMany: vi.fn() },
		comissionDistribution: { findMany: vi.fn() },
	},
}))

describe('obtenerResumenPreliquidacionPorUsuario', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('devuelve array vacío si no hay settlements en el rango', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([])

		const result = await obtenerResumenPreliquidacionPorUsuario(
			1,
			{
				inicio: new Date('2024-01-01'),
				fin: new Date('2024-01-31'),
			},
			'Archivo.xlsx'
		)

		expect(result).toEqual([])
		expect(prisma.comissionDistribution.findMany).not.toHaveBeenCalled()
	})

	it('agrupa por usuario y por negocio y devuelve un resumen por usuario', async () => {
		vi.mocked(prisma.settlementCommission.findMany).mockResolvedValue([
			{ idSettlementCommission: 10 },
			{ idSettlementCommission: 11 },
		] as any)

		vi.mocked(prisma.comissionDistribution.findMany).mockResolvedValue([
			{
				idComissionDistribution: 1,
				valueComissionFinal: new Decimal(100),
				settlementCommission: {
					business: {
						idBusiness: 100,
						contract: 'CT-001',
						user: {
							idUser: 1,
							email: 'u1@test.com',
							name: 'User',
							lastName: 'One',
						},
					},
				},
				productPercentageCommissionCategory: {
					level: { name: 'Agencia' },
				},
			},
			{
				idComissionDistribution: 2,
				valueComissionFinal: new Decimal(50),
				settlementCommission: {
					business: {
						idBusiness: 100,
						contract: 'CT-001',
						user: {
							idUser: 1,
							email: 'u1@test.com',
							name: 'User',
							lastName: 'One',
						},
					},
				},
				productPercentageCommissionCategory: {
					level: { name: 'General' },
				},
			},
		] as any)

		const result = await obtenerResumenPreliquidacionPorUsuario(
			1,
			{
				inicio: new Date('2024-01-01'),
				fin: new Date('2024-01-31'),
			},
			'Carga.xlsx'
		)

		expect(result).toHaveLength(1)
		expect(result[0].idUser).toBe(1)
		expect(result[0].email).toBe('u1@test.com')
		expect(result[0].nombreUsuario).toBe('User One')
		expect(result[0].archivoNombre).toBe('Carga.xlsx')
		expect(result[0].periodo).toContain('2024-01-01')
		expect(result[0].filas).toHaveLength(1)
		expect(result[0].filas[0].nombreNegocio).toContain('CT-001')
		expect(result[0].filas[0].valorComision).toBe(150)
		expect(result[0].filas[0].categoriaConcepto).toContain('Agencia')
		expect(result[0].filas[0].categoriaConcepto).toContain('General')
	})
})
