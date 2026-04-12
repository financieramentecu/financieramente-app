import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Category } from '@/features/categories/types/category.types'
import { CommissionRuleForm } from '@/features/distribution-commission/components/commission-rule-form'

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))

vi.mock('sonner', () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/features/distribution-commission/hooks/use-commission-rule-mutations', () => ({
	useCommissionRuleMutations: () => ({
		create: vi.fn(),
		update: vi.fn(),
		isCreating: false,
		isUpdating: false,
		toggleActive: vi.fn(),
		assignNewBusinesses: vi.fn(),
		isToggling: false,
		isAssigning: false,
		error: '',
		reset: vi.fn(),
	}),
}))

const mockCategory: Category = {
	idCategory: 1,
	code: 'C1',
	name: 'Categoría demo',
	typeCategory: 'MMS',
	descripcion: null,
	status: true,
	beneficiaryMode: 'UPLINE_CHAIN',
	idFixedBeneficiaryUser: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
}

vi.mock('@/features/categories/hooks/use-categories', () => ({
	useCategories: () => ({
		state: {
			status: 'success',
			data: {
				categories: [mockCategory],
				pagination: {
					page: 1,
					pageSize: 100,
					total: 1,
					totalPages: 1,
				},
			},
			error: '',
		},
		refetch: vi.fn(),
	}),
}))

describe('CommissionRuleForm — validation presentation', () => {
	it('shows destructive FormMessage and aria-invalid on category when row is invalid', async () => {
		const user = userEvent.setup()
		render(<CommissionRuleForm mode="create" productConfigId={1} />)

		await user.click(screen.getByRole('button', { name: /Agregar Categoría/i }))
		await user.click(
			screen.getByRole('button', { name: /Crear Distribución/i })
		)

		const alerts = screen.getAllByRole('alert')
		const categoryError = alerts.find((el) =>
			el.textContent?.includes('Categoría inválida')
		)
		expect(categoryError).toBeTruthy()
		expect(categoryError).toHaveClass('text-destructive')

		const triggers = screen.getAllByRole('combobox')
		expect(triggers[0]).toHaveAttribute('aria-invalid', 'true')
	})
})
