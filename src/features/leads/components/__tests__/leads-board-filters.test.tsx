import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LeadsBoardFilters } from '@/features/leads/components/leads-board-filters'
import { getDefaultLeadBoardFilters } from '@/features/leads/lib/lead-board-filters'

describe('LeadsBoardFilters', () => {
	it('renders the default selection: outcomeStatuses [OPEN] and the current month range', () => {
		const defaults = getDefaultLeadBoardFilters()
		const onChange = vi.fn()

		render(<LeadsBoardFilters value={defaults} onChange={onChange} />)

		// MultiSelect trigger shows the single selected label
		expect(screen.getByText('Abierto')).toBeInTheDocument()
	})

	it('calling onChange with an additional outcomeStatus keeps existing selections (additive OR)', () => {
		const defaults = getDefaultLeadBoardFilters()
		const onChange = vi.fn()

		render(<LeadsBoardFilters value={defaults} onChange={onChange} />)

		fireEvent.click(screen.getByRole('combobox'))
		fireEvent.click(screen.getByRole('option', { name: 'Ganado' }))

		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({
				outcomeStatuses: expect.arrayContaining(['OPEN', 'WON']),
			})
		)
	})

	it('deselecting the only selected chip results in an empty outcomeStatuses array', () => {
		const defaults = getDefaultLeadBoardFilters()
		const onChange = vi.fn()

		render(<LeadsBoardFilters value={defaults} onChange={onChange} />)

		fireEvent.click(screen.getByRole('combobox'))
		fireEvent.click(screen.getByRole('option', { name: 'Abierto' }))

		expect(onChange).toHaveBeenCalledWith(
			expect.objectContaining({ outcomeStatuses: [] })
		)
	})

	it('renders a date range display for the default createdAtRange (dd/MM/yyyy pattern)', () => {
		const defaults = getDefaultLeadBoardFilters()
		const onChange = vi.fn()

		render(<LeadsBoardFilters value={defaults} onChange={onChange} />)

		expect(
			screen.getByText(/\d{2}\/\d{2}\/\d{4}/)
		).toBeInTheDocument()
	})
})
