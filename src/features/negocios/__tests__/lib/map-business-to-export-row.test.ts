import { describe, it, expect } from 'vitest'
import {
	mapBusinessToExportRow,
	computeMaxAnnualColumns,
	negociosExportColumnHeaders,
} from '@/features/negocios/lib/map-business-to-export-row'
import type { BusinessExportPayload } from '@/features/negocios/lib/business-export-include'
import type { LeaderExportLevel } from '@/features/negocios/lib/resolve-leader-chain-export'

function minimalBusiness(
	overrides: Partial<BusinessExportPayload> = {}
): BusinessExportPayload {
	const base = {
		idBusiness: 1,
		contract: 'C-1',
		term: 3,
		value: { toNumber: () => 100 } as never,
		status: 'FONDEADO',
		createdAt: new Date('2026-01-01'),
		dateIssued: null,
		dateAnchored: new Date('2026-02-01'),
		idBuyPeriodicity: 1,
		idUser: 10,
		idClient: 20,
		idProductPercentageCommission: 30,
		idCurrency: 40,
		idClientOrigin: 50,
		updatedAt: new Date(),
		client: {
			idClient: 20,
			name: 'Ana',
			lastName: 'Pérez',
			identityNumber: '123',
			email: 'a@x.com',
			phone: null,
			typeIdentity: 'CC',
			direcction: null,
			city: null,
			country: 'Colombia',
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		user: {
			idUser: 10,
			name: 'Coach',
			lastName: 'Uno',
			email: 'c@x.com',
			phone: null,
			typeIdentity: 'CC',
			identityNumber: '999',
			idCategoria: 1,
			idUserLeader: null,
			entryDate: new Date(),
			retirementDate: null,
			active: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			idRole: 1,
			password: null,
			ssoOnly: true,
			role: { idRole: 1, code: 'AGENTE', name: 'Agente', ...roleDates() },
			category: { name: 'Cat A' },
		},
		productPercentageCommission: {
			idProductPercentageCommission: 30,
			productConfiguration: {
				product: {
					idProduct: 1,
					name: 'Prod',
					company: { idCompany: 1, name: 'Comp' },
				},
			},
		},
		currency: { idCurrency: 40, name: 'COP' },
		buyPeriodicity: { idBuyPeriodicity: 1, name: 'Anual' },
		clientOrigin: { idClientOrigin: 50, name: 'Origen X' },
		annualPayments: [
			{
				idAnnualPayment: 1,
				idBusiness: 1,
				installmentIndex: 1,
				status: 'FONDEADO' as const,
				dateAnchored: new Date('2026-03-01'),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		],
	} as unknown as BusinessExportPayload
	return { ...base, ...overrides }
}

function roleDates() {
	const d = new Date()
	return { description: '', active: true, createdAt: d, updatedAt: d }
}

describe('computeMaxAnnualColumns', () => {
	it('toma el máximo plazo entre negocios Anual', () => {
		const a = minimalBusiness({ term: 4 })
		const b = minimalBusiness({ term: 2, idBusiness: 2 })
		expect(computeMaxAnnualColumns([a, b])).toBe(4)
	})
})

describe('mapBusinessToExportRow', () => {
	it('incluye columnas de anualidad para periodicidad Anual', () => {
		const b = minimalBusiness()
		const leaders: LeaderExportLevel[] = []
		const row = mapBusinessToExportRow(b, leaders, 0, 3)
		expect(row['Periodicidad']).toBe('Anual')
		expect(row['Fecha fondeo anualidad 1']).toMatch(/\d/)
	})

	it('las claves del row coinciden con negociosExportColumnHeaders (sin desalinear Excel)', () => {
		const b = minimalBusiness()
		const leaders: LeaderExportLevel[] = []
		const maxL = 2
		const maxA = 3
		const row = mapBusinessToExportRow(b, leaders, maxL, maxA)
		const header = negociosExportColumnHeaders(maxL, maxA)
		expect(Object.keys(row)).toEqual(header)
		expect(row['Contrato']).toBe('C-1')
		expect(row['Estado']).toBe('FONDEADO')
	})
})
