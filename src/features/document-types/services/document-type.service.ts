import type { DocumentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	AuditAction,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import { lengthRangeError } from '@/features/document-types/lib/length-range'
import {
	normalizeDocumentCode,
	normalizeDocumentName,
} from '@/features/document-types/lib/normalize-document-code'
import { keepsStoredIdentity } from '@/features/document-types/lib/keeps-stored-identity'
import { validateIdentityAgainstDocumentType } from '@/features/document-types/lib/validate-identity'
import {
	toDocumentTypeDto,
	toDocumentTypeOption,
} from '@/features/document-types/mappers/document-type.mapper'
import type {
	CreateDocumentTypeInput,
	DocumentTypeDto,
	DocumentTypeOption,
	UpdateDocumentTypeInput,
} from '@/features/document-types/types/document-type.types'

export interface DocumentTypeAuditContext {
	userId?: number
	email?: string
	ipAddress?: string
	userAgent?: string
}

export type DocumentTypeMutationResult =
	| { documentType: DocumentTypeDto }
	| { error: string }

function hasDocumentTypeDelegate(): boolean {
	return 'documentType' in prisma && prisma.documentType != null
}

async function findDuplicateName(
	name: string,
	excludeId?: number
): Promise<DocumentType | null> {
	return prisma.documentType.findFirst({
		where: {
			name: { equals: name, mode: 'insensitive' },
			...(excludeId ? { idDocumentType: { not: excludeId } } : {}),
		},
	})
}

async function findDuplicateCode(
	code: string,
	excludeId?: number
): Promise<DocumentType | null> {
	return prisma.documentType.findFirst({
		where: {
			code: { equals: code, mode: 'insensitive' },
			...(excludeId ? { idDocumentType: { not: excludeId } } : {}),
		},
	})
}

export async function listDocumentTypes(): Promise<DocumentTypeDto[]> {
	const rows = await prisma.documentType.findMany({
		orderBy: { name: 'asc' },
	})
	return rows.map(toDocumentTypeDto)
}

export async function listActiveDocumentTypeOptions(): Promise<
	DocumentTypeOption[]
> {
	const rows = await prisma.documentType.findMany({
		where: { status: true },
		orderBy: { name: 'asc' },
	})
	return rows.map((row) => toDocumentTypeOption(toDocumentTypeDto(row)))
}

export async function findDocumentTypeByCode(
	code: string
): Promise<DocumentTypeDto | null> {
	if (!hasDocumentTypeDelegate()) {
		return null
	}

	const normalized = normalizeDocumentCode(code)
	if (!normalized) {
		return null
	}

	const row = await prisma.documentType.findFirst({
		where: { code: { equals: normalized, mode: 'insensitive' } },
	})

	return row ? toDocumentTypeDto(row) : null
}

/**
 * Active types for new records, plus the type already stored on a client
 * even when it was later deactivated.
 */
export async function listDocumentTypeOptionsForForm(
	currentCode?: string | null
): Promise<DocumentTypeOption[]> {
	const active = await listActiveDocumentTypeOptions()
	if (!currentCode) {
		return active
	}

	const normalized = normalizeDocumentCode(currentCode)
	if (active.some((option) => option.code === normalized)) {
		return active
	}

	const current = await findDocumentTypeByCode(normalized)
	if (!current) {
		return active
	}

	return [...active, toDocumentTypeOption(current)]
}

export async function createDocumentType(
	input: CreateDocumentTypeInput,
	audit: DocumentTypeAuditContext = {}
): Promise<DocumentTypeMutationResult> {
	const name = normalizeDocumentName(input.name)
	const code = normalizeDocumentCode(input.code)
	const rangeError = lengthRangeError(input.minLength, input.maxLength)
	if (rangeError) {
		return { error: rangeError }
	}

	if (await findDuplicateName(name)) {
		return { error: 'Ya existe un tipo de documento con este nombre' }
	}

	if (await findDuplicateCode(code)) {
		return { error: 'Ya existe un tipo de documento con esta abreviatura' }
	}

	const row = await prisma.documentType.create({
		data: {
			name,
			code,
			dataType: input.dataType,
			minLength: input.minLength,
			maxLength: input.maxLength,
			status: input.status,
		},
	})

	await logAuditEvent({
		userId: audit.userId,
		email: audit.email,
		ipAddress: audit.ipAddress,
		userAgent: audit.userAgent,
		action: AuditAction.DOCUMENT_TYPE_CREATED,
		details: `Tipo de documento creado: ${row.name} (${row.code})`,
	})

	return { documentType: toDocumentTypeDto(row) }
}

export async function updateDocumentType(
	idDocumentType: number,
	input: UpdateDocumentTypeInput,
	audit: DocumentTypeAuditContext = {}
): Promise<DocumentTypeMutationResult> {
	const current = await prisma.documentType.findUnique({
		where: { idDocumentType },
	})

	if (!current) {
		return { error: 'Tipo de documento no encontrado' }
	}

	const name =
		input.name !== undefined ? normalizeDocumentName(input.name) : current.name
	const code =
		input.code !== undefined ? normalizeDocumentCode(input.code) : current.code
	const minLength = input.minLength ?? current.minLength
	const maxLength = input.maxLength ?? current.maxLength
	const rangeError = lengthRangeError(minLength, maxLength)
	if (rangeError) {
		return { error: rangeError }
	}

	if (await findDuplicateName(name, idDocumentType)) {
		return { error: 'Ya existe un tipo de documento con este nombre' }
	}

	if (await findDuplicateCode(code, idDocumentType)) {
		return { error: 'Ya existe un tipo de documento con esta abreviatura' }
	}

	const nextData = {
		name,
		code,
		dataType: input.dataType ?? current.dataType,
		minLength,
		maxLength,
		status: input.status ?? current.status,
	}

	let row: DocumentType
	try {
		if (code !== current.code) {
			const [updated] = await prisma.$transaction([
				prisma.documentType.update({
					where: { idDocumentType },
					data: nextData,
				}),
				prisma.client.updateMany({
					where: { idDocumentType },
					data: { typeIdentity: code },
				}),
			])
			row = updated
		} else {
			row = await prisma.documentType.update({
				where: { idDocumentType },
				data: nextData,
			})
		}
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2002'
		) {
			return {
				error:
					'No se puede cambiar la abreviatura porque coincidiría con otra identificación ya registrada',
			}
		}
		throw error
	}

	const statusChanged = row.status !== current.status
	const action = statusChanged
		? row.status
			? AuditAction.DOCUMENT_TYPE_ACTIVATED
			: AuditAction.DOCUMENT_TYPE_DEACTIVATED
		: AuditAction.DOCUMENT_TYPE_UPDATED

	await logAuditEvent({
		userId: audit.userId,
		email: audit.email,
		ipAddress: audit.ipAddress,
		userAgent: audit.userAgent,
		action,
		details: statusChanged
			? `Tipo de documento ${row.status ? 'activado' : 'inactivado'}: ${row.name} (${row.code})`
			: `Tipo de documento actualizado: ${row.name} (${row.code})`,
	})

	return { documentType: toDocumentTypeDto(row) }
}

const REQUIRED_DOCUMENT_TYPE_ERROR = 'El tipo de documento es obligatorio'
const MISSING_DOCUMENT_TYPE_ERROR = 'El tipo de documento no existe'
const INACTIVE_DOCUMENT_TYPE_ERROR =
	'El tipo de documento no está disponible para nuevos registros'

export interface ResolvedClientDocumentType {
	idDocumentType: number
	code: string
}

/**
 * Resolves a catalog row for a client identity.
 * New assignments must be active. An update may keep the type already stored
 * after it is deactivated, and must not switch to another inactive type.
 */
export async function resolveClientDocumentType(params: {
	code: string | null | undefined
	identityNumber: string
	mode: 'create' | 'update'
	previousCode?: string | null
	previousIdentityNumber?: string | null
}): Promise<ResolvedClientDocumentType | { error: string }> {
	const next = normalizeDocumentCode(params.code ?? '')
	if (!next) {
		return { error: REQUIRED_DOCUMENT_TYPE_ERROR }
	}

	const rule = await findDocumentTypeByCode(next)
	if (!rule) {
		return { error: MISSING_DOCUMENT_TYPE_ERROR }
	}

	const previous = normalizeDocumentCode(params.previousCode ?? '')
	const keepsCurrentType = params.mode === 'update' && next === previous
	if (!rule.status && !keepsCurrentType) {
		return { error: INACTIVE_DOCUMENT_TYPE_ERROR }
	}

	const unchangedIdentity = keepsStoredIdentity({
		identityNumber: params.identityNumber,
		typeIdentity: next,
		storedIdentityNumber: params.previousIdentityNumber,
		storedTypeIdentity: previous,
	})
	if (!unchangedIdentity) {
		const formatError = validateIdentityAgainstDocumentType(
			params.identityNumber,
			rule
		)
		if (formatError) {
			return { error: formatError }
		}
	}

	return { idDocumentType: rule.idDocumentType, code: rule.code }
}

export async function validateIdentityForNewRecord(
	typeCode: string,
	identityNumber: string
): Promise<string | null> {
	const resolved = await resolveClientDocumentType({
		code: typeCode,
		identityNumber,
		mode: 'create',
	})
	return 'error' in resolved ? resolved.error : null
}

/**
 * Keeps an already stored type even after it is deactivated.
 * Switching to another inactive or unknown type is rejected.
 */
export async function validateIdentityForExistingRecord(params: {
	previousCode: string
	nextCode: string
	identityNumber: string
	previousIdentityNumber?: string | null
}): Promise<string | null> {
	const resolved = await resolveClientDocumentType({
		code: params.nextCode,
		identityNumber: params.identityNumber,
		mode: 'update',
		previousCode: params.previousCode,
		previousIdentityNumber: params.previousIdentityNumber,
	})
	return 'error' in resolved ? resolved.error : null
}

/**
 * Physical removal is rejected. Deactivation is the conservation policy:
 * historical clients keep the foreign key.
 */
export async function rejectPhysicalDocumentTypeRemoval(
	idDocumentType: number
): Promise<{ error: string }> {
	const current = await prisma.documentType.findUnique({
		where: { idDocumentType },
		include: { _count: { select: { clients: true } } },
	})

	if (!current) {
		return { error: 'Tipo de documento no encontrado' }
	}

	if (current._count.clients > 0) {
		return {
			error:
				'Este tipo de documento tiene clientes relacionados. Inactívalo para ocultarlo en nuevas asignaciones sin romper el histórico.',
		}
	}

	return {
		error:
			'Los tipos de documento no se eliminan físicamente. Inactívalo para retirarlo de las nuevas asignaciones.',
	}
}
