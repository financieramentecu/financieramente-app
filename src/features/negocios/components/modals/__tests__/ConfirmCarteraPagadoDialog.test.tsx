import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmCarteraPagadoDialog } from '../ConfirmCarteraPagadoDialog'

const TODAY_ISO = new Date().toISOString().slice(0, 10)

beforeEach(() => {
	vi.clearAllMocks()
})

describe('ConfirmCarteraPagadoDialog', () => {
	it('does not render when open=false', () => {
		render(
			<ConfirmCarteraPagadoDialog
				open={false}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
	})

	it('renders warning copy when open=true', () => {
		render(
			<ConfirmCarteraPagadoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		expect(
			screen.getByText(/La cartera cambiará a pagado/)
		).toBeInTheDocument()
	})

	it('date input defaults to today ISO', () => {
		render(
			<ConfirmCarteraPagadoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		const dateInput = screen.getByLabelText(/fecha/i) as HTMLInputElement
		expect(dateInput.value).toBe(TODAY_ISO)
	})

	it('calls onConfirm with the selected date when confirm button is clicked', () => {
		const onConfirm = vi.fn()
		render(
			<ConfirmCarteraPagadoDialog
				open={true}
				index={1}
				onConfirm={onConfirm}
				onCancel={vi.fn()}
			/>
		)
		const dateInput = screen.getByLabelText(/fecha/i)
		fireEvent.change(dateInput, { target: { value: '2025-05-15' } })
		fireEvent.click(screen.getByRole('button', { name: /confirmar pago/i }))
		expect(onConfirm).toHaveBeenCalledWith('2025-05-15')
	})

	it('calls onCancel when cancel button is clicked', () => {
		const onCancel = vi.fn()
		render(
			<ConfirmCarteraPagadoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={onCancel}
			/>
		)
		fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
		expect(onCancel).toHaveBeenCalledOnce()
	})

	it('renders Confirmar pago and Cancelar button labels', () => {
		render(
			<ConfirmCarteraPagadoDialog
				open={true}
				index={1}
				onConfirm={vi.fn()}
				onCancel={vi.fn()}
			/>
		)
		expect(screen.getByRole('button', { name: /confirmar pago/i })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
	})
})
