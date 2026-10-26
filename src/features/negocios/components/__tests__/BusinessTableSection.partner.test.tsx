import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BusinessTableSection } from '../BusinessTableSection'
import type { Business } from '@/features/negocios/types/business.types'
import { BUSINESS_STATUS } from '@/features/negocios/types/business-entity.types'
import { UserRole } from '@/features/auth/lib/roles'

const rowActionProps = vi.hoisted(() => ({
	calls: [] as Array<Record<string, unknown>>,
}))

vi.mock('../BusinessRowActions', () => ({
	BusinessRowActions: (props: Record<string, unknown>) => {
		rowActionProps.calls.push(props)
		return <div data-testid="row-actions" />
	},
}))

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
		dateAnchored: null,
		novedadStatus: null,
		novedadMarkedAt: null,
		date: '2026-01-01T12:00:00.000Z',
		value: 1000,
		product: 'Producto',
		companyName: 'Compañía',
		clientOriginName: 'Origen',
		status: 'Emitido',
		statusCode: BUSINESS_STATUS.EMITIDO,
		hasPayments: true,
		hasPendingPaymentFunding: true,
		numAportes: 2,
		supportCount: 0,
		commentCount: 0,
		observations: null,
		currency: { id: 1, name: 'COP' },
		...overrides,
	}
}

function renderAs(role: UserRole, row: Business) {
	return render(
		<BusinessTableSection
			data={[row]}
			onAddBusiness={vi.fn()}
			onEditBusiness={vi.fn()}
			onCancelBusiness={vi.fn()}
			onFondearBusiness={vi.fn()}
			userRole={role}
		/>
	)
}

describe('BusinessTableSection — owner roles (PA-04, NEG-03)', () => {
	beforeEach(() => {
		rowActionProps.calls = []
	})

	it.each([BUSINESS_STATUS.VENTA_EFECTUADA, BUSINESS_STATUS.EMITIDO])(
		'never offers cancel to a PARTNER (status %s)',
		(statusCode) => {
			renderAs(UserRole.PARTNER, buildBusiness({ statusCode }))
			expect(rowActionProps.calls.length).toBeGreaterThan(0)
			expect(rowActionProps.calls[0].onCancel).toBeUndefined()
		}
	)

	it('keeps denying cancel to an AGENTE and offering it to ADMIN (regression)', () => {
		renderAs(UserRole.AGENTE, buildBusiness())
		expect(rowActionProps.calls[0].onCancel).toBeUndefined()

		rowActionProps.calls = []
		renderAs(UserRole.ADMIN, buildBusiness())
		expect(rowActionProps.calls[0].onCancel).toBeTypeOf('function')
	})

	it('shows the read-only "Ver Fondeo" toolbar action to a PARTNER like to an agent, never "Fondear"', () => {
		renderAs(UserRole.PARTNER, buildBusiness())
		expect(screen.getByText('Ver Fondeo')).toBeInTheDocument()
		expect(screen.queryByText('Fondear')).not.toBeInTheDocument()
	})

	it('shows no fondeo action to a PARTNER when the business has no payments yet', () => {
		renderAs(UserRole.PARTNER, buildBusiness({ hasPayments: false }))
		expect(screen.queryByText('Ver Fondeo')).not.toBeInTheDocument()
		expect(screen.queryByText('Fondear')).not.toBeInTheDocument()
	})
})
