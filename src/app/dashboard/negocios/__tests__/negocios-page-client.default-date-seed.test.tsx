import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { NegociosPageClient } from '../negocios-page-client'
import { UserRole } from '@/features/auth/lib/roles'
import { getCurrentMonthRange } from '@/features/negocios/lib/default-date-filter'
import type { UserWithRole } from '@/features/negocios/types/business.types'

const navCtx = vi.hoisted(() => ({
	mockReplace: vi.fn(),
	searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: navCtx.mockReplace,
	}),
	useSearchParams: () => navCtx.searchParams,
}))

vi.mock('@/features/admin/users/hooks/use-debounce', () => ({
	useDebounce: (value: string) => value,
}))

vi.mock('@/features/negocios/hooks/use-businesses', () => ({
	useBusinesses: () => ({
		businesses: [],
		isLoading: false,
		error: null,
		pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
		refetch: vi.fn(),
	}),
}))

vi.mock('@/features/negocios/hooks/use-business-stats', () => ({
	useBusinessStats: () => ({
		stats: null,
		isLoading: false,
		error: null,
		refetch: vi.fn(),
	}),
}))

vi.mock('@/features/negocios/hooks/use-business-export', () => ({
	useBusinessExport: () => ({
		exportReport: vi.fn(),
		isExporting: false,
		error: null,
	}),
}))

vi.mock('@/features/negocios/hooks/use-business-mutation', () => ({
	useBusinessMutation: () => ({
		cancelBusiness: vi.fn(),
		isCancelling: false,
		fondearBusiness: vi.fn(),
		fondearAnualidadesBusiness: vi.fn(),
		isFondeando: false,
		isFondeandoAnualidades: false,
	}),
}))

vi.mock('@/features/negocios/services/business.service', () => ({
	businessService: {
		getById: vi.fn(),
		getAnnualPayments: vi.fn(),
	},
}))

vi.mock('@/features/negocios/components/modals/BusinessViewModal', () => ({
	BusinessViewModal: () => null,
}))

vi.mock('@/features/negocios/components/modals/BusinessCancelModal', () => ({
	BusinessCancelModal: () => null,
}))

vi.mock('@/features/negocios/components/modals/FundingModal', () => ({
	FundingModal: () => null,
}))

vi.mock('@/features/negocios/components/MisNegociosPage', () => {
	const MisNegociosPage = () => <div data-testid="mis-negocios" />
	return { MisNegociosPage, default: MisNegociosPage }
})

function userWithRole(code: string): UserWithRole {
	return { idUser: 1, role: { code } } as unknown as UserWithRole
}

function seededParams(): URLSearchParams {
	expect(navCtx.mockReplace).toHaveBeenCalledTimes(1)
	const url = navCtx.mockReplace.mock.calls[0][0] as string
	return new URLSearchParams(url.replace(/^\?/, ''))
}

describe('NegociosPageClient — role-based default date filter seed', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		navCtx.searchParams = new URLSearchParams()
	})

	it.each([
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
	])('%s seeds creation date params (current month) into the URL', (role) => {
		render(<NegociosPageClient currentUser={userWithRole(role)} />)

		const { from, to } = getCurrentMonthRange()
		const params = seededParams()
		expect(params.get('createdFrom')).toBe(from)
		expect(params.get('createdTo')).toBe(to)
		expect(params.get('dateFrom')).toBeNull()
	})

	it('AGENTE seeds creation date params (current month) into the URL', () => {
		render(<NegociosPageClient currentUser={userWithRole(UserRole.AGENTE)} />)

		const { from, to } = getCurrentMonthRange()
		const params = seededParams()
		expect(params.get('createdFrom')).toBe(from)
		expect(params.get('createdTo')).toBe(to)
		expect(params.get('dateFrom')).toBeNull()
	})

	it('does not seed when the URL already carries a date filter', () => {
		navCtx.searchParams = new URLSearchParams({
			dateIssuedFrom: '2026-01-01',
			dateIssuedTo: '2026-01-31',
		})

		render(<NegociosPageClient currentUser={userWithRole(UserRole.ADMIN)} />)

		expect(navCtx.mockReplace).not.toHaveBeenCalled()
	})

	it('does not seed for roles without a default date filter', () => {
		render(<NegociosPageClient currentUser={userWithRole(UserRole.DEFAULT)} />)

		expect(navCtx.mockReplace).not.toHaveBeenCalled()
	})

	it('does not seed when there is no current user', () => {
		render(<NegociosPageClient />)

		expect(navCtx.mockReplace).not.toHaveBeenCalled()
	})
})
