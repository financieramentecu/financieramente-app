import { describe, it, expect } from 'vitest'
import { mapCsvRowToLeadPayload } from '@/features/leads/lib/map-csv-row-to-lead-payload'
import type { LeadCsvRow } from '@/features/leads/types/lead-csv-import.schema'

function makeRow(overrides: Partial<LeadCsvRow> = {}): LeadCsvRow {
	return {
		id_externo_crm: 'CRM-1',
		nombre: 'Juan',
		apellido: 'Perez',
		telefono: '3001234567',
		correo: 'juan@x.com',
		columna_funnel: 'Contactado',
		estado: 'open',
		fecha_creacion: new Date('2023-01-15T10:00:00-05:00'),
		origen: 'Feria',
		propietario_correo: 'owner@x.com',
		...overrides,
	}
}

describe('mapCsvRowToLeadPayload', () => {
	it('maps a full row to the CrmSyncPayload shape', () => {
		const payload = mapCsvRowToLeadPayload(makeRow())

		expect(payload.externalCrmId).toBe('CRM-1')
		expect(payload.name).toBe('Juan')
		expect(payload.lastName).toBe('Perez')
		expect(payload.phone).toBe('3001234567')
		expect(payload.email).toBe('juan@x.com')
		expect(payload.originTag).toBe('Feria')
		expect(payload.ownerEmail).toBe('owner@x.com')
		expect(payload.createdAt).toEqual(new Date('2023-01-15T10:00:00-05:00'))
	})

	it('preserves omit-means-preserve for empty optional fields', () => {
		const payload = mapCsvRowToLeadPayload(makeRow({ origen: '', propietario_correo: '' }))

		expect(payload.originTag).toBeUndefined()
		expect(payload.ownerEmail).toBeUndefined()
	})

	it('never leaks propietario_nombre into the CrmSyncPayload shape', () => {
		const payload = mapCsvRowToLeadPayload(makeRow({ propietario_nombre: 'Yohan España' }))

		expect(payload).not.toHaveProperty('propietario_nombre')
		expect(payload).not.toHaveProperty('ownerName')
	})
})
