import { describe, it, expect, vi } from 'vitest'

vi.mock('../../components/HierarchySelectionContext', () => ({
	useHierarchySelection: vi.fn(),
}))
vi.mock('../../components/DashboardFilterContext', () => ({
	useDashboardFilter: vi.fn(),
}))
vi.mock('next-auth/react', () => ({ useSession: vi.fn() }))

import { pivotToViewModel } from '../../hooks/use-heatmap-table'
import type { HeatmapRaw } from '../../types/production-kpi.types'

function makeRaw(
	overrides: Partial<HeatmapRaw> & { idUser: number }
): HeatmapRaw {
	return {
		fullName: `User ${overrides.idUser}`,
		levelCode: 'MS_SENIOR',
		levelOrder: 2,
		levelColor: '#333',
		isPartner: false,
		categoryName: 'Cat A',
		idCategory: 1,
		cells: [
			{
				idCompany: 5,
				companyName: 'Empresa X',
				copTotal: 0,
				foreignUsdTotal: 100,
				count: 1,
			},
		],
		...overrides,
	}
}

const partner = (idUser: number, fullName: string, usd = 50): HeatmapRaw =>
	makeRaw({
		idUser,
		fullName,
		levelCode: 'PARTNER_EXTERNAL',
		levelOrder: 0,
		isPartner: true,
		cells: [
			{
				idCompany: 5,
				companyName: 'Empresa X',
				copTotal: 0,
				foreignUsdTotal: usd,
				count: 2,
			},
		],
	})

describe('pivotToViewModel - partner split (PD-02, PD-03)', () => {
	it('keeps partners out of the agent rows and sorts them by name', () => {
		const vm = pivotToViewModel(
			[
				makeRaw({ idUser: 1, fullName: 'Ana' }),
				partner(20, 'Zoe Partner'),
				partner(21, 'Bruno Partner'),
				makeRaw({ idUser: 2, fullName: 'Carlos', levelOrder: 3 }),
			],
			4000
		)

		expect(vm.rows.map((r) => r.idUser)).toEqual([2, 1])
		expect(vm.partnerRows.map((r) => r.idUser)).toEqual([21, 20])
	})

	it('includes partner production in the company column totals and max', () => {
		const vm = pivotToViewModel(
			[makeRaw({ idUser: 1 }), partner(20, 'Pia', 250)],
			4000
		)

		expect(vm.companyColumns).toHaveLength(1)
		expect(vm.companyColumns[0]).toMatchObject({
			idCompany: 5,
			totalUsd: 350,
			maxUsd: 250,
		})
	})

	it('has no partner rows when no partner is present (block omitted)', () => {
		const vm = pivotToViewModel(
			[makeRaw({ idUser: 1 }), makeRaw({ idUser: 2 })],
			4000
		)

		expect(vm.partnerRows).toEqual([])
		expect(vm.rows).toHaveLength(2)
	})

	it('shows a partner-only result (partner own dashboard) as plain rows without a Partners block', () => {
		const vm = pivotToViewModel([partner(20, 'Pia')], 4000)

		expect(vm.rows.map((r) => r.idUser)).toEqual([20])
		expect(vm.partnerRows).toEqual([])
		expect(vm.companyColumns[0].totalUsd).toBe(50)
	})

	it('builds the legend from every visible row, partners included', () => {
		const vm = pivotToViewModel(
			[
				makeRaw({ idUser: 1, categoryName: 'Cat A', levelColor: '#111' }),
				{ ...partner(20, 'Pia'), categoryName: 'Partner', levelColor: '#999' },
			],
			4000
		)

		expect(vm.legend.map((l) => l.categoryName)).toEqual(['Cat A', 'Partner'])
	})
})
