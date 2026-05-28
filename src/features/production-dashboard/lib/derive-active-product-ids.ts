import type { ProductForCascade } from '../types/dashboard-filter.types'

/**
 * Derives the effective product selection after a company toggle.
 *
 * Rules:
 * - If selectedCompanyIds is empty → keep all currently selected products (no constraint).
 * - Otherwise → drop products whose idCompany is not in selectedCompanyIds.
 *   Products not found in allProducts are also dropped when companies are filtered.
 *
 * Called ONCE per TOGGLE_COMPANY reducer branch — never duplicated in components.
 */
export function deriveActiveProductIds(
  selectedProductIds: number[],
  selectedCompanyIds: number[],
  allProducts: ProductForCascade[]
): number[] {
  if (selectedCompanyIds.length === 0) return selectedProductIds

  const companySet = new Set(selectedCompanyIds)
  const productCompanyMap = new Map(allProducts.map((p) => [p.idProduct, p.idCompany]))

  return selectedProductIds.filter((id) => {
    const companyId = productCompanyMap.get(id)
    return companyId !== undefined && companySet.has(companyId)
  })
}
