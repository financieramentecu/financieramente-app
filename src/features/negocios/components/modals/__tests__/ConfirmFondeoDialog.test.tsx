import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmFondeoDialog } from '../ConfirmFondeoDialog'

const TODAY_ISO = new Date().toISOString().slice(0, 10)

beforeEach(() => {
	vi.clearAllMocks()
})

describe('ConfirmFondeoDialog', () => {
	it('does not render when open=false', () => {
		render(
			<ConfirmFondeoDialog
				open={false}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('renders title and date input when open=true', () => {
		render(
			<ConfirmFondeoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		expect(screen.getByRole('dialog')).toBeInTheDocument()
		expect(screen.getByLabelText(/fecha de fondeo/i)).toBeInTheDocument()
	})

	it('date input defaults to today ISO', () => {
		render(
			<ConfirmFondeoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		const dateInput = screen.getByLabelText(/fecha de fondeo/i) as HTMLInputElement
		expect(dateInput.value).toBe(TODAY_ISO)
	})

	it('confirm button is disabled when date is empty', () => {
		render(
			<ConfirmFondeoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		const dateInput = screen.getByLabelText(/fecha de fondeo/i)
		fireEvent.change(dateInput, { target: { value: '' } })
		const confirmBtn = screen.getByRole('button', { name: /confirmar fondeo/i })
		expect(confirmBtn).toBeDisabled()
	})

	it('calls onConfirm with the selected date when confirm is clicked', () => {
		const onConfirm = vi.fn()
		render(
			<ConfirmFondeoDialog
				open={true}
				index={1}
				onConfirm={onConfirm}
				onCancel={vi.fn()}
			/>
		)
		const dateInput = screen.getByLabelText(/fecha de fondeo/i)
		fireEvent.change(dateInput, { target: { value: '2024-01-15' } })
		fireEvent.click(screen.getByRole('button', { name: /confirmar fondeo/i }))
		expect(onConfirm).toHaveBeenCalledWith('2024-01-15')
	})

	it('calls onCancel when cancel button is clicked', () => {
		const onCancel = vi.fn()
		render(
			<ConfirmFondeoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={onCancel}
			/>
		)
		fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
		expect(onCancel).toHaveBeenCalledOnce()
	})
})
