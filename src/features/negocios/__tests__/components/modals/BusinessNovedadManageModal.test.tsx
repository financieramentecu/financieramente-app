import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BusinessNovedadManageModal } from '../../../components/modals/BusinessNovedadManageModal'
import { createMockBusiness } from '../../fixtures/mock-business'

const business = createMockBusiness({ id: 42, novedadStatus: 'NUEVA' })

describe('BusinessNovedadManageModal', () => {
	it('renders only the 4 manual options, never NUEVA', async () => {
		render(
			<BusinessNovedadManageModal
				open
				onOpenChange={vi.fn()}
				business={business}
				onConfirm={vi.fn()}
			/>
		)

		fireEvent.click(screen.getByRole('combobox'))

		await waitFor(() => {
			expect(screen.getByRole('option', { name: /Sometida a Devolución/i })).toBeInTheDocument()
		})
		expect(screen.getByRole('option', { name: /Declinada/i })).toBeInTheDocument()
		expect(screen.getByRole('option', { name: /Pendiente/i })).toBeInTheDocument()
		expect(screen.getByRole('option', { name: /Cancelada/i })).toBeInTheDocument()
		expect(screen.queryByRole('option', { name: /^Nueva$/i })).not.toBeInTheDocument()
	})

	it('shows the current novedad status', () => {
		render(
			<BusinessNovedadManageModal
				open
				onOpenChange={vi.fn()}
				business={business}
				onConfirm={vi.fn()}
			/>
		)
		expect(screen.getByText(/Nueva/i)).toBeInTheDocument()
	})

	it('disables confirm until a status is selected', () => {
		render(
			<BusinessNovedadManageModal
				open
				onOpenChange={vi.fn()}
				business={business}
				onConfirm={vi.fn()}
			/>
		)
		expect(screen.getByRole('button', { name: /Confirmar/i })).toBeDisabled()
	})

	it('calls onConfirm with the selected status and resets on close', async () => {
		const onConfirm = vi.fn().mockResolvedValue(undefined)
		const onOpenChange = vi.fn()

		render(
			<BusinessNovedadManageModal
				open
				onOpenChange={onOpenChange}
				business={business}
				onConfirm={onConfirm}
			/>
		)

		fireEvent.click(screen.getByRole('combobox'))
		const option = await screen.findByRole('option', { name: /Declinada/i })
		fireEvent.click(option)

		const confirmButton = screen.getByRole('button', { name: /Confirmar/i })
		await waitFor(() => expect(confirmButton).not.toBeDisabled())
		fireEvent.click(confirmButton)

		await waitFor(() => {
			expect(onConfirm).toHaveBeenCalledWith('DECLINADA')
		})
		await waitFor(() => {
			expect(onOpenChange).toHaveBeenCalledWith(false)
		})
	})

	it('renders nothing when business is null', () => {
		const { container } = render(
			<BusinessNovedadManageModal
				open
				onOpenChange={vi.fn()}
				business={null}
				onConfirm={vi.fn()}
			/>
		)
		expect(container).toBeEmptyDOMElement()
	})
})
