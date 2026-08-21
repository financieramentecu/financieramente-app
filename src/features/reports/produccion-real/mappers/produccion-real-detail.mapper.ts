/**
 * Maps Prisma Business rows to Producción Real detail DTOs.
 */

import { formatDateBogota } from '@/features/shared/lib/format-date'
import { coerceDecimal, convertBusinessValue } from '../lib/currency-conversion'
import {
	CONTRIBUTION_TYPE,
	type CurrencyMode,
	type ProduccionRealContributionType,
	type ProduccionRealDetailRow,
} from '../types/produccion-real.types'

export interface DetailBusinessSource {
	readonly idBusiness: number
	readonly value: unknown
	readonly status: string | null
	readonly idCurrency: number
	readonly createdAt: Date
	readonly dateIssued: Date | null
	readonly dateAnchored: Date | null
	readonly client: {
		readonly name: string
		readonly lastName: string | null
	}
	readonly user: {
		readonly name: string
		readonly lastName: string | null
	}
	readonly productPercentageCommission: {
		readonly productConfiguration: {
			readonly product: {
				readonly name: string
				readonly contributionType: ProduccionRealContributionType
				readonly company: { readonly name: string }
			}
		}
	}
}

function fullName(name: string, lastName: string | null | undefined): string {
	const last = lastName?.trim()
	return last ? `${name} ${last}`.trim() : name.trim()
}

function contributionTypeLabel(
	type: ProduccionRealContributionType
): string {
	return type === CONTRIBUTION_TYPE.UNICO ? 'Único' : 'Regular'
}

export function mapDetailRow(
	source: DetailBusinessSource,
	currencyMode: CurrencyMode,
	trmRate: number | null
): ProduccionRealDetailRow {
	const product = source.productPercentageCommission.productConfiguration.product
	const rawValue = coerceDecimal(source.value)
	const value = convertBusinessValue(
		rawValue,
		source.idCurrency,
		currencyMode,
		trmRate
	)

	return {
		idBusiness: source.idBusiness,
		createdAt: source.createdAt.toISOString(),
		createdAtLabel: formatDateBogota(source.createdAt),
		clientName: fullName(source.client.name, source.client.lastName),
		agentName: fullName(source.user.name, source.user.lastName),
		companyName: product.company.name,
		productName: product.name,
		contributionType: product.contributionType,
		contributionTypeLabel: contributionTypeLabel(product.contributionType),
		status: source.status,
		value,
		dateIssued: source.dateIssued ? source.dateIssued.toISOString() : null,
		dateIssuedLabel: formatDateBogota(source.dateIssued),
		dateAnchored: source.dateAnchored
			? source.dateAnchored.toISOString()
			: null,
		dateAnchoredLabel: formatDateBogota(source.dateAnchored),
		idCurrency: source.idCurrency,
	}
}
