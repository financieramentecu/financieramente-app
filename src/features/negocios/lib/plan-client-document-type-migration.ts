export const CITIZENSHIP_CARD_CODE = 'CC'

export interface CatalogDocumentTypeRef {
	idDocumentType: number
	code: string
}

export interface ClientDocumentTypeSource {
	idClient: number
	idDocumentType: number | null
	typeIdentity: string | null
	identityNumber?: string | null
}

export interface ClientDocumentTypeCollision {
	identityNumber: string
	nextTypeIdentity: string
	idClients: number[]
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
	collisions: ClientDocumentTypeCollision[]
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

interface ProjectedClientAssignment {
	idClient: number
	identityNumber: string | null
	alreadyAssigned: boolean
	idDocumentType: number | null
	nextTypeIdentity: string | null
	reason: ClientDocumentTypeAssignmentReason | null
	error: string | null
}

/**
 * Assigns a catalog id only when the client has none.
 * A stored code that matches the catalog is kept. Anything else becomes CC.
 * Clients that already have idDocumentType are skipped.
 * Two clients that would share (type, identity number) after that rewrite are
 * reported as collisions and are not assigned.
 */
export function planClientDocumentTypeMigration(
	clients: readonly ClientDocumentTypeSource[],
	catalog: readonly CatalogDocumentTypeRef[]
): ClientDocumentTypeMigrationPlan {
	const byCode = canonicalCatalog(catalog)
	const citizenshipCard = byCode.get(CITIZENSHIP_CARD_CODE)
	const projected = clients.map((client) =>
		projectClientAssignment(client, byCode, citizenshipCard)
	)
	const collisions = findIdentityCollisions(projected)
	const collidingClientIds = new Set(
		collisions.flatMap((collision) => collision.idClients)
	)
	const assignments: ClientDocumentTypeAssignment[] = []
	const errors: string[] = []
	let skipped = 0
	let preserved = 0
	let defaultedToCitizenshipCard = 0

	for (const client of projected) {
		if (client.alreadyAssigned) {
			skipped += 1
			continue
		}
		if (client.error) {
			errors.push(client.error)
			continue
		}
		if (
			collidingClientIds.has(client.idClient) ||
			client.reason == null ||
			client.idDocumentType == null ||
			client.nextTypeIdentity == null
		) {
			continue
		}

		assignments.push({
			idClient: client.idClient,
			idDocumentType: client.idDocumentType,
			typeIdentity: client.nextTypeIdentity,
			reason: client.reason,
		})
		if (client.reason === CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS.MATCHED_CODE) {
			preserved += 1
		} else {
			defaultedToCitizenshipCard += 1
		}
	}

	for (const collision of collisions) {
		errors.push(
			`Número ${collision.identityNumber}: quedaría duplicado como ${collision.nextTypeIdentity} en los clientes ${collision.idClients.join(', ')}`
		)
	}

	const found = clients.length - skipped
	return {
		found,
		migrated: assignments.length,
		skipped,
		preserved,
		defaultedToCitizenshipCard,
		errors,
		collisions,
		assignments,
	}
}

function projectClientAssignment(
	client: ClientDocumentTypeSource,
	byCode: ReadonlyMap<string, CatalogDocumentTypeRef>,
	citizenshipCard: CatalogDocumentTypeRef | undefined
): ProjectedClientAssignment {
	const identityNumber = client.identityNumber ?? null
	if (client.idDocumentType != null) {
		return {
			idClient: client.idClient,
			identityNumber,
			alreadyAssigned: true,
			idDocumentType: client.idDocumentType,
			nextTypeIdentity: client.typeIdentity,
			reason: null,
			error: null,
		}
	}

	const storedCode = client.typeIdentity?.trim().toUpperCase() ?? ''
	const matched = storedCode ? byCode.get(storedCode) : undefined
	if (matched) {
		return {
			idClient: client.idClient,
			identityNumber,
			alreadyAssigned: false,
			idDocumentType: matched.idDocumentType,
			nextTypeIdentity: matched.code,
			reason: CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS.MATCHED_CODE,
			error: null,
		}
	}

	if (!citizenshipCard) {
		return {
			idClient: client.idClient,
			identityNumber,
			alreadyAssigned: false,
			idDocumentType: null,
			nextTypeIdentity: null,
			reason: null,
			error: `Cliente ${client.idClient}: no existe Cédula de Ciudadanía (CC) en el catálogo`,
		}
	}

	return {
		idClient: client.idClient,
		identityNumber,
		alreadyAssigned: false,
		idDocumentType: citizenshipCard.idDocumentType,
		nextTypeIdentity: citizenshipCard.code,
		reason: CLIENT_DOCUMENT_TYPE_ASSIGNMENT_REASONS.DEFAULT_CC,
		error: null,
	}
}

function findIdentityCollisions(
	projected: readonly ProjectedClientAssignment[]
): ClientDocumentTypeCollision[] {
	const groups = new Map<string, ProjectedClientAssignment[]>()
	for (const client of projected) {
		if (client.identityNumber == null || client.nextTypeIdentity == null) {
			continue
		}
		const key = `${client.nextTypeIdentity.length}:${client.nextTypeIdentity}${client.identityNumber}`
		const group = groups.get(key) ?? []
		group.push(client)
		groups.set(key, group)
	}

	const collisions: ClientDocumentTypeCollision[] = []
	for (const group of groups.values()) {
		if (group.length < 2 || !group.some((client) => !client.alreadyAssigned)) {
			continue
		}
		const sample = group[0]
		if (sample.identityNumber == null || sample.nextTypeIdentity == null) {
			continue
		}
		collisions.push({
			identityNumber: sample.identityNumber,
			nextTypeIdentity: sample.nextTypeIdentity,
			idClients: group.map((client) => client.idClient),
		})
	}
	return collisions
}
