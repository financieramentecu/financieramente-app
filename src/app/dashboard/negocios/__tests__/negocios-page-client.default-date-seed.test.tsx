import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
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

describe('NegociosPageClient — default date filter seed', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		navCtx.searchParams = new URLSearchParams()
	})

	// The seed is done by the Server Component (page.tsx) via
	// buildDefaultDateSeedQuery. Seeding from the client caused a second
	// navigation and a duplicated list/stats fetch on first load.
	it.each([
		UserRole.ADMIN,
		UserRole.ASISTENTE_GERENCIA_OPERATIVA,
		UserRole.ANALISTA_SOPORTE,
		UserRole.AGENTE,
		UserRole.DEFAULT,
	])('%s does not navigate on mount', (role) => {
		render(<NegociosPageClient currentUser={userWithRole(role)} />)

		expect(navCtx.mockReplace).not.toHaveBeenCalled()
	})
})
