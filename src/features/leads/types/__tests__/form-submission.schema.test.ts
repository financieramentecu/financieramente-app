import { describe, expect, it } from 'vitest'
import { formSubmissionPayloadSchema } from '@/features/leads/types/form-submission.schema'

const landingLead = {
	statusKey: 'nuevo',
	name: 'Ana',
	lastName: 'Pérez',
	email: 'ana@correo.com',
	phone: '3001234567',
	identityNumber: '1234567890',
	originTag: 'Crédito libre inversión',
}

function payload(fields: unknown, landing = { key: 'credito-libre', name: 'Crédito libre inversión', version: '3' }) {
	return {
		submissionId: 'credito-libre:9f3c1a',
		submittedAt: '2026-11-18T13:44:00-05:00',
		landing,
		lead: landingLead,
		fields,
	}
}

describe('formSubmissionPayloadSchema', () => {
	it('accepts two different landings, including 0 and No', () => {
		const credit = formSubmissionPayloadSchema.parse(
			payload([
				{ key: 'monto', label: 'Monto solicitado', type: 'number', value: 0 },
				{ key: 'tiene_codeudor', label: '¿Tiene codeudor?', type: 'select', value: 'No' },
				{ key: 'nacimiento', label: 'Fecha de nacimiento', type: 'date', value: '1990-02-28' },
				{ key: 'ciudad', label: 'Ciudad', type: 'text', value: null },
			])
		)
		expect(credit.fields[0]?.value).toBe(0)
		expect(credit.fields[1]?.value).toBe('No')

		const cdt = formSubmissionPayloadSchema.parse(
			payload(
				[
					{ key: 'plazo', label: 'Plazo', type: 'select', value: ['6 meses', '12 meses'] },
					{ key: 'monto', label: 'Valor a invertir', type: 'number', value: 5000000 },
					{ key: 'comentario', label: 'Comentario', type: 'text', value: null },
				],
				{ key: 'cdt', name: 'CDT', version: '1' }
			)
		)
		expect(cdt.landing.key).toBe('cdt')
		expect(cdt.fields).toHaveLength(3)
	})

	it('rejects an empty string so n8n must send null, and rejects a bad date', () => {
		expect(formSubmissionPayloadSchema.safeParse(payload([{ key: 'ciudad', label: 'Ciudad', type: 'text', value: '' }])).success).toBe(false)
		expect(
			formSubmissionPayloadSchema.safeParse(
				payload([{ key: 'nacimiento', label: 'Nacimiento', type: 'date', value: '1990-02-30' }])
			).success
		).toBe(false)
		expect(formSubmissionPayloadSchema.safeParse(payload([{ key: 'archivo', label: 'Archivo', type: 'file', value: null }])).success).toBe(false)
	})

	it('rejects a prospect with no document, email or phone', () => {
		const body = payload([])
		const result = formSubmissionPayloadSchema.safeParse({
			...body,
			lead: { statusKey: 'nuevo' },
		})
		expect(result.success).toBe(false)
	})
})
