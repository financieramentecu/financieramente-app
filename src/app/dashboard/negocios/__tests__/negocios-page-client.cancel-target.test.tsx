import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NegociosPageClient } from '../negocios-page-client'
import type { Business } from '@/features/negocios/types/business.types'

const {
	mockCancelBusiness,
	mockGetById,
	mockRefetchBusinesses,
	mockRefetchStats,
} = vi.hoisted(() => ({
	mockCancelBusiness: vi.fn(),
	mockGetById: vi.fn(),
	mockRefetchBusinesses: vi.fn(),
	mockRefetchStats: vi.fn(),
}))

vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
	useSearchParams: () => new URLSearchParams(),
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
		refetch: mockRefetchBusinesses,
	}),
}))

vi.mock('@/features/negocios/hooks/use-business-stats', () => ({
	useBusinessStats: () => ({
		stats: null,
		isLoading: false,
		error: null,
		refetch: mockRefetchStats,
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
		cancelBusiness: mockCancelBusiness,
		isCancelling: false,
		fondearBusiness: vi.fn(),
		fondearAnualidadesBusiness: vi.fn(),
		isFondeando: false,
		isFondeandoAnualidades: false,
	}),
}))

vi.mock('@/features/negocios/services/business.service', () => ({
	businessService: {
		getById: mockGetById,
		getAnnualPayments: vi.fn(),
	},
}))

vi.mock('@/features/negocios/components/MisNegociosPage', () => {
	const MisNegociosPage = ({
		onCancelBusiness,
	}: {
		onCancelBusiness?: (business: Business) => void
	}) => (
		<div>
			<button type="button" onClick={() => onCancelBusiness?.(createBusinessRow('101'))}>
				cancel-101
			</button>
			<button type="button" onClick={() => onCancelBusiness?.(createBusinessRow('202'))}>
				cancel-202
			</button>
		</div>
	)
	return { MisNegociosPage, default: MisNegociosPage }
})

vi.mock('@/features/negocios/components/modals/FundDirectFundingModal', () => ({
	FundDirectFundingModal: ({
		open,
		onConfirm,
		onOpenChange,
	}: {
		open: boolean
		onConfirm: (date: string) => void
		onOpenChange: (open: boolean) => void
	}) =>
		open ? (
			<div>
				<p>direct-funding-modal-open</p>
				<button type="button" onClick={() => onConfirm('2026-06-15')}>
					fund-direct-confirm
				</button>
				<button type="button" onClick={() => onOpenChange(false)}>
					fund-direct-cancel
				</button>
			</div>
		) : null,
}))

vi.mock('@/features/negocios/components/modals/BusinessViewModal', () => ({
	BusinessViewModal: () => null,
}))

vi.mock('@/features/negocios/components/modals/BusinessCancelModal', () => ({
	BusinessCancelModal: ({
		open,
		business,
		onOpenChange,
		onConfirm,
	}: {
		open: boolean
		business: { id: number | string } | null
		onOpenChange: (open: boolean) => void
		onConfirm: (reason: string) => void
	}) =>
		open ? (
			<div>
				<p>cancel-modal-for-{business ? String(business.id) : 'none'}</p>
				<button type="button" onClick={() => onConfirm('Motivo de prueba suficientemente largo')}>
					confirm-cancel
				</button>
				<button type="button" onClick={() => onOpenChange(false)}>
					close-cancel
				</button>
			</div>
		) : null,
}))

vi.mock('@/features/negocios/components/modals/FundingModal', () => ({
	FundingModal: ({ open }: { open: boolean }) =>
		open ? <div>annual-funding-modal-open</div> : null,
}))

vi.mock('@/features/shared/ui/alert-dialog', () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode
		open: boolean
	}) => (open ? <div>{children}</div> : null),
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
	AlertDialogCancel: ({
		children,
		disabled,
		onClick,
	}: {
		children: React.ReactNode
		disabled?: boolean
		onClick?: () => void
	}) => (
		<button type="button" disabled={disabled} onClick={onClick}>
			{children}
		</button>
	),
	AlertDialogAction: ({
		children,
		disabled,
		onClick,
	}: {
		children: React.ReactNode
		disabled?: boolean
		onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
	}) => (
		<button type="button" disabled={disabled} onClick={onClick}>
			{children}
		</button>
	),
}))

function createBusinessRow(id: string): Business {
	return {
		id,
		identification: '123',
		samePolicyholder: 'Sí',
		clientName: 'Cliente Demo',
		contract: '—',
		user: { avatar: '', name: 'Agente Demo', categoryName: null },
		email: 'demo@test.com',
		termPeriod: '12/Mensual',
		term: 12,
		periodicityName: 'Mensual',
		dateIssued: null,
		dateAnchored: null,
		novedadStatus: null,
		novedadMarkedAt: null,
		date: '2026-05-31T10:00:00.000Z',
		value: 1000,
		product: 'Producto',
		companyName: 'Compania',
		clientOriginName: 'Origen',
		status: 'Venta Efectuado',
		statusCode: 'VENTA_EFECTUADA',
		hasPayments: false,
		hasPendingPaymentFunding: false,
		numAportes: null,
		supportCount: 0,
		commentCount: 0,
		observations: null,
		currency: { id: 1, name: 'COP' },
	}
}

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((r) => {
		resolve = r
	})
	return { promise, resolve }
}

describe('NegociosPageClient - cancel modal target', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockCancelBusiness.mockResolvedValue({})
	})

	it('ignores a late getById response for a previously opened business', async () => {
		const user = userEvent.setup()
		const first = deferred<{ data: { id: number } }>()
		const second = deferred<{ data: { id: number } }>()
		mockGetById.mockImplementation((id: number) =>
			id === 101 ? first.promise : second.promise,
		)

		render(<NegociosPageClient />)

		await user.click(screen.getByRole('button', { name: 'cancel-101' }))
		await user.click(screen.getByRole('button', { name: 'close-cancel' }))
		await user.click(screen.getByRole('button', { name: 'cancel-202' }))

		second.resolve({ data: { id: 202 } })
		await act(async () => {
			first.resolve({ data: { id: 101 } })
			await first.promise
		})

		expect(screen.getByText('cancel-modal-for-202')).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: 'confirm-cancel' }))

		await waitFor(() => expect(mockCancelBusiness).toHaveBeenCalledTimes(1))
		expect(Number(mockCancelBusiness.mock.calls[0][0])).toBe(202)
	})

	it('does not reopen the modal when a response arrives after it was closed', async () => {
		const user = userEvent.setup()
		const pending = deferred<{ data: { id: number } }>()
		mockGetById.mockReturnValue(pending.promise)

		render(<NegociosPageClient />)

		await user.click(screen.getByRole('button', { name: 'cancel-101' }))
		await user.click(screen.getByRole('button', { name: 'close-cancel' }))

		await act(async () => {
			pending.resolve({ data: { id: 101 } })
			await pending.promise
		})

		expect(screen.queryByText(/cancel-modal-for-/)).not.toBeInTheDocument()
		expect(mockCancelBusiness).not.toHaveBeenCalled()
	})
})
