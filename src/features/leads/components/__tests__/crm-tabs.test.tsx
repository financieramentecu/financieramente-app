import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useSearchParams } from 'next/navigation'
import { useFlags } from '@flagsmith/flagsmith/react'
import { CrmTabs } from '@/features/leads/components/crm-tabs'
import { useLeadDetailSheet } from '@/features/leads/hooks/use-lead-detail-sheet'

vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }))
vi.mock('@flagsmith/flagsmith/react', () => ({ useFlags: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: { user: { role: 'AGENTE' } } }) }))
vi.mock('@/features/leads/components/leads-board', () => ({
	LeadsBoard: () => <div data-testid="leads-board" />,
}))
vi.mock('@/features/leads/agenda/activities-agenda', () => ({
	ActivitiesAgenda: () => <div data-testid="activities-agenda" />,
}))
vi.mock('@/features/leads/table/leads-table', () => ({
	LeadsTable: ({ fieldsEnabled, canConfigure }: { fieldsEnabled: boolean; canConfigure: boolean }) => (
		<div data-testid="leads-table" data-fields={String(fieldsEnabled)} data-configure={String(canConfigure)} />
	),
}))
vi.mock('@/features/leads/reports/crm-reports', () => ({
	CrmReports: () => <div data-testid="crm-reports" />,
}))
vi.mock('@/features/leads/components/crm-lead-detail-sheet', () => ({
	CrmLeadDetailSheet: () => null,
}))
vi.mock('@/features/leads/hooks/use-lead-detail-sheet', () => ({ useLeadDetailSheet: vi.fn() }))

const openLead = vi.fn()

function setup(params: string, tasksEnabled: boolean, extraFlags: string[] = []) {
	vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(params) as never)
	const flags: Record<string, { enabled: boolean; value: null }> = { crm_tasks: { enabled: tasksEnabled, value: null } }
	for (const flag of extraFlags) flags[flag] = { enabled: true, value: null }
	vi.mocked(useFlags).mockReturnValue(flags as never)
	render(<CrmTabs />)
}

describe('CrmTabs', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(useLeadDetailSheet).mockReturnValue({ lead: null, open: false, setOpen: vi.fn(), openLead })
	})

	it('selects the Pipeline tab and renders the leads board', () => {
		setup('', true)
		expect(screen.getByRole('tab', { name: /Pipeline/ })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByTestId('leads-board')).toBeInTheDocument()
	})

	it.each(['Leads', 'Reportes'])('renders the %s tab disabled as coming soon', (label) => {
		setup('', true)
		const tab = screen.getByRole('tab', { name: new RegExp(label) })
		expect(tab).toBeDisabled()
		expect(tab).toHaveTextContent('Próximamente')
	})

	it('opens the Leads table from ?tab=leads when crm_lead_table is on', () => {
		setup('tab=leads', true, ['crm_lead_table', 'crm_lead_fields'])
		expect(screen.getByRole('tab', { name: /Leads/ })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByTestId('leads-table')).toHaveAttribute('data-fields', 'true')
		expect(screen.getByTestId('leads-table')).toHaveAttribute('data-configure', 'true')
	})

	it('keeps Actividades disabled while crm_tasks is off', () => {
		setup('tab=actividades', false)
		expect(screen.getByRole('tab', { name: /Actividades/ })).toBeDisabled()
		expect(screen.getByRole('tab', { name: /Pipeline/ })).toHaveAttribute('aria-selected', 'true')
	})

	it('opens Actividades from ?tab=actividades when crm_tasks is on', () => {
		setup('tab=actividades', true)
		expect(screen.getByRole('tab', { name: /Actividades/ })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByTestId('activities-agenda')).toBeInTheDocument()
	})

	it('opens Reportes from ?tab=reportes when crm_reports is on', () => {
		setup('tab=reportes', true, ['crm_reports'])
		expect(screen.getByRole('tab', { name: /Reportes/ })).toHaveAttribute('aria-selected', 'true')
		expect(screen.getByTestId('crm-reports')).toBeInTheDocument()
	})

	it('opens the lead sheet from ?lead=', async () => {
		setup('tab=actividades&lead=42', true)
		await waitFor(() => expect(openLead).toHaveBeenCalledWith(42))
	})
})
