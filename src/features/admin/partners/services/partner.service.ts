import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@/features/auth/lib/roles'
import {
	issueToken,
	revokeOpenTokens,
} from '@/features/auth/services/account-token.service'
import { todayBogotaNoonUtc } from '@/features/negocios/lib/bogota-date'
import {
	PARTNER_EXTERNAL_LEVEL_CODE,
	PARTNER_LEADER_LEVEL_CODES,
} from '@/features/shared/lib/level-codes'
import { validateLeaderCandidate } from '../lib/partner-leader-rules'
import {
	PARTNER_CATEGORY_NAME,
	PARTNER_CATEGORY_TYPE_NAME,
	PARTNER_SEED_HINT,
} from '../lib/partner-reference'
import { leaderLevelQuerySchema } from '../lib/partner-schemas'
import { toPartnerDto } from '../mappers/partner.mapper'
import type {
	CreatePartnerInput,
	LeaderLevelOption,
	PartnerDto,
	PartnerLeaderOption,
	UpdatePartnerInput,
	UpdatePartnerResult,
} from '../types/partner.types'
import { PartnerServiceError } from './partner-errors'

export { PartnerServiceError } from './partner-errors'
export type { PartnerErrorCode } from './partner-errors'

const PARTNER_SELECT = {
	idUser: true,
	name: true,
	lastName: true,
	typeIdentity: true,
	identityNumber: true,
	email: true,
	phone: true,
	active: true,
	activatedAt: true,
	createdAt: true,
	leader: {
		select: {
			idUser: true,
			name: true,
			lastName: true,
			email: true,
			level: { select: { code: true } },
		},
	},
} satisfies Prisma.UserSelect

const EMAIL_TAKEN_MESSAGE = 'Este correo electrónico ya está registrado'
const IDENTITY_TAKEN_MESSAGE = 'Este documento ya está registrado'

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

async function assertValidLeader(leaderId: number): Promise<void> {
	const leader = await prisma.user.findUnique({
		where: { idUser: leaderId },
		select: {
			active: true,
			role: { select: { code: true } },
			level: { select: { code: true } },
		},
	})
	const result = validateLeaderCandidate(
		leader && {
			active: leader.active,
			roleCode: leader.role?.code,
			levelCode: leader.level?.code,
		}
	)
	if (!result.ok) {
		throw new PartnerServiceError('INVALID_LEADER', result.error, 'leaderId')
	}
}

async function assertUniqueIdentity(input: CreatePartnerInput): Promise<void> {
	const byEmail = await prisma.user.findFirst({
		where: { email: { equals: input.email, mode: 'insensitive' } },
		select: { idUser: true },
	})
	if (byEmail) {
		throw new PartnerServiceError('EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE, 'email')
	}

	const byIdentity = await prisma.user.findFirst({
		where: {
			typeIdentity: input.typeIdentity,
			identityNumber: input.identityNumber,
		},
		select: { idUser: true },
	})
	if (byIdentity) {
		throw new PartnerServiceError(
			'IDENTITY_TAKEN',
			IDENTITY_TAKEN_MESSAGE,
			'identityNumber'
		)
	}
}

async function resolvePartnerReferenceData() {
	const [role, level, category] = await Promise.all([
		prisma.role.findUnique({
			where: { code: UserRole.PARTNER },
			select: { idRole: true },
		}),
		prisma.level.findUnique({
			where: { code: PARTNER_EXTERNAL_LEVEL_CODE },
			select: { idLevel: true },
		}),
		prisma.category.findFirst({
			where: {
				name: PARTNER_CATEGORY_NAME,
				categoryType: { name: PARTNER_CATEGORY_TYPE_NAME },
			},
			select: { id: true },
		}),
	])

	if (!role || !level || !category) {
		throw new PartnerServiceError(
			'REFERENCE_DATA_MISSING',
			`Faltan datos de referencia de Partner (rol, nivel o categoría). Ejecuta ${PARTNER_SEED_HINT} antes de crear partners`
		)
	}
	return {
		idRole: role.idRole,
		idLevel: level.idLevel,
		idCategory: category.id,
	}
}

/** Maps a concurrent unique violation (P2002) to the field-level error. */
function toUniqueViolation(error: unknown): PartnerServiceError | null {
	if (
		!(error instanceof Prisma.PrismaClientKnownRequestError) ||
		error.code !== 'P2002'
	) {
		return null
	}
	const target = String(error.meta?.target ?? '').toLowerCase()
	if (target.includes('email')) {
		return new PartnerServiceError('EMAIL_TAKEN', EMAIL_TAKEN_MESSAGE, 'email')
	}
	if (target.includes('identity')) {
		return new PartnerServiceError(
			'IDENTITY_TAKEN',
			IDENTITY_TAKEN_MESSAGE,
			'identityNumber'
		)
	}
	return null
}

/**
 * Creates the partner and its ACTIVATION token in ONE transaction. The
 * activation e-mail is the caller's job (after commit), so a mail failure can
 * never roll the creation back. `rawToken` goes only into that e-mail.
 */
export async function createPartner(
	input: CreatePartnerInput,
	now: Date = new Date()
): Promise<{ partner: PartnerDto; rawToken: string }> {
	await assertValidLeader(input.leaderId)
	await assertUniqueIdentity(input)
	const reference = await resolvePartnerReferenceData()

	try {
		return await prisma.$transaction(async (tx) => {
			const row = await tx.user.create({
				data: {
					name: input.name,
					lastName: input.lastName ?? null,
					typeIdentity: input.typeIdentity,
					identityNumber: input.identityNumber,
					email: input.email,
					phone: input.phone ?? null,
					idRole: reference.idRole,
					idLevel: reference.idLevel,
					idCategory: reference.idCategory,
					idUserLeader: input.leaderId,
					entryDate: todayBogotaNoonUtc(now),
					active: true,
					activatedAt: null,
					// Activation clears it (account-activation.service).
					ssoOnly: true,
					password: null,
				},
				select: PARTNER_SELECT,
			})
			const { rawToken } = await issueToken(
				tx,
				{ idUser: row.idUser, type: 'ACTIVATION' },
				now
			)
			return { partner: toPartnerDto(row), rawToken }
		})
	} catch (error) {
		throw toUniqueViolation(error) ?? error
	}
}

// ---------------------------------------------------------------------------
// Update (PM-09)
// ---------------------------------------------------------------------------

type EditableValues = {
	name: string
	lastName: string | null
	typeIdentity: string
	identityNumber: string | null
	phone: string | null
	leaderId: number | null
}

const EDITABLE_FIELDS: ReadonlyArray<keyof EditableValues> = [
	'name',
	'lastName',
	'typeIdentity',
	'identityNumber',
	'phone',
	'leaderId',
]

function toEditableValues(input: UpdatePartnerInput): EditableValues {
	return {
		name: input.name,
		lastName: input.lastName ?? null,
		typeIdentity: input.typeIdentity,
		identityNumber: input.identityNumber,
		phone: input.phone ?? null,
		leaderId: input.leaderId,
	}
}

/** Identity must be free for every OTHER user (the edited partner is excluded). */
async function assertIdentityFreeForOthers(
	id: number,
	input: UpdatePartnerInput
): Promise<void> {
	const other = await prisma.user.findFirst({
		where: {
			typeIdentity: input.typeIdentity,
			identityNumber: input.identityNumber,
			NOT: { idUser: id },
		},
		select: { idUser: true },
	})
	if (other) {
		throw new PartnerServiceError(
			'IDENTITY_TAKEN',
			IDENTITY_TAKEN_MESSAGE,
			'identityNumber'
		)
	}
}

/**
 * Edits the contact data, identity document and leader of a partner in any
 * state. Email, role, level, category, `active`, `activatedAt` and the
 * password are never written. The leader and the identity are re-validated
 * here, so the server never trusts the picker. Returns the names of the
 * fields that actually changed (empty when the payload equals the stored data).
 */
export async function updatePartner(
	id: number,
	input: UpdatePartnerInput
): Promise<UpdatePartnerResult> {
	const current = await findPartnerRow(id)
	await assertValidLeader(input.leaderId)
	await assertIdentityFreeForOthers(id, input)

	const next = toEditableValues(input)
	const stored: EditableValues = {
		name: current.name,
		lastName: current.lastName,
		typeIdentity: current.typeIdentity,
		identityNumber: current.identityNumber,
		phone: current.phone,
		leaderId: current.leader?.idUser ?? null,
	}
	const changedFields = EDITABLE_FIELDS.filter(
		(field) => stored[field] !== next[field]
	)
	if (changedFields.length === 0) {
		return { partner: toPartnerDto(current), changedFields: [] }
	}

	try {
		const row = await prisma.user.update({
			where: { idUser: id },
			data: {
				name: next.name,
				lastName: next.lastName,
				typeIdentity: next.typeIdentity,
				identityNumber: next.identityNumber,
				phone: next.phone,
				idUserLeader: next.leaderId,
			},
			select: PARTNER_SELECT,
		})
		return { partner: toPartnerDto(row), changedFields }
	} catch (error) {
		throw toUniqueViolation(error) ?? error
	}
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listPartners(): Promise<PartnerDto[]> {
	const rows = await prisma.user.findMany({
		where: { role: { code: UserRole.PARTNER } },
		select: PARTNER_SELECT,
		orderBy: { createdAt: 'desc' },
	})
	return rows.map(toPartnerDto)
}

/** Returns the partner row, or throws NOT_FOUND for unknown / non-partner ids. */
async function findPartnerRow(id: number) {
	const row = await prisma.user.findFirst({
		where: { idUser: id, role: { code: UserRole.PARTNER } },
		select: PARTNER_SELECT,
	})
	if (!row) {
		throw new PartnerServiceError('NOT_FOUND', 'Partner no encontrado')
	}
	return row
}

export async function listLeaderLevels(): Promise<LeaderLevelOption[]> {
	const levels = await prisma.level.findMany({
		where: { code: { in: [...PARTNER_LEADER_LEVEL_CODES] }, status: true },
		select: { code: true, name: true },
		orderBy: { code: 'asc' },
	})
	return levels.map((level) => ({ code: level.code, name: level.name }))
}

function displayName(option: { name: string; lastName: string | null }) {
	return `${option.name} ${option.lastName ?? ''}`.trim().toLowerCase()
}

/** Active users of one LEVEL_1..LEVEL_5 level, never PARTNER-role users. */
export async function listLeaderCandidates(
	levelCode: string
): Promise<PartnerLeaderOption[]> {
	const parsed = leaderLevelQuerySchema.safeParse(levelCode)
	if (!parsed.success) {
		throw new PartnerServiceError(
			'INVALID_LEADER',
			'Nivel de líder inválido',
			'levelCode'
		)
	}

	const rows = await prisma.user.findMany({
		where: { active: true, level: { code: parsed.data } },
		select: {
			idUser: true,
			name: true,
			lastName: true,
			email: true,
			role: { select: { code: true } },
		},
	})

	return rows
		.filter((row) => row.role?.code !== UserRole.PARTNER)
		.map((row) => ({
			id: row.idUser,
			name: row.name,
			lastName: row.lastName,
			email: row.email,
		}))
		.sort((a, b) => displayName(a).localeCompare(displayName(b)))
}

// ---------------------------------------------------------------------------
// Lifecycle (soft: only the `active` flag changes, never a physical delete)
// ---------------------------------------------------------------------------

/**
 * Deactivates the partner and revokes every open token in one transaction.
 * The live session ends on the next request through session revalidation.
 */
export async function deactivatePartner(id: number): Promise<PartnerDto> {
	const current = await findPartnerRow(id)
	if (!current.active) {
		throw new PartnerServiceError(
			'INVALID_STATE',
			'El partner ya está desactivado'
		)
	}

	return prisma.$transaction(async (tx) => {
		const row = await tx.user.update({
			where: { idUser: id },
			data: { active: false },
			select: PARTNER_SELECT,
		})
		await revokeOpenTokens(tx, { idUser: id })
		return toPartnerDto(row)
	})
}

/**
 * Reactivates the partner. Keeps `activatedAt` and the password; a partner who
 * never activated stays PENDING and needs an explicit resend.
 */
export async function reactivatePartner(id: number): Promise<PartnerDto> {
	const current = await findPartnerRow(id)
	if (current.active) {
		throw new PartnerServiceError('INVALID_STATE', 'El partner ya está activo')
	}

	const row = await prisma.user.update({
		where: { idUser: id },
		data: { active: true },
		select: PARTNER_SELECT,
	})
	return toPartnerDto(row)
}

/**
 * Issues a new ACTIVATION token (revoking the previous one) for an active,
 * never-activated partner. The e-mail is sent by the caller after commit.
 */
export async function reissuePartnerActivation(
	id: number,
	now: Date = new Date()
): Promise<{ partner: PartnerDto; rawToken: string }> {
	const current = await findPartnerRow(id)
	if (!current.active) {
		throw new PartnerServiceError(
			'INVALID_STATE',
			'El partner está desactivado. Reactívalo antes de reenviar la activación'
		)
	}
	if (current.activatedAt) {
		throw new PartnerServiceError(
			'INVALID_STATE',
			'El partner ya activó su cuenta'
		)
	}

	const { rawToken } = await issueToken(
		prisma,
		{ idUser: id, type: 'ACTIVATION' },
		now
	)
	return { partner: toPartnerDto(current), rawToken }
}
