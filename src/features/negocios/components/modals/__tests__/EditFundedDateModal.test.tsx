import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the hook before importing component
vi.mock('../../../hooks/use-update-funded-date', () => ({
	useUpdateFundedDate: vi.fn(() => ({
		state: { status: 'idle', data: undefined, error: '' },
		updateFundedDate: vi.fn(),
	})),
}))

import { EditFundedDateModal } from '../EditFundedDateModal'
import { useUpdateFundedDate } from '../../../hooks/use-update-funded-date'
import { bogotaDateOnly } from '../../../lib/bogota-date'

const mockUpdateFundedDate = vi.fn()

beforeEach(() => {
	vi.clearAllMocks()
	vi.mocked(useUpdateFundedDate).mockReturnValue({
		state: { status: 'idle', data: undefined, error: '' },
		updateFundedDate: mockUpdateFundedDate,
	})
})

describe('EditFundedDateModal', () => {
	it('renders date input defaulting to today when open', () => {
		const today = bogotaDateOnly(new Date())
		render(
			<EditFundedDateModal
				open={true}
				businessId={10}
				index={1}
				onSuccess={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		const input = document.getElementById('funded-date-input') as HTMLInputElement
		expect(input).not.toBeNull()
		expect(input.value).toBe(today)
	})

	it('calls updateFundedDate with selected date on confirm', async () => {
		mockUpdateFundedDate.mockResolvedValue({
			ok: true,
			data: { installmentIndex: 1, status: 'FONDEADO', dateAnchored: '2026-06-15T12:00:00.000Z', expectedDate: null, portfolioDate: null, earlyPaymentDate: null, portfolioPaymentDate: null },
		})

		render(
			<EditFundedDateModal
				open={true}
				businessId={10}
				index={1}
				onSuccess={vi.fn()}
				onCancel={vi.fn()}
			/>
		)

		// Change date
		const input = document.getElementById('funded-date-input') as HTMLInputElement
		fireEvent.change(input, { target: { value: '2026-06-15' } })

		// Click confirm (loading state shows "Guardando...")
		fireEvent.click(screen.getByRole('button', { name: /confirmar|guardando/i }))

		expect(mockUpdateFundedDate).toHaveBeenCalledWith('2026-06-15')
	})

	it('shows loading state while request is in progress', () => {
		vi.mocked(useUpdateFundedDate).mockReturnValue({
			state: { status: 'loading', data: undefined, error: '' },
			updateFundedDate: mockUpdateFundedDate,
		})

		render(
			<EditFundedDateModal
				open={true}
				businessId={10}
				index={1}
				onSuccess={vi.fn()}
				onCancel={vi.fn()}
			/>
		)

		// Confirm button shows "Guardando..." and is disabled during loading
		const confirmBtn = screen.getByRole('button', { name: /guardando/i })
		expect(confirmBtn).toBeDisabled()
	})

	it('shows error message when state is error', () => {
		vi.mocked(useUpdateFundedDate).mockReturnValue({
			state: { status: 'error', data: undefined, error: 'El aporte no está en estado FONDEADO' },
			updateFundedDate: mockUpdateFundedDate,
		})

		render(
			<EditFundedDateModal
				open={true}
				businessId={10}
				index={1}
				onSuccess={vi.fn()}
				onCancel={vi.fn()}
			/>
		)

		expect(screen.getByText(/El aporte no está en estado FONDEADO/i)).toBeInTheDocument()
	})

	it('calls onCancel when cancel button is clicked', () => {
		const onCancel = vi.fn()
		render(
			<EditFundedDateModal
				open={true}
				businessId={10}
				index={1}
				onSuccess={vi.fn()}
				onCancel={onCancel}
			/>
		)

		fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it('does not render when open is false', () => {
		render(
			<EditFundedDateModal
				open={false}
				businessId={10}
				index={1}
				onSuccess={vi.fn()}
				onCancel={vi.fn()}
			/>
		)

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})
})
