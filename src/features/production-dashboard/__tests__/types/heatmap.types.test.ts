/**
 * Type-guard tests for heatmap types.
 * These tests verify correct shape via `satisfies` — they are compile-time and runtime guards.
 */

import { describe, it, expect } from 'vitest'
import type {
  HeatmapRaw,
  HeatmapQueryParams,
  PersonRow,
  CompanyColumn,
  CategoryLegendItem,
  HeatmapViewModel,
} from '../../types/production-kpi.types'

describe('HeatmapRaw — shape contract', () => {
  it('satisfies HeatmapRaw with correct fields', () => {
    const raw = {
      idUser: 1,
      fullName: 'Ana García',
      levelCode: 'MS_SENIOR',
      levelOrder: 2,
      levelColor: '#333333',
      categoryName: 'Categoría A',
      idCategory: 10,
      cells: [
        { idCompany: 5, companyName: 'Empresa X', copTotal: 1000000, foreignUsdTotal: 0, count: 2 },
      ],
    } satisfies HeatmapRaw

    expect(raw.idUser).toBe(1)
    expect(raw.cells).toHaveLength(1)
    expect(raw.cells[0].copTotal).toBe(1000000)
  })

  it('allows idCategory to be null', () => {
    const raw = {
      idUser: 2,
      fullName: 'Carlos López',
      levelCode: 'MS_JUNIOR',
      levelOrder: 1,
      levelColor: '#444444',
      categoryName: '',
      idCategory: null,
      cells: [],
    } satisfies HeatmapRaw

    expect(raw.idCategory).toBeNull()
    expect(raw.cells).toHaveLength(0)
  })
})

describe('HeatmapQueryParams — excludes isInternacional', () => {
  it('satisfies HeatmapQueryParams with required fields only', () => {
    const params = {
      userIds: [1, 2, 3],
      appliedFilters: {
        dateRange: { start: new Date('2026-01-01'), end: new Date('2026-01-31') },
        statuses: [],
        categoryIds: [],
        companyIds: [],
        productIds: [],
        originIds: [],
        plazos: [],
        periodicidades: [],
        isInternacional: false,
      },
    } satisfies HeatmapQueryParams

    expect(params.userIds).toHaveLength(3)
    // isInternacional is NOT a field on HeatmapQueryParams itself
    // (it lives inside appliedFilters only, and we discard it at the service boundary)
    expect('isInternacional' in params).toBe(false)
  })
})

describe('PersonRow — shape contract', () => {
  it('satisfies PersonRow with cellsByCompany as ReadonlyMap', () => {
    const row = {
      idUser: 1,
      fullName: 'Ana García',
      levelCode: 'MS_SENIOR',
      levelOrder: 2,
      levelColor: '#333333',
      categoryName: 'Categoría A',
      cellsByCompany: new Map([[5, { usdTotal: 217.39, copTotal: 1000000, count: 2 }]]) as ReadonlyMap<number, { usdTotal: number; copTotal: number; count: number }>,
    } satisfies PersonRow

    expect(row.cellsByCompany.get(5)?.usdTotal).toBeCloseTo(217.39)
  })
})

describe('CompanyColumn — shape contract', () => {
  it('satisfies CompanyColumn with totalUsd and maxUsd', () => {
    const col = {
      idCompany: 5,
      companyName: 'Empresa X',
      totalUsd: 1500,
      maxUsd: 800,
    } satisfies CompanyColumn

    expect(col.maxUsd).toBe(800)
    expect(col.totalUsd).toBe(1500)
  })
})

describe('CategoryLegendItem — shape contract', () => {
  it('satisfies CategoryLegendItem with categoryName and levelColor', () => {
    const item = {
      categoryName: 'Categoría A',
      levelColor: '#333333',
    } satisfies CategoryLegendItem

    expect(item.categoryName).toBe('Categoría A')
    expect(item.levelColor).toBe('#333333')
  })
})

describe('HeatmapViewModel — shape contract', () => {
  it('satisfies HeatmapViewModel with rows, companyColumns, and legend', () => {
    const viewModel = {
      rows: [] as ReadonlyArray<PersonRow>,
      companyColumns: [] as ReadonlyArray<CompanyColumn>,
      legend: [] as ReadonlyArray<CategoryLegendItem>,
    } satisfies HeatmapViewModel

    expect(viewModel.rows).toHaveLength(0)
    expect(viewModel.companyColumns).toHaveLength(0)
    expect(viewModel.legend).toHaveLength(0)
  })
})
