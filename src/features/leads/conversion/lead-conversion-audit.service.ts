import type { Prisma } from '@prisma/client'
import { appendLeadActivityTx } from '@/features/leads/activities/lead-activity.service'

export interface AppendLeadConversionAuditInput {
	idLead: number
	idBusiness: number
	idUser: number
}

type ConversionActivityWriter = Pick<Prisma.TransactionClient, 'leadActivity'>

/**
 * Appends the two conversion facts only after the authoritative business/link
 * transaction has succeeded. Correlation ids are deterministic and distinct so
 * the database uniqueness constraint makes a replay safe without allowing the
 * CRM to create or mutate a Business itself.
 */
export async function appendLeadConversionAuditTx(
	tx: ConversionActivityWriter,
	input: AppendLeadConversionAuditInput
): Promise<void> {
	const baseCorrelationId = `lead-conversion:${input.idLead}:${input.idBusiness}`
	const payload = { businessId: input.idBusiness }

	await appendLeadActivityTx(tx, {
		idLead: input.idLead,
		idBusiness: input.idBusiness,
		idUser: input.idUser,
		type: 'CONVERTED',
		payload,
		correlationId: `${baseCorrelationId}:converted`,
	})
	await appendLeadActivityTx(tx, {
		idLead: input.idLead,
		idBusiness: input.idBusiness,
		idUser: input.idUser,
		type: 'BUSINESS_LINKED',
		payload,
		correlationId: `${baseCorrelationId}:business-linked`,
	})
}
