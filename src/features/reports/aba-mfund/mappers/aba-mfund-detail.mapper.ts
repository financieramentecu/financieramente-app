/**
 * Maps Prisma Business rows to ABA-MFUND detail DTOs.
 * Cliente = Nombre - Apellido (hyphen). Fecha de Fondeo = dateAnchored.
 */

import { formatDateBogota } from '@/features/shared/lib/format-date'
import {
	BUSINESS_STATUS,
	type BusinessStatus,
} from '@/features/negocios/types/business-entity.types'
import { coerceDecimal } from '../lib/coerce-decimal'
import { formatClientName } from '../lib/format-client-name'
import type { AbaMfundDetailRow } from '../types/aba-mfund.types'

function parseBusinessStatus(raw: string | null): BusinessStatus | null {
	if (!raw) return null
	for (const value of Object.values(BUSINESS_STATUS)) {
		if (raw === value) return value
	}
	return null
}

export interface AbaMfundDetailBusinessSource {
	readonly idBusiness: number
	readonly value: unknown
	readonly status: string | null
	readonly createdAt: Date
	readonly dateIssued: Date | null
	readonly dateAnchored: Date | null
	readonly client: {
		readonly name: string
		readonly lastName: string | null
	}
	readonly buyPeriodicity: {
		readonly name: string
	} | null
}

export function mapAbaMfundDetailRow(
	source: AbaMfundDetailBusinessSource
): AbaMfundDetailRow {
	return {
		idBusiness: source.idBusiness,
		createdAt: source.createdAt.toISOString(),
		createdAtLabel: formatDateBogota(source.createdAt),
		clientName: formatClientName(source.client.name, source.client.lastName),
		periodicityName: source.buyPeriodicity?.name ?? '',
		status: parseBusinessStatus(source.status),
		value: coerceDecimal(source.value),
		dateIssued: source.dateIssued ? source.dateIssued.toISOString() : null,
		dateIssuedLabel: formatDateBogota(source.dateIssued),
		dateAnchored: source.dateAnchored
			? source.dateAnchored.toISOString()
			: null,
		dateAnchoredLabel: formatDateBogota(source.dateAnchored),
	}
}
