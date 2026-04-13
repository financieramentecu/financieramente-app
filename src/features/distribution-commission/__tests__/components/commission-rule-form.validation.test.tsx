import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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

const mockCategory2: Category = {
	...mockCategory,
	idCategory: 2,
	code: 'C2',
	name: 'Categoría dos',
}

vi.mock('@/features/categories/hooks/use-categories', () => ({
	useCategories: () => ({
		state: {
			status: 'success',
			data: {
				categories: [mockCategory, mockCategory2],
				pagination: {
					page: 1,
					pageSize: 100,
					total: 2,
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

	async function selectCategoryForRow(
		user: ReturnType<typeof userEvent.setup>,
		rowIndex: number,
		namePattern: RegExp
	) {
		const comboboxes = screen.getAllByRole('combobox')
		await user.click(comboboxes[rowIndex])
		const listbox = await screen.findByRole('listbox')
		await user.click(within(listbox).getByText(namePattern))
	}

	it('shows percentage FormMessage after blur when field cleared (RF-02)', async () => {
		const user = userEvent.setup()
		render(<CommissionRuleForm mode="create" productConfigId={1} />)

		await user.click(screen.getByRole('button', { name: /Agregar Categoría/i }))
		await selectCategoryForRow(user, 0, /Categoría demo/)

		const textboxes = screen.getAllByRole('textbox')
		const pctInput = textboxes[1]
		await user.clear(pctInput)
		await user.tab()

		expect(
			await screen.findByText(/El porcentaje debe ser un número/i)
		).toBeInTheDocument()
	})

	it('clears percentage field error after valid value and blur', async () => {
		const user = userEvent.setup()
		render(<CommissionRuleForm mode="create" productConfigId={1} />)

		await user.click(screen.getByRole('button', { name: /Agregar Categoría/i }))
		await selectCategoryForRow(user, 0, /Categoría demo/)

		const textboxes = screen.getAllByRole('textbox')
		const pctInput = textboxes[1]
		await user.clear(pctInput)
		await user.tab()

		await screen.findByText(/El porcentaje debe ser un número/i)

		await user.click(pctInput)
		await user.type(pctInput, '25')
		await user.tab()

		await waitFor(() => {
			expect(
				screen.queryByText(/El porcentaje debe ser un número/i)
			).not.toBeInTheDocument()
		})
	})

	it('shows inline error after blur for 0 and for above 100', async () => {
		const user = userEvent.setup()
		render(<CommissionRuleForm mode="create" productConfigId={1} />)

		await user.click(screen.getByRole('button', { name: /Agregar Categoría/i }))
		await selectCategoryForRow(user, 0, /Categoría demo/)

		const pctInput = screen.getAllByRole('textbox')[1]
		await user.clear(pctInput)
		await user.type(pctInput, '0')
		await user.tab()

		expect(
			await screen.findByText(/El porcentaje debe ser al menos 1/i)
		).toBeInTheDocument()

		await user.click(pctInput)
		await user.clear(pctInput)
		await user.type(pctInput, '101')
		await user.tab()

		expect(
			await screen.findByText(/El porcentaje no puede exceder 100/i)
		).toBeInTheDocument()
	})

	it('calls toast.error on submit when sum of percentages exceeds 100', async () => {
		const user = userEvent.setup()
		const { toast } = await import('sonner')

		render(<CommissionRuleForm mode="create" productConfigId={1} />)

		await user.click(screen.getByRole('button', { name: /Agregar Categoría/i }))
		await selectCategoryForRow(user, 0, /Categoría demo/)

		await user.click(screen.getByRole('button', { name: /Agregar Categoría/i }))
		await selectCategoryForRow(user, 1, /Categoría dos/)

		const textboxes = screen.getAllByRole('textbox')
		await user.clear(textboxes[1])
		await user.type(textboxes[1], '60')
		await user.clear(textboxes[2])
		await user.type(textboxes[2], '50')

		await user.click(
			screen.getByRole('button', { name: /Crear Distribución/i })
		)

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalled()
		})
		const sumCall = (toast.error as ReturnType<typeof vi.fn>).mock.calls.find(
			(call) =>
				String(call[0]).includes('Suma') ||
				String(call[1]?.description ?? '').includes('100')
		)
		expect(sumCall).toBeTruthy()
	})

	it('sets aria-invalid on percentage input when blurred invalid', async () => {
		const user = userEvent.setup()
		render(<CommissionRuleForm mode="create" productConfigId={1} />)

		await user.click(screen.getByRole('button', { name: /Agregar Categoría/i }))
		await selectCategoryForRow(user, 0, /Categoría demo/)

		const pctInput = screen.getAllByRole('textbox')[1]
		await user.clear(pctInput)
		await user.tab()

		await screen.findByText(/El porcentaje debe ser un número/i)
		expect(pctInput).toHaveAttribute('aria-invalid', 'true')
	})
})
