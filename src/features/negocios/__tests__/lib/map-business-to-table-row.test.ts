import { describe, expect, it } from 'vitest'
import {
	BUSINESS_STATUS,
	type BusinessEntity,
} from '@/features/negocios/types/business-entity.types'
import { mapBusinessToTableRow } from '@/features/negocios/lib/map-business-to-table-row'

function createBusinessEntity(status: string): BusinessEntity {
	return {
		id: 7,
		contract: 'C-001',
		term: 12,
		value: 1000000,
		status: status as BusinessEntity['status'],
		createdAt: '2026-04-20T12:00:00.000Z',
		dateIssued: null,
		dateAnchored: null,
		numAportes: null,
		fundedAportes: 0,
		hasPayments: false,
		hasPendingPaymentFunding: false,
		supportCount: 0,
		observations: null,
		client: {
			id: 1,
			fullName: 'Jane Doe',
			identityNumber: '123',
			email: 'jane@example.com',
			phone: null,
		},
		agent: {
			id: 2,
			fullName: 'Agent Doe',
			roleName: 'AGENTE',
			categoryName: 'Junior',
			email: 'agent@example.com',
			phone: null,
		},
		product: {
			id: 3,
			name: 'Producto',
			companyId: 4,
			companyName: 'Compania',
		},
		currency: {
			id: 1,
			name: 'COP',
		},
		periodicity: {
			id: 9,
			name: 'Mensual',
		},
		clientOrigin: {
			id: 5,
			name: 'Referido',
		},
	}
}

describe('mapBusinessToTableRow', () => {
	it('maps LIQUIDADO to Liquidado and keeps statusCode', () => {
		const row = mapBusinessToTableRow(
			createBusinessEntity(BUSINESS_STATUS.LIQUIDADO)
		)

		expect(row.status).toBe('Liquidado')
		expect(row.statusCode).toBe(BUSINESS_STATUS.LIQUIDADO)
	})

	it('does not map unknown statuses to Cancelado by default', () => {
		const row = mapBusinessToTableRow(createBusinessEntity('DESCONOCIDO'))

		expect(row.status).toBe('DESCONOCIDO')
		expect(row.status).not.toBe('Cancelado')
	})

	it('threads numAportes from the entity into the table row', () => {
		const entity = createBusinessEntity(BUSINESS_STATUS.EMITIDO)
		entity.numAportes = 0

		const row = mapBusinessToTableRow(entity)

		expect(row.numAportes).toBe(0)
	})

	it('keeps numAportes null when the entity has no annual rows configured', () => {
		const row = mapBusinessToTableRow(
			createBusinessEntity(BUSINESS_STATUS.EMITIDO)
		)

		expect(row.numAportes).toBeNull()
	})
})
