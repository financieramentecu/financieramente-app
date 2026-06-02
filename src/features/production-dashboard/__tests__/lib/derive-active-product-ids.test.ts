import { describe, it, expect } from 'vitest'
import { deriveActiveProductIds } from '../../lib/derive-active-product-ids'
import type { ProductForCascade } from '../../types/dashboard-filter.types'

const allProducts: ProductForCascade[] = [
  { idProduct: 10, idCompany: 1 },
  { idProduct: 20, idCompany: 2 },
  { idProduct: 30, idCompany: 2 },
  { idProduct: 40, idCompany: 3 },
]

describe('deriveActiveProductIds', () => {
  it('returns all selected products when selectedCompanyIds is empty (Todas)', () => {
    const result = deriveActiveProductIds([10, 20, 30], [], allProducts)
    expect(result).toEqual([10, 20, 30])
  })

  it('returns empty array when selectedProductIds is empty and companies selected', () => {
    const result = deriveActiveProductIds([], [1, 2], allProducts)
    expect(result).toEqual([])
  })

  it('drops products whose company is not in selectedCompanyIds', () => {
    // company 2 deselected → products 20 and 30 dropped
    const result = deriveActiveProductIds([10, 20, 30], [1], allProducts)
    expect(result).toEqual([10])
  })

  it('keeps products when their company is in selectedCompanyIds', () => {
    const result = deriveActiveProductIds([10, 20, 30], [1, 2], allProducts)
    expect(result).toEqual([10, 20, 30])
  })

  it('returns empty when no selected products match remaining companies', () => {
    // only company 3 selected, but selected products belong to companies 1 and 2
    const result = deriveActiveProductIds([10, 20], [3], allProducts)
    expect(result).toEqual([])
  })

  it('handles selectedProductIds already empty (no-op)', () => {
    const result = deriveActiveProductIds([], [], allProducts)
    expect(result).toEqual([])
  })

  it('ignores products not present in allProducts list', () => {
    // productId 99 is unknown — unknown products are dropped when companies are filtered
    const result = deriveActiveProductIds([10, 99], [1], allProducts)
    expect(result).toEqual([10])
  })
})
