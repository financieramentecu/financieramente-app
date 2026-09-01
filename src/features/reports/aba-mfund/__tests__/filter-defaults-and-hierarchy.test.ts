import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { AbaMfundFilterApplied } from '../types/filter.types'

vi.mock('@/features/production-dashboard/components/HierarchySelectionContext', () => ({
	useHierarchySelection: vi.fn(),
}))

vi.mock(
	'@/features/reports/aba-mfund/components/aba-mfund-filter-context',
	() => ({
		useAbaMfundFilter: vi.fn(),
	})
)

vi.mock('@/features/reports/aba-mfund/lib/aba-mfund-api', () => ({
	fetchAbaMfundKpis: vi.fn(),
	fetchAbaMfundRanking: vi.fn(),
	fetchAbaMfundDetail: vi.fn(),
}))

import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import { useAbaMfundFilter } from '@/features/reports/aba-mfund/components/aba-mfund-filter-context'
import {
	fetchAbaMfundKpis,
	fetchAbaMfundRanking,
	fetchAbaMfundDetail,
} from '@/features/reports/aba-mfund/lib/aba-mfund-api'
import { useAbaMfundKpis } from '../hooks/use-aba-mfund-kpis'
import { useAbaMfundRanking } from '../hooks/use-aba-mfund-ranking'
import { useAbaMfundDetail } from '../hooks/use-aba-mfund-detail'
import {
	buildDefaultAbaMfundFilters,
	currentBogotaMonthDateStrings,
} from '../lib/default-filters'
import { ABA_MFUND_UI } from '../lib/ui-copy'
import { isAbaMfundDraftEqualToApplied } from '../lib/aba-mfund-filter-reducer'

const mockUseHierarchySelection = vi.mocked(useHierarchySelection)
const mockUseAbaMfundFilter = vi.mocked(useAbaMfundFilter)
const mockFetchKpis = vi.mocked(fetchAbaMfundKpis)
const mockFetchRanking = vi.mocked(fetchAbaMfundRanking)
const mockFetchDetail = vi.mocked(fetchAbaMfundDetail)

const applied: AbaMfundFilterApplied = {
	dateFrom: '2026-08-01',
	dateTo: '2026-08-31',
	statuses: [],
}

function setup(userIds: number[], appliedFilters = applied) {
	mockUseHierarchySelection.mockReturnValue({
		selectedUserIds: userIds,
		nodes: [],
		toggle: vi.fn(),
		dispatch: vi.fn(),
	} as never)
	mockUseAbaMfundFilter.mockReturnValue({
		draft: appliedFilters,
		applied: appliedFilters,
		dispatch: vi.fn(),
		isApplyEnabled: false,
		dateRangeError: undefined,
	})
}

describe('ABA-MFUND filter defaults', () => {
	it('defaults to current Bogotá month and Estado Todos (empty statuses)', () => {
		const now = new Date('2026-08-15T15:00:00.000Z')
		const defaults = buildDefaultAbaMfundFilters(now)
		const month = currentBogotaMonthDateStrings(now)

		expect(defaults.dateFrom).toBe(month.dateFrom)
		expect(defaults.dateTo).toBe(month.dateTo)
		expect(defaults.statuses).toEqual([])
		expect(month.dateFrom).toBe('2026-08-01')
		expect(month.dateTo).toBe('2026-08-31')
		expect(ABA_MFUND_UI.ALL).toBe('Todos')
		expect(ABA_MFUND_UI.HIERARCHY_ALL).toBe('Toda')
		expect(
			isAbaMfundDraftEqualToApplied(defaults, {
				dateFrom: defaults.dateFrom,
				dateTo: defaults.dateTo,
				statuses: [],
			})
		).toBe(true)
	})
})

describe('empty hierarchy short-circuits without fetch', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it('returns zero KPIs without API call when hierarchy is empty', async () => {
		setup([])

		const { result } = renderHook(() => useAbaMfundKpis())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(mockFetchKpis).not.toHaveBeenCalled()
		if (result.current.state.status === 'success') {
			expect(result.current.state.data.abaTotal.sum).toBe(0)
			expect(result.current.state.data.fondeado.count).toBe(0)
			expect(result.current.state.data.emitido.sum).toBe(0)
			expect(result.current.state.data.ticketPromedio).toBe(0)
		}
	})

	it('returns empty ranking without API call when hierarchy is empty', async () => {
		setup([])

		const { result } = renderHook(() => useAbaMfundRanking())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(mockFetchRanking).not.toHaveBeenCalled()
		if (result.current.state.status === 'success') {
			expect(result.current.state.data.agents).toEqual([])
		}
	})

	it('returns empty detail without API call when hierarchy is empty', async () => {
		setup([])

		const { result } = renderHook(() => useAbaMfundDetail())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(mockFetchDetail).not.toHaveBeenCalled()
		if (result.current.state.status === 'success') {
			expect(result.current.state.data.rows).toEqual([])
			expect(result.current.state.data.hasMore).toBe(false)
		}
	})

	it('fetches KPIs with selected hierarchy userIds', async () => {
		setup([10, 11])
		mockFetchKpis.mockResolvedValue({
			abaTotal: { sum: 1_000_000, count: 4 },
			fondeado: { sum: 250_000, count: 1 },
			emitido: { sum: 400_000, count: 2 },
			ticketPromedio: 250_000,
		})

		const { result } = renderHook(() => useAbaMfundKpis())

		await waitFor(() => {
			expect(result.current.state.status).toBe('success')
		})

		expect(mockFetchKpis).toHaveBeenCalledWith(
			expect.objectContaining({
				userIds: [10, 11],
				dateFrom: applied.dateFrom,
				dateTo: applied.dateTo,
			})
		)
		if (result.current.state.status === 'success') {
			expect(result.current.state.data.ticketPromedio).toBe(250_000)
		}
	})
})
