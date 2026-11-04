import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolveClientDocumentType } from '@/features/document-types/services/document-type.service'
import { normalizeDocumentCode } from '@/features/document-types/lib/normalize-document-code'
import type {
	PolicyholderInput,
	PolicyholderSearchResult,
	PolicyholderUpsertResult,
} from '@/features/policyholders/types/policyholder.types'

export class PolicyholderLinkError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PolicyholderLinkError'
	}
}

/**
 * Searches the policyholder catalog only. Client rows are never included.
 */
export async function searchPolicyholdersByDocument(
	query: string,
	limit: number
): Promise<PolicyholderSearchResult[]> {
	const rows = await prisma.policyholder.findMany({
		where: {
			active: true,
			identityNumber: { contains: query, mode: 'insensitive' },
		},
		orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
		take: limit,
		select: {
			idPolicyholder: true,
			name: true,
			lastName: true,
			typeIdentity: true,
			identityNumber: true,
			email: true,
			phone: true,
		},
	})

	return rows
}

/**
 * Creates or updates a policyholder inside the business transaction.
 * The link itself is stored on the business, not on the client.
 */
export async function upsertPolicyholder(
	tx: Prisma.TransactionClient,
	input: PolicyholderInput
): Promise<PolicyholderUpsertResult | { error: string }> {
	const typeIdentity = normalizeDocumentCode(input.typeIdentity)
	const identityNumber = input.identityNumber.trim().toUpperCase()
	const existing = await tx.policyholder.findFirst({
		where: { typeIdentity, identityNumber, active: true },
	})

	const resolved = await resolveClientDocumentType({
		code: typeIdentity,
		identityNumber,
		mode: existing ? 'update' : 'create',
		previousCode: existing?.typeIdentity,
	})
	if ('error' in resolved) {
		return resolved
	}

	const data = {
		name: input.name.trim(),
		lastName: input.lastName.trim(),
		email: input.email.trim(),
		phone: input.phone.trim(),
		typeIdentity: resolved.code,
		idDocumentType: resolved.idDocumentType,
		identityNumber,
	}

	if (existing) {
		const row = await tx.policyholder.update({
			where: { idPolicyholder: existing.idPolicyholder },
			data,
		})
		return { idPolicyholder: row.idPolicyholder, created: false }
	}

	const row = await tx.policyholder.create({ data: { ...data, active: true } })
	return { idPolicyholder: row.idPolicyholder, created: true }
}
