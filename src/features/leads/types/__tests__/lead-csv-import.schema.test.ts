import { describe, it, expect } from 'vitest'
import { leadCsvRowSchema } from '@/features/leads/types/lead-csv-import.schema'

function validRawRow(overrides: Record<string, string> = {}) {
	return {
		id_externo_crm: 'CRM-1',
		nombre: 'Juan',
		apellido: 'Perez',
		telefono: '3001234567',
		correo: 'juan@x.com',
		columna_funnel: 'Contactado',
		estado: 'open',
		fecha_creacion: '2023-01-15T10:00:00-05:00',
		origen: 'Feria',
		propietario_correo: 'owner@x.com',
		...overrides,
	}
}

describe('leadCsvRowSchema', () => {
	it('parses a fully valid row', () => {
		const result = leadCsvRowSchema.safeParse(validRawRow())
		expect(result.success).toBe(true)
	})

	it('accepts an offset-aware fecha_creacion', () => {
		const result = leadCsvRowSchema.safeParse(
			validRawRow({ fecha_creacion: '2023-01-15T10:00:00-05:00' })
		)
		expect(result.success).toBe(true)
	})

	it('rejects a naive (offset-less) fecha_creacion', () => {
		const result = leadCsvRowSchema.safeParse(validRawRow({ fecha_creacion: '2023-01-15' }))
		expect(result.success).toBe(false)
	})

	it('accepts empty optional fields (origen, propietario_correo) as omit-preserve', () => {
		const result = leadCsvRowSchema.safeParse(
			validRawRow({ origen: '', propietario_correo: '' })
		)
		expect(result.success).toBe(true)
	})

	it('rejects a missing id_externo_crm', () => {
		const result = leadCsvRowSchema.safeParse(validRawRow({ id_externo_crm: '' }))
		expect(result.success).toBe(false)
	})

	it('parses a row with a non-empty propietario_nombre', () => {
		const result = leadCsvRowSchema.safeParse(
			validRawRow({ propietario_nombre: 'Yohan España' })
		)
		expect(result.success).toBe(true)
		expect(result.success && result.data.propietario_nombre).toBe('Yohan España')
	})

	it('accepts an empty propietario_nombre as omit-preserve', () => {
		const result = leadCsvRowSchema.safeParse(validRawRow({ propietario_nombre: '' }))
		expect(result.success).toBe(true)
		expect(result.success && result.data.propietario_nombre).toBe('')
	})

	it('accepts an absent propietario_nombre and never requires it', () => {
		const raw = validRawRow()
		delete (raw as Record<string, unknown>).propietario_nombre
		const result = leadCsvRowSchema.safeParse(raw)
		expect(result.success).toBe(true)
		expect(result.success && result.data.propietario_nombre).toBeUndefined()
	})
})
