import { describe, expect, it } from 'vitest'
import { formSubmissionSchema } from '@/features/leads/types/form-submission.schema'

const creditoLibre = {
	submissionId: 'credito-libre:9f3c1a',
	submittedAt: '2026-11-18T13:44:00-05:00',
	landing: { key: 'credito-libre', name: 'Crédito libre inversión', version: '3' },
	lead: {
		statusKey: 'nuevo',
		name: 'Ana',
		lastName: 'Pérez',
		email: 'ana@correo.com',
		phone: '3001234567',
		identityNumber: '1234567890',
		originTag: 'Crédito libre inversión',
		ownerEmail: 'asesor@financieramente.com',
	},
	fields: [
		{ key: 'monto', label: 'Monto solicitado', type: 'number', value: 0 },
		{ key: 'tiene_codeudor', label: '¿Tiene codeudor?', type: 'select', value: 'No' },
		{ key: 'nacimiento', label: 'Fecha de nacimiento', type: 'date', value: '1990-02-28' },
		{ key: 'ciudad', label: 'Ciudad', type: 'text', value: null },
	],
}

const cdt = {
	submissionId: 'cdt:77ab',
	submittedAt: '2026-11-18T14:02:00-05:00',
	landing: { key: 'cdt', name: 'CDT', version: '1' },
	lead: {
		statusKey: 'nuevo',
		name: 'Luis',
		lastName: 'Gómez',
		email: 'luis@correo.com',
		phone: '3010001122',
		identityNumber: '1099888777',
		originTag: 'CDT',
	},
	fields: [
		{ key: 'plazo', label: 'Plazo', type: 'select', value: ['6 meses', '12 meses'] },
		{ key: 'monto', label: 'Valor a invertir', type: 'number', value: 5000000 },
		{ key: 'comentario', label: 'Comentario', type: 'text', value: null },
	],
}

describe('formSubmissionSchema', () => {
	it('keeps 0 and No and turns an empty answer into null', () => {
		const result = formSubmissionSchema.parse(creditoLibre)
		expect(result.fields.map((field) => field.value)).toEqual([0, 'No', '1990-02-28', null])
	})

	it('accepts a second landing with a list selection', () => {
		const result = formSubmissionSchema.parse(cdt)
		expect(result.landing.key).toBe('cdt')
		expect(result.fields[0]?.value).toEqual(['6 meses', '12 meses'])
	})

	it('turns a blank string and the string null into null without touching 0', () => {
		const result = formSubmissionSchema.parse({
			...creditoLibre,
			fields: [
				{ key: 'monto', label: 'Monto', type: 'number', value: '' },
				{ key: 'nota', label: 'Nota', type: 'text', value: 'null' },
				{ key: 'cero', label: 'Cero', type: 'number', value: 0 },
			],
		})
		expect(result.fields.map((field) => field.value)).toEqual([null, null, 0])
	})

	it('rejects an unknown field type and does not coerce files', () => {
		expect(() =>
			formSubmissionSchema.parse({
				...creditoLibre,
				fields: [{ key: 'adjunto', label: 'Adjunto', type: 'file', value: 'a.pdf' }],
			})
		).toThrow()
	})

	it('keeps utm_source so n8n can name the landing origin', () => {
		const result = formSubmissionSchema.parse({ ...creditoLibre, utm_source: 'Money Map' })
		expect(result.utm_source).toBe('Money Map')
	})

	it('rejects a naive timestamp', () => {
		expect(() =>
			formSubmissionSchema.parse({ ...creditoLibre, submittedAt: '2026-11-18T13:44:00' })
		).toThrow()
	})
})
