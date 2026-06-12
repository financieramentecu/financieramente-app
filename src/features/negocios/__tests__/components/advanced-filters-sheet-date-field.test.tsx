import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AdvancedFiltersSheet } from '@/features/negocios/components/AdvancedFiltersSheet'

const mockReplace = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: mockReplace }),
	useSearchParams: () => mockSearchParams,
}))

vi.mock('@/features/company/hooks/use-companies', () => ({
	useCompanies: () => ({ state: { status: 'loading' } }),
}))
vi.mock('@/features/product/hooks/use-products', () => ({
	useProducts: () => ({ state: { status: 'loading' } }),
}))
vi.mock('@/features/origins/hooks/use-client-origins', () => ({
	useClientOrigins: () => ({ state: { status: 'loading' } }),
}))
vi.mock('@/features/negocios/hooks/use-periodicities', () => ({
	usePeriodicities: () => ({ status: 'loading' }),
}))
vi.mock('@/features/negocios/hooks/use-business-terms', () => ({
	useBusinessTerms: () => ({ status: 'loading' }),
}))
vi.mock('@/features/negocios/hooks/use-agent-categories', () => ({
	useAgentCategories: () => ({ status: 'loading' }),
}))
vi.mock('@/features/negocios/hooks/use-money-strategists', () => ({
	useMoneyStrategists: () => ({ status: 'loading' }),
}))

// Render the picker value as plain text so the test can assert the draft range
vi.mock('@/features/shared/ui/date-range-picker', () => ({
	DateRangePicker: ({ value }: { value?: { from?: Date; to?: Date } }) => (
		<div data-testid="date-range-picker">
			{value?.from && value?.to
				? `${value.from.toISOString().slice(0, 10)}|${value.to.toISOString().slice(0, 10)}`
				: 'empty'}
		</div>
	),
}))

function openSheet() {
	fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
}

describe('AdvancedFiltersSheet — date field switching', () => {
	beforeEach(() => {
		mockReplace.mockClear()
		mockSearchParams = new URLSearchParams()
		mockSearchParams.set('dateFrom', '2026-06-01')
		mockSearchParams.set('dateTo', '2026-06-10')
	})

	it('keeps the selected range when switching the date field', () => {
		render(<AdvancedFiltersSheet />)
		openSheet()

		expect(screen.getByTestId('date-range-picker').textContent).toContain(
			'2026-06-01'
		)

		fireEvent.click(screen.getByRole('button', { name: 'Emisión' }))

		// Range must survive the field switch
		expect(screen.getByTestId('date-range-picker').textContent).toContain(
			'2026-06-01'
		)
	})

	it('applies the same range against the newly selected field params', async () => {
		render(<AdvancedFiltersSheet />)
		openSheet()

		fireEvent.click(screen.getByRole('button', { name: 'Emisión' }))
		fireEvent.click(screen.getByRole('button', { name: /aplicar/i }))

		await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1))
		const url = mockReplace.mock.calls[0][0] as string
		const params = new URLSearchParams(url.replace(/^\?/, ''))
		expect(params.get('dateIssuedFrom')).toBe('2026-06-01')
		expect(params.get('dateIssuedTo')).toBe('2026-06-10')
		// Old field params must be gone
		expect(params.get('dateFrom')).toBeNull()
		expect(params.get('dateTo')).toBeNull()
	})

	it('resyncs the draft form from URL params when reopened', () => {
		const { rerender } = render(<AdvancedFiltersSheet />)
		openSheet()
		// Close without applying
		fireEvent.keyDown(document, { key: 'Escape' })

		// URL changes externally (e.g. role default seed)
		mockSearchParams = new URLSearchParams()
		mockSearchParams.set('createdFrom', '2026-06-01')
		mockSearchParams.set('createdTo', '2026-06-05')
		rerender(<AdvancedFiltersSheet />)

		openSheet()
		expect(screen.getByTestId('date-range-picker').textContent).toContain(
			'2026-06-05'
		)
	})
})
