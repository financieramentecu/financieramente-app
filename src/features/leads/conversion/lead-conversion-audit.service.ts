import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { appendLeadActivityTx } from '@/features/leads/activities/lead-activity.service'

export interface AppendLeadConversionAuditInput {
	idLead: number
	idBusiness: number
	idUser: number
}

type ConversionActivityWriter = Pick<Prisma.TransactionClient, 'leadActivity' | 'lead'>

/**
 * Appends the two conversion facts on the supplied writer. Correlation ids are
 * deterministic and distinct so the database uniqueness constraint makes a
 * replay safe without allowing the CRM to create or mutate a Business itself.
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

/**
 * Writes the conversion timeline after the business transaction has committed.
 * Callers must not invoke this inside that transaction: a failure here has to
 * stay independent of the business row.
 */
export async function appendLeadConversionAuditAfterCommit(
	input: AppendLeadConversionAuditInput
): Promise<void> {
	await prisma.$transaction((tx) => appendLeadConversionAuditTx(tx, input))
}
