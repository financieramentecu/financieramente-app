import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeadTableDetail } from '@/features/leads/table/lead-table-detail'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'

vi.mock('@/features/shared/hooks/use-feature-flag', () => ({
	useFeatureFlag: vi.fn(),
}))

vi.mock('@/features/leads/activities/lead-activity-timeline', () => ({
	LeadActivityTimeline: ({ leadId }: { leadId: number }) => (
		<section>Línea de tiempo {leadId}</section>
	),
}))

function stubDetailFetch() {
	vi.stubGlobal(
		'fetch',
		vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ data: [] }) }))
	)
}

describe('LeadTableDetail', () => {
	it('shows the timeline when the CRM timeline is enabled', async () => {
		vi.mocked(useFeatureFlag).mockReturnValue({ enabled: true, value: null })
		stubDetailFetch()
		render(<LeadTableDetail idLead={8} leadName="Ana Pérez" />)
		expect(await screen.findByText('Línea de tiempo 8')).toBeInTheDocument()
	})

	it('hides the timeline while the CRM timeline is off', async () => {
		vi.mocked(useFeatureFlag).mockReturnValue({ enabled: false, value: null })
		stubDetailFetch()
		render(<LeadTableDetail idLead={8} leadName="Ana Pérez" />)
		expect(await screen.findByText('Sin etapas')).toBeInTheDocument()
		expect(screen.queryByText('Línea de tiempo 8')).not.toBeInTheDocument()
	})
})
