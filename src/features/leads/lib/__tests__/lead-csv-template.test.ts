import { describe, it, expect } from 'vitest'
import { LEAD_CSV_HEADERS, buildLeadCsvTemplate } from '@/features/leads/lib/lead-csv-template'

describe('LEAD_CSV_HEADERS', () => {
	it('has exactly the 11 headers in the fixed order, propietario_nombre last', () => {
		expect(LEAD_CSV_HEADERS).toEqual([
			'id_externo_crm',
			'nombre',
			'apellido',
			'telefono',
			'correo',
			'columna_funnel',
			'estado',
			'fecha_creacion',
			'origen',
			'propietario_correo',
			'propietario_nombre',
		])
	})
})

describe('buildLeadCsvTemplate', () => {
	it('returns a single header line with no data rows', () => {
		const template = buildLeadCsvTemplate()
		const lines = template.split('\n').filter((line) => line.length > 0)
		expect(lines).toHaveLength(1)
		expect(lines[0]).toBe(LEAD_CSV_HEADERS.join(','))
	})
})
