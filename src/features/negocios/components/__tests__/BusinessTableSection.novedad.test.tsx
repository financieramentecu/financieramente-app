import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BusinessTableSection } from '../BusinessTableSection'
import type { Business } from '@/features/negocios/types/business.types'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

vi.mock('@/features/shared/lib/format-date', () => ({
	formatDateBogota: (d: string | null | undefined) => (d ? `formatted:${d}` : '—'),
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}))

function buildBusiness(overrides: Partial<Business> = {}): Business {
	return {
		id: '1',
		identification: '123',
		clientName: 'Cliente Test',
		contract: 'PN0001',
		user: { avatar: '', name: 'Agente Test' },
		email: 'test@test.com',
		termPeriod: '12 meses',
		term: 12,
		periodicityName: 'Mensual',
		dateIssued: '2026-01-15T12:00:00.000Z',
		dateAnchored: '2026-02-15T12:00:00.000Z',
		novedadStatus: null,
		novedadMarkedAt: null,
		date: '2026-01-01T12:00:00.000Z',
		value: 1000,
		product: 'Producto',
		companyName: 'Compañía',
		clientOriginName: 'Origen',
		status: 'Venta Efectuado',
		statusCode: BUSINESS_STATUS.VENTA_EFECTUADA,
		hasPayments: false,
		hasPendingPaymentFunding: false,
		numAportes: null,
		supportCount: 1,
		observations: null,
		currency: { id: 1, name: 'COP' },
		...overrides,
	}
}

describe('BusinessTableSection — Novedad column', () => {
	it('renders "Novedad" and "Fecha de Novedad" column headers', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness()]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)
		expect(screen.getByText('Novedad')).toBeInTheDocument()
		expect(screen.getByText('Fecha de Novedad')).toBeInTheDocument()
	})

	it('renders an empty Novedad cell when novedadStatus is null', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness({ novedadStatus: null })]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)
		expect(screen.queryByText('Pendiente')).not.toBeInTheDocument()
		expect(screen.queryByText('Resuelta')).not.toBeInTheDocument()
	})

	it('renders "Pendiente" badge when novedadStatus is PENDIENTE', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness({ novedadStatus: 'PENDIENTE', novedadMarkedAt: '2026-07-30T12:00:00.000Z' })]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)
		expect(screen.getByText('Pendiente')).toBeInTheDocument()
		expect(screen.getByText('formatted:2026-07-30T12:00:00.000Z')).toBeInTheDocument()
	})

	it('renders "Resuelta" badge when novedadStatus is RESUELTA', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness({ novedadStatus: 'RESUELTA', novedadMarkedAt: '2026-07-30T12:00:00.000Z' })]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
			/>
		)
		expect(screen.getByText('Resuelta')).toBeInTheDocument()
	})
})
