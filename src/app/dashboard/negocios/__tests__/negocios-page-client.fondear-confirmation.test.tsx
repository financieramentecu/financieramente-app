import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NegociosPageClient } from '../negocios-page-client'
import type { Business } from '@/features/negocios/types/business.types'

const {
	mockFondearBusiness,
	mockFondearAnualidadesBusiness,
	mockGetAnnualPayments,
	mockRefetchBusinesses,
	mockRefetchStats,
} = vi.hoisted(() => ({
	mockFondearBusiness: vi.fn(),
	mockFondearAnualidadesBusiness: vi.fn(),
	mockGetAnnualPayments: vi.fn(),
	mockRefetchBusinesses: vi.fn(),
	mockRefetchStats: vi.fn(),
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
		cancelBusiness: vi.fn(),
		isCancelling: false,
		fondearBusiness: mockFondearBusiness,
		fondearAnualidadesBusiness: mockFondearAnualidadesBusiness,
		isFondeando: false,
		isFondeandoAnualidades: false,
	}),
}))

vi.mock('@/features/negocios/services/business.service', () => ({
	businessService: {
		getById: vi.fn(),
		getAnnualPayments: mockGetAnnualPayments,
	},
}))

vi.mock('@/features/negocios/components/MisNegociosPage', () => ({
	MisNegociosPage: ({
		onFondearBusiness,
	}: {
		onFondearBusiness?: (business: Business) => void
	}) => (
		<div>
			<button
				type="button"
				onClick={() => onFondearBusiness?.(createBusinessRow('direct'))}
			>
				trigger-fondear-direct
			</button>
			<button
				type="button"
				onClick={() => onFondearBusiness?.(createBusinessRow('annual'))}
			>
				trigger-fondear-annual
			</button>
		</div>
	),
}))

vi.mock('@/features/negocios/components/modals/BusinessViewModal', () => ({
	BusinessViewModal: () => null,
}))

vi.mock('@/features/negocios/components/modals/BusinessCancelModal', () => ({
	BusinessCancelModal: () => null,
}))

vi.mock('@/features/negocios/components/modals/AnnualFundingModal', () => ({
	AnnualFundingModal: ({ open }: { open: boolean }) =>
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

function createBusinessRow(mode: 'direct' | 'annual'): Business {
	return {
		id: mode === 'direct' ? '101' : '202',
		identification: '123',
		clientName: 'Cliente Demo',
		contract: mode === 'direct' ? 'PN001' : 'PN002',
		user: { avatar: '', name: 'Agente Demo', categoryName: null },
		email: 'demo@test.com',
		termPeriod: '12/Mensual',
		term: 12,
		periodicityName: 'Mensual',
		dateIssued: null,
		dateAnchored: null,
		date: '2026-05-31T10:00:00.000Z',
		value: 1000,
		product: 'Producto',
		companyName: 'Compania',
		clientOriginName: 'Origen',
		status: 'Emitido',
		statusCode: 'EMITIDO',
		hasAnnualPayments: mode === 'annual',
		hasPendingAnnualFunding: mode === 'annual',
		currency: { id: 1, name: 'COP' },
	}
}

describe('NegociosPageClient - confirmacion de fondeo', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetAnnualPayments.mockResolvedValue({
			data: { installments: [] },
		})
		mockFondearBusiness.mockResolvedValue({})
	})

	it('muestra confirmacion antes de fondear negocio directo', async () => {
		const user = userEvent.setup()
		render(<NegociosPageClient />)

		await user.click(screen.getByRole('button', { name: 'trigger-fondear-direct' }))

		expect(screen.getByText('¿Confirmar fondeo?')).toBeInTheDocument()
		expect(mockFondearBusiness).not.toHaveBeenCalled()
	})

	it('no ejecuta fondeo directo cuando el usuario cancela confirmacion', async () => {
		const user = userEvent.setup()
		render(<NegociosPageClient />)

		await user.click(screen.getByRole('button', { name: 'trigger-fondear-direct' }))
		await user.click(screen.getByRole('button', { name: 'Cancelar' }))

		expect(mockFondearBusiness).not.toHaveBeenCalled()
	})

	it('muestra loader y bloquea acciones mientras confirma fondeo directo', async () => {
		let resolveFondear: (() => void) | undefined
		mockFondearBusiness.mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveFondear = () => resolve({})
				})
		)

		const user = userEvent.setup()
		render(<NegociosPageClient />)

		await user.click(screen.getByRole('button', { name: 'trigger-fondear-direct' }))
		await user.click(screen.getByRole('button', { name: 'Confirmar' }))

		expect(screen.getByText('Procesando...')).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled()

		resolveFondear?.()
		await waitFor(() => {
			expect(mockFondearBusiness).toHaveBeenCalledTimes(1)
		})
	})

	it('omite confirmacion y abre flujo anual cuando el negocio tiene anualidades', async () => {
		const user = userEvent.setup()
		render(<NegociosPageClient />)

		await user.click(screen.getByRole('button', { name: 'trigger-fondear-annual' }))

		expect(screen.queryByText('¿Confirmar fondeo?')).not.toBeInTheDocument()
		expect(mockGetAnnualPayments).toHaveBeenCalledWith(202)
		expect(await screen.findByText('annual-funding-modal-open')).toBeInTheDocument()
		expect(mockFondearBusiness).not.toHaveBeenCalled()
	})
})
