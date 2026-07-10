import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BusinessTableSection } from '../BusinessTableSection'
import { UserRole } from '@/features/auth/lib/roles'
import type { Business } from '@/features/negocios/types/business.types'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'

vi.mock('@/features/shared/lib/format-date', () => ({
	formatDateBogota: (d: string | null | undefined) => d ?? '—',
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
		date: '2026-01-01T12:00:00.000Z',
		value: 1000,
		product: 'Producto',
		companyName: 'Compañía',
		clientOriginName: 'Origen',
		status: 'Fondeado',
		statusCode: BUSINESS_STATUS.FONDEADO,
		hasPayments: false,
		hasPendingPaymentFunding: false,
		numAportes: null,
		supportCount: 1,
		observations: null,
		currency: { id: 1, name: 'COP' },
		...overrides,
	}
}

describe('BusinessTableSection — dateAnchored editable cell', () => {
	it('shows the edit button for a user with canFundPayments permission (ADMIN)', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness()]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				userRole={UserRole.ADMIN}
				onSaveDateAnchored={vi.fn()}
			/>
		)

		expect(
			screen.getByTitle('Editar fecha de fondeo')
		).toBeInTheDocument()
	})

	it('does not show the edit button for a user without canFundPayments permission (AGENTE)', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness()]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				userRole={UserRole.AGENTE}
				onSaveDateAnchored={vi.fn()}
			/>
		)

		expect(
			screen.queryByTitle('Editar fecha de fondeo')
		).not.toBeInTheDocument()
	})

	it('does not show the edit button when onSaveDateAnchored is not provided', () => {
		render(
			<BusinessTableSection
				data={[buildBusiness()]}
				onAddBusiness={vi.fn()}
				onEditBusiness={vi.fn()}
				userRole={UserRole.ADMIN}
			/>
		)

		expect(
			screen.queryByTitle('Editar fecha de fondeo')
		).not.toBeInTheDocument()
	})
})
