/**
 * Maps ranking-embedded businesses to heatmap CellBusinessRowView.
 */

import {
	BUSINESS_STATUS,
	type BusinessStatus,
} from '@/features/negocios/types/business-entity.types'
import type { CellBusinessRowView } from '@/features/production-dashboard/types/heatmap-cell-expansion.types'
import { coerceDecimal } from '../lib/coerce-decimal'
import { MFUND_EXCLUSION } from '../types/aba-mfund.types'

export interface AbaMfundRankingBusinessSource {
	readonly idBusiness: number
	readonly contract: string | null
	readonly value: unknown
	readonly status: string | null
	readonly currency: {
		readonly name: string
	}
	readonly productPercentageCommission: {
		readonly productConfiguration: {
			readonly product: {
				readonly name: string
				readonly company: { readonly name: string }
			}
		}
	}
}

function toBusinessStatus(raw: string | null): BusinessStatus {
	for (const value of Object.values(BUSINESS_STATUS)) {
		if (raw === value) return value
	}
	return BUSINESS_STATUS.VENTA_EFECTUADA
}

export function mapRankingBusinessToCellRow(
	source: AbaMfundRankingBusinessSource
): CellBusinessRowView {
	const product = source.productPercentageCommission.productConfiguration.product

	return {
		idBusiness: source.idBusiness,
		companyName: product.company.name || MFUND_EXCLUSION.COMPANY_NAME,
		productName: product.name,
		contract: source.contract,
		value: coerceDecimal(source.value),
		currencyName: source.currency.name,
		status: toBusinessStatus(source.status),
	}
}
