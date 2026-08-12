import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BusinessViewModal } from '@/features/negocios/components/modals/BusinessViewModal'
import type { BusinessEntity } from '@/features/negocios/types/business-entity.types'

// Mock the two Novedad action components — real ones make network calls and
// aren't relevant to this test, which only verifies BusinessViewModal forwards
// its onNovedadChange prop through to their onSuccess callback.
vi.mock('@/features/negocios/components/ui/NovedadActionButton', () => ({
	NovedadActionButton: ({
		onSuccess,
	}: {
		onSuccess?: (business: BusinessEntity) => void
	}) => (
		<button
			data-testid="mock-novedad-action-button"
			onClick={() => onSuccess?.({ id: 42, novedadStatus: 'NUEVA' } as BusinessEntity)}
		>
			mock mark/unmark
		</button>
	),
}))

vi.mock('@/features/negocios/components/ui/NovedadManageTrigger', () => ({
	NovedadManageTrigger: ({
		onSuccess,
	}: {
		onSuccess?: (business: BusinessEntity) => void
	}) => (
		<button
			data-testid="mock-novedad-manage-trigger"
			onClick={() => onSuccess?.({ id: 42, novedadStatus: 'DECLINADA' } as BusinessEntity)}
		>
			mock gestionar
		</button>
	),
}))

const mockBusiness = {
	id: 42,
	status: 'VENTA_EFECTUADA',
	novedadStatus: 'NUEVA',
	novedadMarkedAt: '2026-08-01T12:00:00.000Z',
	novedadResolvedAt: null,
	contract: 'CON-001',
	term: 12,
	value: 1000,
	createdAt: '2026-01-01T00:00:00.000Z',
	dateIssued: null,
	dateAnchored: null,
	numAportes: null,
	fundedAportes: 0,
	hasPayments: false,
	hasPendingPaymentFunding: false,
	supportCount: 0,
	observations: null,
	client: {
		id: 1,
		fullName: 'Cliente Test',
		name: 'Cliente',
		lastName: 'Test',
		identityNumber: '123',
		email: null,
		phone: null,
	},
	agent: {
		id: 1,
		fullName: 'Agente Test',
		roleName: 'AGENTE',
		categoryName: null,
		email: 'agente@test.com',
		phone: null,
	},
	product: { id: 1, name: 'Producto', companyId: 1, companyName: 'Compañía' },
	currency: { id: 1, name: 'USD' },
	periodicity: null,
	clientOrigin: { id: 1, name: 'Origen' },
} as unknown as BusinessEntity

describe('BusinessViewModal — novedad refresh wiring', () => {
	it('forwards NovedadActionButton onSuccess to onNovedadChange', () => {
		const onNovedadChange = vi.fn()
		render(
			<BusinessViewModal
				open
				onOpenChange={vi.fn()}
				business={mockBusiness}
				onNovedadChange={onNovedadChange}
			/>
		)

		fireEvent.click(screen.getByTestId('mock-novedad-action-button'))

		expect(onNovedadChange).toHaveBeenCalledWith(
			expect.objectContaining({ id: 42, novedadStatus: 'NUEVA' })
		)
	})

	it('forwards NovedadManageTrigger onSuccess to onNovedadChange', () => {
		const onNovedadChange = vi.fn()
		render(
			<BusinessViewModal
				open
				onOpenChange={vi.fn()}
				business={mockBusiness}
				onNovedadChange={onNovedadChange}
			/>
		)

		fireEvent.click(screen.getByTestId('mock-novedad-manage-trigger'))

		expect(onNovedadChange).toHaveBeenCalledWith(
			expect.objectContaining({ id: 42, novedadStatus: 'DECLINADA' })
		)
	})
})
