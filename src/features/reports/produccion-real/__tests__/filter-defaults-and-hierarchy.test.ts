import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { CURRENCY_MODE } from '@/features/reports/produccion-real/types/produccion-real.types'
import type { ProduccionRealFilterApplied } from '@/features/reports/produccion-real/types/filter.types'

vi.mock('@/features/production-dashboard/components/HierarchySelectionContext', () => ({
	useHierarchySelection: vi.fn(),
}))

vi.mock(
	'@/features/reports/produccion-real/components/produccion-real-filter-context',
	() => ({
		useProduccionRealFilter: vi.fn(),
	})
)

vi.mock('@/features/reports/produccion-real/lib/produccion-real-api', () => ({
	fetchProduccionRealKpis: vi.fn(),
}))

import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { useProduccionRealFilter } from '@/features/reports/produccion-real/components/produccion-real-filter-context'
import { fetchProduccionRealKpis } from '@/features/reports/produccion-real/lib/produccion-real-api'
import { useProduccionRealKpis } from '@/features/reports/produccion-real/hooks/use-produccion-real-kpis'
import {
	buildDefaultProduccionRealFilters,
	currentBogotaMonthDateStrings,
} from '@/features/reports/produccion-real/lib/default-filters'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)
const mockUseProduccionRealFilter = vi.mocked(useProduccionRealFilter)
const mockFetchKpis = vi.mocked(fetchProduccionRealKpis)

const applied: ProduccionRealFilterApplied = {
	dateFrom: '2026-08-01',
	dateTo: '2026-08-31',
	contributionTypes: [],
	companyIds: [],
	currencyMode: CURRENCY_MODE.ALL_TRM,
}

function setup(userIds: number[], appliedFilters = applied) {
	mockUseHierarchySelection.mockReturnValue({
		selectedUserIds: userIds,
		nodes: [],
		toggle: vi.fn(),
		dispatch: vi.fn(),
	} as never)
	mockUseProduccionRealFilter.mockReturnValue({
		draft: appliedFilters,
		applied: appliedFilters,
		dispatch: vi.fn(),
		isApplyEnabled: false,
		periodLabel: 'Ago 2026',
	} as never)
}

describe('filter defaults (Bogotá month / Todas / ALL_TRM)', () => {
	it('defaults to current Bogotá month, Tipo Todas, Compañía Todas, Moneda ALL_TRM', () => {
		const now = new Date('2026-08-15T15:00:00.000Z')
		const defaults = buildDefaultProduccionRealFilters(now)
		const month = currentBogotaMonthDateStrings(now)

		expect(defaults.dateFrom).toBe(month.dateFrom)
		expect(defaults.dateTo).toBe(month.dateTo)
		expect(defaults.contributionTypes).toEqual([])
		expect(defaults.companyIds).toEqual([])
		expect(defaults.currencyMode).toBe(CURRENCY_MODE.ALL_TRM)
	})
})

describe('useProduccionRealKpis hierarchy selection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns zero aggregates without API call when hierarchy is empty', async () => {
		setup([])

		const { result } = renderHook(() =>
			useProduccionRealKpis({
				trmRate: 4000,
				trmLoading: false,
				trmError: '',
			})
		)

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(mockFetchKpis).not.toHaveBeenCalled()
		if (result.current.state.status === 'success') {
			expect(result.current.state.data.produccionReal.sum).toBe(0)
			expect(result.current.state.data.regular.count).toBe(0)
			expect(result.current.state.data.fondeado.conversionPercent).toBe(0)
		}
	})

	it('fetches KPIs with selected hierarchy userIds', async () => {
		setup([10, 11])
		mockFetchKpis.mockResolvedValue({
			produccionReal: { sum: 150, count: 3 },
			regular: { sum: 100, count: 2 },
			unico: { sum: 50, count: 1 },
			fondeado: { sum: 75, count: 1, conversionPercent: 50 },
			currencyMode: CURRENCY_MODE.ALL_TRM,
			displayCurrencyCode: 'USD',
		})

		const { result } = renderHook(() =>
			useProduccionRealKpis({
				trmRate: 4000,
				trmLoading: false,
				trmError: '',
			})
		)

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(mockFetchKpis).toHaveBeenCalledWith(
			expect.objectContaining({
				userIds: [10, 11],
				currencyMode: CURRENCY_MODE.ALL_TRM,
				trmRate: 4000,
			})
		)
		if (result.current.state.status === 'success') {
			expect(result.current.state.data.produccionReal.sum).toBe(150)
			expect(result.current.state.data.fondeado.conversionPercent).toBe(50)
		}
	})
})
