import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LeadFormSnapshots } from '@/features/leads/components/lead-form-snapshots'
import { formatLeadAmount } from '@/features/leads/table/format-lead-amount'
import type { LeadFormSnapshot } from '@/features/leads/types/form-submission.types'

const snapshots: LeadFormSnapshot[] = [
	{
		submissionId: 'credito-libre:9f3c1a',
		landingKey: 'credito-libre',
		landingName: 'Crédito libre inversión',
		landingVersion: '3',
		submittedAt: '2026-11-18T18:44:00.000Z',
		fields: [
			{ key: 'monto', label: 'Monto solicitado', type: 'number', value: 0 },
			{ key: 'tiene_codeudor', label: '¿Tiene codeudor?', type: 'select', value: 'No' },
			{ key: 'ciudad', label: 'Ciudad', type: 'text', value: null },
		],
	},
	{
		submissionId: 'cdt:77ab',
		landingKey: 'cdt',
		landingName: 'CDT',
		landingVersion: '1',
		submittedAt: '2026-11-18T19:02:00.000Z',
		fields: [
			{ key: 'plazo', label: 'Plazo', type: 'select', value: ['6 meses', '12 meses'] },
			{ key: 'comentario', label: 'Comentario', type: 'text', value: null },
		],
	},
]

describe('LeadFormSnapshots', () => {
	it('shows each landing with a money amount, separate choices and an empty answer', () => {
		render(<LeadFormSnapshots snapshots={snapshots} />)

		expect(screen.getByText('Crédito libre inversión')).toBeInTheDocument()
		expect(screen.getByText('CDT')).toBeInTheDocument()
		expect(screen.getByText(/3 respuestas/)).toBeInTheDocument()
		expect(screen.getByText(/2 respuestas/)).toBeInTheDocument()
		expect(screen.getByText((content) => content.replace(/\s/g, '') === formatLeadAmount('0').replace(/\s/g, ''))).toBeInTheDocument()
		expect(screen.getByText('No')).toBeInTheDocument()
		expect(screen.getByText('6 meses')).toBeInTheDocument()
		expect(screen.getByText('12 meses')).toBeInTheDocument()
		expect(screen.getAllByText('Sin información')).toHaveLength(2)
	})
})
