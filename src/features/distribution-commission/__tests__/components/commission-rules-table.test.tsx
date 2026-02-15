import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommissionRulesTable } from '../../components/commission-rules-table'
import type { CommissionRule } from '../../types/commission-rule.types'

const assignNewBusinesses = vi.fn()
const toggleActive = vi.fn()

vi.mock('../../hooks/use-commission-rule-mutations', () => ({
	useCommissionRuleMutations: (
		_productConfigId: number,
		onSuccess?: () => void
	) => ({
		toggleActive,
		assignNewBusinesses: async (ruleId: number) => {
			const result = await assignNewBusinesses(ruleId)
			if (result) {
				onSuccess?.()
			}
			return result
		},
	}),
}))

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

const mockRule = (overrides?: Partial<CommissionRule>): CommissionRule => ({
	id: 10,
	idProductConfiguration: 1,
	description: 'Distribución Test',
	active: true,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	categories: [],
	isDefaultForNewBusinesses: false,
	...overrides,
})

describe('CommissionRulesTable', () => {
	it('notifies assignment success to refresh the list', async () => {
		const onAssignmentSuccess = vi.fn()
		assignNewBusinesses.mockResolvedValueOnce(true)

		render(
			<CommissionRulesTable
				data={[mockRule()]}
				productConfigId={1}
				onAssignmentSuccess={onAssignmentSuccess}
			/>
		)

		const user = userEvent.setup()
		await user.click(
			screen.getByRole('button', { name: /abrir menú/i })
		)
		await user.click(
			await screen.findByRole('menuitem', {
				name: /Asignar a Nuevos Negocios/i,
			})
		)

		await waitFor(() => {
			expect(assignNewBusinesses).toHaveBeenCalledWith(10)
			expect(onAssignmentSuccess).toHaveBeenCalled()
		})
	})
})
