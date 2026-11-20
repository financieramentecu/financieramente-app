import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LeadFormOriginSection } from '@/features/leads/components/lead-form-origin-section'
import type { LeadFormSubmissionView } from '@/features/leads/types/form-submission.types'

const credit: LeadFormSubmissionView = {
	submissionId: 'credito-libre:1',
	landingKey: 'credito-libre',
	landingName: 'Crédito libre inversión',
	formVersion: '3',
	submittedAt: '2026-11-18T18:44:00.000Z',
	fields: [
		{ key: 'monto', label: 'Monto solicitado', type: 'number', value: 0 },
		{ key: 'codeudor', label: '¿Tiene codeudor?', type: 'select', value: 'No' },
		{ key: 'ciudad', label: 'Ciudad', type: 'text', value: null },
	],
}

const cdt: LeadFormSubmissionView = {
	submissionId: 'cdt:1',
	landingKey: 'cdt',
	landingName: 'CDT',
	formVersion: '1',
	submittedAt: '2026-11-18T19:02:00.000Z',
	fields: [{ key: 'plazo', label: 'Plazo', type: 'select', value: ['6 meses'] }],
}

describe('LeadFormOriginSection', () => {
	it('renders nothing when the prospect has no landing snapshot', () => {
		const { container } = render(<LeadFormOriginSection submissions={[]} />)
		expect(container).toBeEmptyDOMElement()
	})

	it('shows each landing label and keeps 0, No and the empty label', () => {
		render(<LeadFormOriginSection submissions={[credit, cdt]} />)
		expect(screen.getByText('Crédito libre inversión')).toBeInTheDocument()
		expect(screen.getByText('CDT')).toBeInTheDocument()
		expect(screen.getByText('0')).toBeInTheDocument()
		expect(screen.getByText('No')).toBeInTheDocument()
		expect(screen.getByText('Sin información')).toBeInTheDocument()
		expect(screen.getByText('6 meses')).toBeInTheDocument()
	})
})
