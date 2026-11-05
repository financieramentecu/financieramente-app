import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CrmTabs } from '@/features/leads/components/crm-tabs'

vi.mock('@/features/leads/components/leads-board', () => ({
	LeadsBoard: () => <div data-testid="leads-board" />,
}))

describe('CrmTabs', () => {
	it('selects the Pipeline tab and renders the leads board', () => {
		render(<CrmTabs />)

		expect(screen.getByRole('tab', { name: /Pipeline/ })).toHaveAttribute(
			'aria-selected',
			'true'
		)
		expect(screen.getByTestId('leads-board')).toBeInTheDocument()
	})

	it.each(['Leads', 'Actividades', 'Reportes'])(
		'renders the %s tab disabled as coming soon',
		(label) => {
			render(<CrmTabs />)

			const tab = screen.getByRole('tab', { name: new RegExp(label) })
			expect(tab).toBeDisabled()
			expect(tab).toHaveTextContent('Próximamente')
		}
	)
})
