import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NegociosPageClient } from '../negocios-page-client'
import { UserRole } from '@/features/auth/lib/roles'
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

const mockUseBusinesses = vi.hoisted(() => vi.fn())

vi.mock('@/features/negocios/hooks/use-businesses', () => ({
	useBusinesses: (params: unknown) => {
		mockUseBusinesses(params)
		return {
			businesses: [],
			isLoading: false,
			error: null,
			pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
			refetch: vi.fn(),
		}
	},
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
	const MisNegociosPage = (props: { onPageChange: (page: number) => void }) => (
		<div data-testid="mis-negocios">
			<button onClick={() => props.onPageChange(2)}>go-to-page-2</button>
		</div>
	)
	return { MisNegociosPage, default: MisNegociosPage }
})

function userWithRole(code: string): UserWithRole {
	return { idUser: 1, role: { code } } as unknown as UserWithRole
}

describe('NegociosPageClient — page resets when an advanced filter is applied', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// DEFAULT role: no auto-seeded date filter, keeps the repro isolated.
		navCtx.searchParams = new URLSearchParams()
	})

	it('resets the local page back to 1 when a new date filter lands in the URL while on page 2+', () => {
		const { rerender } = render(
			<NegociosPageClient currentUser={userWithRole(UserRole.DEFAULT)} />
		)

		// User navigates to page 2 of the unfiltered list.
		fireEvent.click(screen.getByText('go-to-page-2'))
		expect(mockUseBusinesses).toHaveBeenLastCalledWith(
			expect.objectContaining({ page: 2 })
		)

		// User applies a date filter via AdvancedFiltersSheet — this lands in the
		// URL (and resets the URL's own `page` param to '1'), simulated here by
		// updating navCtx.searchParams and re-rendering.
		navCtx.searchParams = new URLSearchParams({
			dateIssuedFrom: '2026-06-01',
			dateIssuedTo: '2026-06-10',
			page: '1',
		})
		rerender(<NegociosPageClient currentUser={userWithRole(UserRole.DEFAULT)} />)

		// The actual fetch must use page 1 — otherwise it requests an offset
		// beyond the (smaller) filtered result set and silently returns nothing.
		expect(mockUseBusinesses).toHaveBeenLastCalledWith(
			expect.objectContaining({ page: 1, dateIssuedFrom: '2026-06-01', dateIssuedTo: '2026-06-10' })
		)
	})
})
