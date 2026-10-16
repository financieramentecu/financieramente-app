export const CITIZENSHIP_CARD_CODE = 'CC'

export interface CatalogDocumentTypeRef {
	idDocumentType: number
	code: string
}

export interface ClientDocumentTypeSource {
	idClient: number
	idDocumentType: number | null
	typeIdentity: string | null
}

export const CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS = {
	MATCHED_CODE: 'matched_code',
	DEFAULT_CC: 'default_cc',
} as const

export type ClientDocumentTypeAssignmentReason =
	(typeof CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS)[keyof typeof CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS]

export interface ClientDocumentTypeAssignment {
	idClient: number
	idDocumentType: number
	typeIdentity: string
	reason: ClientDocumentTypeAssignmentReason
}

export interface ClientDocumentTypeMigrationPlan {
	found: number
	migrated: number
	skipped: number
	preserved: number
	defaultedToCitizenshipCard: number
	errors: string[]
	assignments: ClientDocumentTypeAssignment[]
}

function canonicalCatalog(
	catalog: readonly CatalogDocumentTypeRef[]
): Map<string, CatalogDocumentTypeRef> {
	const byCode = new Map<string, CatalogDocumentTypeRef>()
	const ordered = [...catalog].sort(
		(left, right) => left.idDocumentType - right.idDocumentType
	)
	for (const documentType of ordered) {
		const key = documentType.code.trim().toUpperCase()
		if (!key || byCode.has(key)) {
			continue
		}
		byCode.set(key, documentType)
	}
	return byCode
}

/**
 * Assigns a catalog id only when the client has none.
 * A stored code that matches the catalog is kept. Anything else becomes CC.
 * Clients that already have idDocumentType are skipped.
 */
export function planClientDocumentTypeMigration(
	clients: readonly ClientDocumentTypeSource[],
	catalog: readonly CatalogDocumentTypeRef[]
): ClientDocumentTypeMigrationPlan {
	const byCode = canonicalCatalog(catalog)
	const citizenshipCard = byCode.get(CITIZENSHIP_CARD_CODE)
	const assignments: ClientDocumentTypeAssignment[] = []
	const errors: string[] = []
	let skipped = 0
	let preserved = 0
	let defaultedToCitizenshipCard = 0

	for (const client of clients) {
		if (client.idDocumentType != null) {
			skipped += 1
			continue
		}

		const storedCode = client.typeIdentity?.trim().toUpperCase() ?? ''
		const matched = storedCode ? byCode.get(storedCode) : undefined
		if (matched) {
			assignments.push({
				idClient: client.idClient,
				idDocumentType: matched.idDocumentType,
				typeIdentity: matched.code,
				reason: CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS.MATCHED_CODE,
			})
			preserved += 1
			continue
		}

		if (!citizenshipCard) {
			errors.push(
				`Cliente ${client.idClient}: no existe Cédula de Ciudadanía (CC) en el catálogo`
			)
			continue
		}

		assignments.push({
			idClient: client.idClient,
			idDocumentType: citizenshipCard.idDocumentType,
			typeIdentity: citizenshipCard.code,
			reason: CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS.DEFAULT_CC,
		})
		defaultedToCitizenshipCard += 1
	}

	const found = clients.length - skipped
	return {
		found,
		migrated: assignments.length,
		skipped,
		preserved,
		defaultedToCitizenshipCard,
		errors,
		assignments,
	}
}
