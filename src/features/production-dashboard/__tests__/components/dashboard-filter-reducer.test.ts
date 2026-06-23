import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dashboardFilterReducer, buildInitialState } from '../../components/DashboardFilterContext'
import type { DashboardFilterState } from '../../types/dashboard-filter.types'
import type { ProductForCascade } from '../../types/dashboard-filter.types'

const allProducts: ProductForCascade[] = [
  { idProduct: 10, idCompany: 1 },
  { idProduct: 20, idCompany: 2 },
  { idProduct: 30, idCompany: 2 },
]

function makeState(overrides: Partial<DashboardFilterState['draft']> = {}): DashboardFilterState {
  const base = buildInitialState()
  return {
    ...base,
    draft: { ...base.draft, ...overrides },
    applied: { ...base.applied, ...overrides },
  }
}

describe('dashboardFilterReducer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('SET_DATE_RANGE', () => {
    it('updates draft.dateRange without touching applied', () => {
      const state = makeState()
      const newRange = { start: new Date(2025, 2, 1), end: new Date(2025, 8, 30) }
      const next = dashboardFilterReducer(state, { type: 'SET_DATE_RANGE', payload: newRange })
      expect(next.draft.dateRange).toEqual(newRange)
      expect(next.applied.dateRange).toEqual(state.applied.dateRange)
    })
  })

  describe('SET_STATUS', () => {
    it('sets statuses to the new value (single)', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, { type: 'SET_STATUS', payload: 'EMITIDO' })
      expect(next.draft.statuses).toEqual(['EMITIDO'])
      expect(next.applied.statuses).toEqual([])
    })
  })

  describe('TOGGLE_CATEGORY', () => {
    it('adds a category id when not present', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, { type: 'TOGGLE_CATEGORY', id: 5 })
      expect(next.draft.categoryIds).toEqual([5])
    })

    it('removes a category id when already present', () => {
      const state = makeState({ categoryIds: [5, 6] })
      const next = dashboardFilterReducer(state, { type: 'TOGGLE_CATEGORY', id: 5 })
      expect(next.draft.categoryIds).toEqual([6])
    })
  })

  describe('TOGGLE_COMPANY', () => {
    it('adds a company id when not present', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, {
        type: 'TOGGLE_COMPANY',
        id: 1,
        allProducts,
      })
      expect(next.draft.companyIds).toContain(1)
    })

    it('calls deriveActiveProductIds exactly once — no resolvedX2 smell', () => {
      const state = makeState({ companyIds: [1, 2], productIds: [10, 20, 30] })
      const next = dashboardFilterReducer(state, {
        type: 'TOGGLE_COMPANY',
        id: 2,
        allProducts,
      })
      // company 2 removed → products 20, 30 dropped
      expect(next.draft.companyIds).toEqual([1])
      expect(next.draft.productIds).toEqual([10])
    })

    it('resets productIds when companies become Todas ([])', () => {
      const state = makeState({ companyIds: [1], productIds: [10] })
      const next = dashboardFilterReducer(state, {
        type: 'TOGGLE_COMPANY',
        id: 1, // removing last company → Todas
        allProducts,
      })
      expect(next.draft.companyIds).toEqual([])
      expect(next.draft.productIds).toEqual([])
    })
  })

  describe('TOGGLE_PRODUCT', () => {
    it('toggles a product id', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, { type: 'TOGGLE_PRODUCT', id: 10 })
      expect(next.draft.productIds).toEqual([10])
    })
  })

  describe('TOGGLE_ORIGIN', () => {
    it('toggles an origin id', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, { type: 'TOGGLE_ORIGIN', id: 3 })
      expect(next.draft.originIds).toEqual([3])
    })
  })

  describe('SET_COMPANY_IDS', () => {
    it('preserves [] sentinel when productIds was already all', () => {
      // productIds=[] means "all products of the current company scope"
      // Changing companies should keep that sentinel — same as TOGGLE_COMPANY behaviour
      const state = makeState({ companyIds: [], productIds: [] })
      const next = dashboardFilterReducer(state, {
        type: 'SET_COMPANY_IDS',
        ids: [2],
        allProducts,
      })
      expect(next.draft.companyIds).toEqual([2])
      expect(next.draft.productIds).toEqual([])
    })

    it('drops products that no longer belong to the new company set', () => {
      const state = makeState({ companyIds: [1, 2], productIds: [10, 20, 30] })
      const next = dashboardFilterReducer(state, {
        type: 'SET_COMPANY_IDS',
        ids: [1],
        allProducts,
      })
      expect(next.draft.companyIds).toEqual([1])
      expect(next.draft.productIds).toEqual([10])
    })
  })

  describe('SET_PRODUCT_IDS', () => {
    it('sets productIds directly', () => {
      const state = makeState({ productIds: [] })
      const next = dashboardFilterReducer(state, { type: 'SET_PRODUCT_IDS', ids: [10, 20] })
      expect(next.draft.productIds).toEqual([10, 20])
    })
  })

  describe('SET_CATEGORY_IDS', () => {
    it('sets categoryIds directly', () => {
      const state = makeState({ categoryIds: [] })
      const next = dashboardFilterReducer(state, { type: 'SET_CATEGORY_IDS', ids: [3, 7] })
      expect(next.draft.categoryIds).toEqual([3, 7])
    })
  })

  describe('SET_ORIGIN_IDS', () => {
    it('sets originIds directly', () => {
      const state = makeState({ originIds: [] })
      const next = dashboardFilterReducer(state, { type: 'SET_ORIGIN_IDS', ids: [5] })
      expect(next.draft.originIds).toEqual([5])
    })
  })

  describe('SET_TODAS', () => {
    it('resets the specified array field to []', () => {
      const state = makeState({ categoryIds: [1, 2] })
      const next = dashboardFilterReducer(state, { type: 'SET_TODAS', field: 'categoryIds' })
      expect(next.draft.categoryIds).toEqual([])
    })

    it('resets companyIds to [] and also clears productIds', () => {
      const state = makeState({ companyIds: [1], productIds: [10] })
      const next = dashboardFilterReducer(state, { type: 'SET_TODAS', field: 'companyIds' })
      expect(next.draft.companyIds).toEqual([])
      expect(next.draft.productIds).toEqual([])
    })
  })

  describe('APPLY', () => {
    it('copies draft to applied when date range is valid', () => {
      const state = makeState({ categoryIds: [5] })
      // date range is default (valid)
      const next = dashboardFilterReducer(state, { type: 'APPLY' })
      expect(next.applied.categoryIds).toEqual([5])
      expect(next.draft).toEqual(next.applied)
    })

    it('does NOT apply when date range is invalid (start after end)', () => {
      const state = makeState({
        dateRange: {
          start: new Date(2025, 11, 1),
          end: new Date(2025, 0, 31),
        },
      })
      const originalApplied = state.applied
      const next = dashboardFilterReducer(state, { type: 'APPLY' })
      expect(next.applied).toEqual(originalApplied)
    })
  })

  describe('CLEAR', () => {
    it('resets both draft and applied to defaults', () => {
      const state = makeState({ categoryIds: [5], companyIds: [1] })
      const applied = { ...state.applied, categoryIds: [5] }
      const withApplied = { ...state, applied }
      const next = dashboardFilterReducer(withApplied, { type: 'CLEAR' })
      expect(next.draft.categoryIds).toEqual([])
      expect(next.applied.categoryIds).toEqual([])
    })
  })

  describe('SET_INTERNACIONAL', () => {
    it('sets isInternacional in draft only', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, { type: 'SET_INTERNACIONAL', value: true })
      expect(next.draft.isInternacional).toBe(true)
      expect(next.applied.isInternacional).toBe(false)
    })
  })

  describe('SET_PLAZO', () => {
    it('sets plazos to the given value', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, { type: 'SET_PLAZO', payload: 5 })
      expect(next.draft.plazos).toEqual([5])
    })
  })

  describe('SET_PERIODICIDAD', () => {
    it('sets periodicidades to the given value', () => {
      const state = makeState()
      const next = dashboardFilterReducer(state, { type: 'SET_PERIODICIDAD', payload: 'MENSUAL' })
      expect(next.draft.periodicidades).toEqual(['MENSUAL'])
    })
  })
})
