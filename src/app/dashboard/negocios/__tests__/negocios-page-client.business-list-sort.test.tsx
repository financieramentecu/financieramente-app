import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { NegociosPageClient } from '../negocios-page-client'
import { UserRole } from '@/features/auth/lib/roles'
import type { Business } from '@/features/negocios/types/business.types'
import type { BusinessEntity } from '@/features/negocios/types/business-entity.types'
import {
	createMockBusiness,
	createMockClientInfo,
} from '@/features/negocios/__tests__/fixtures/mock-business'

const listCtx = vi.hoisted(() => ({
	mockBusinesses: [] as BusinessEntity[],
	mockRefetch: vi.fn(),
}))

vi.mock('next-auth/react', () => ({
	useSession: () => ({
		data: {
			user: {
				name: 'Admin',
				email: 'admin@test.com',
				role: UserRole.ADMIN,
			},
		},
		status: 'authenticated',
	}),
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}))

vi.mock('@/features/admin/users/hooks/use-debounce', () => ({
	useDebounce: (value: string) => value,
}))

vi.mock('@/features/negocios/hooks/use-businesses', () => ({
	useBusinesses: () => ({
		businesses: listCtx.mockBusinesses,
		isLoading: false,
		error: null,
		pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
		refetch: listCtx.mockRefetch,
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

vi.mock('@/features/shared/ui/alert-dialog', () => ({
	AlertDialog: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2>{children}</h2>
	),
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p>{children}</p>
	),
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
	AlertDialogAction: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
}))

vi.mock('@/features/negocios/components/MisNegociosPage', () => {
	const MisNegociosPage = ({ businessData = [] }: { businessData?: Business[] }) => (
		<table>
			<tbody>
				{businessData.map((b) => (
					<tr key={b.id} data-testid={`business-row-${b.contract}`}>
						<td>{b.contract}</td>
					</tr>
				))}
			</tbody>
		</table>
	)
	return {
		MisNegociosPage,
		default: MisNegociosPage,
	}
})

describe('NegociosPageClient - orden del listado por fecha de creación', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		const older = createMockBusiness({
			id: 100,
			contract: 'SORT-OLD',
			createdAt: '2019-03-01T12:00:00.000Z',
			client: createMockClientInfo({
				fullName: 'Cliente Antiguo',
				identityNumber: '1000000001',
			}),
		})
		const newer = createMockBusiness({
			id: 200,
			contract: 'SORT-NEW',
			createdAt: '2026-12-31T23:00:00.000Z',
			client: createMockClientInfo({
				fullName: 'Cliente Reciente',
				identityNumber: '2000000002',
			}),
		})
		listCtx.mockBusinesses.splice(0, listCtx.mockBusinesses.length, older, newer)
	})

	it('renderiza el listado con el negocio más reciente primero aunque el hook devuelva primero el más antiguo', async () => {
		const { container } = render(<NegociosPageClient />)

		await waitFor(() => {
			expect(screen.getByTestId('business-row-SORT-NEW')).toBeInTheDocument()
		})

		const tbody = container.querySelector('tbody')
		expect(tbody).toBeTruthy()
		const rows = tbody!.querySelectorAll('tr')
		expect(rows.length).toBe(2)
		expect(rows[0]).toHaveAttribute('data-testid', 'business-row-SORT-NEW')
		expect(rows[1]).toHaveAttribute('data-testid', 'business-row-SORT-OLD')
	})
})
