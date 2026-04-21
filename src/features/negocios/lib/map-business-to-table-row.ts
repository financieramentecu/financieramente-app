import type { Business } from '@/features/negocios/types/business.types'
import {
	BUSINESS_STATUS,
	type BusinessEntity,
} from '@/features/negocios/types/business-entity.types'

function getBusinessStatusLabel(status: string): Business['status'] {
	switch (status) {
		case BUSINESS_STATUS.EMITIDO:
			return 'Emitido'
		case BUSINESS_STATUS.VENTA_EFECTUADA:
			return 'Venta Efectuado'
		case BUSINESS_STATUS.LIQUIDADO:
			return 'Liquidado'
		case BUSINESS_STATUS.CANCELADO:
			return 'Cancelado'
		case BUSINESS_STATUS.FONDEADO:
			return 'Fondeado'
		default:
			return status as Business['status']
	}
}

export function mapBusinessToTableRow(b: BusinessEntity): Business {
	return {
		id: String(b.id),
		identification: b.client.identityNumber,
		clientName: b.client.fullName,
		contract: b.contract || '-',
		user: {
			avatar: '',
			name: b.agent.fullName,
			categoryName: b.agent.roleName,
		},
		email: b.client.email || '',
		termPeriod: `${b.term || 0}/${b.periodicity?.name || ''}`,
		term: b.term,
		periodicityName: b.periodicity?.name ?? null,
		dateIssued: b.dateIssued,
		dateAnchored: b.dateAnchored,
		date: b.createdAt,
		value: b.value,
		product: b.product.name,
		companyName: b.product.companyName,
		clientOriginName: b.clientOrigin.name,
		status: getBusinessStatusLabel(b.status),
		statusCode: b.status,
		hasAnnualPayments: b.hasAnnualPayments,
		hasPendingAnnualFunding: b.hasPendingAnnualFunding,
		currency: b.currency,
	}
}
