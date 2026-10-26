import type { PrismaClient } from '@prisma/client'
import {
	UserRole,
	isGlobalVisibilityRole,
	isReadOnlyRole,
	isWriteBypassRole,
} from '@/features/auth/lib/roles'
import { prisma as sharedPrisma } from '@/lib/prisma'
import { resolveVisibleUserIds } from './user-hierarchy.service'

/**
 * Central business-access decision (SEC-03).
 *
 * - Write-bypass roles (ADMIN, ASISTENTE_GERENCIA_OPERATIVA, ANALISTA_SOPORTE): every business.
 * - Read-only roles (CONSULTOR): every business for `read`, 403 for `write`.
 * - AGENTE: self plus subordinates (hierarchy visibility).
 * - PARTNER: own businesses only.
 * - Any other role (DEFAULT, unknown, missing): FAILS CLOSED (`FORBIDDEN`).
 *
 * Out-of-scope or missing businesses answer `NOT_FOUND` so existence is never
 * leaked. The service speaks domain reasons only; the HTTP status and the
 * user-facing message live in `lib/business-access-http.ts`.
 */

export type BusinessAccessMode = 'read' | 'write'

export interface AccessUser {
	idUser: number
	role?: { code: string } | null
}

export type BusinessAccessDeniedReason = 'FORBIDDEN' | 'NOT_FOUND'

export type BusinessAccessResult =
	| { ok: true; idOwner: number }
	| { ok: false; reason: BusinessAccessDeniedReason }

/** Prisma `where` fragment: `{}` means unrestricted, `{ idUser: { in: [] } }` matches nothing. */
export interface BusinessScope {
	idUser?: { in: number[] }
}

export interface BusinessScopeOptions {
	/**
	 * Narrow scoped roles to their own businesses (no subordinates). Used by
	 * routes whose existing rule is owner-only (PUT /api/negocios/[id]).
	 * Global roles are unaffected.
	 */
	ownOnly?: boolean
}

type BusinessAccessDb = Pick<PrismaClient, 'user' | 'business'>

function isScopedRole(roleCode: string | undefined): boolean {
	return roleCode === UserRole.AGENTE || roleCode === UserRole.PARTNER
}

/**
 * Prisma `where` fragment for the single visibility rule
 * (`resolveVisibleUserIds`): `undefined` ids mean unrestricted.
 */
export async function resolveBusinessScope(
	db: Pick<PrismaClient, 'user'>,
	user: AccessUser,
	options: BusinessScopeOptions = {}
): Promise<BusinessScope> {
	const visibleUserIds = await resolveVisibleUserIds(db, user, options)
	return visibleUserIds === undefined ? {} : { idUser: { in: visibleUserIds } }
}

/**
 * Pure role gate. Returns a denial (403) when the role has no business access
 * at all (fail closed) or is read-only on a write; `null` when the role may
 * proceed to the scope check. Routes that load the business themselves use
 * this plus `resolveBusinessScope` in their own `where` clause.
 */
export function checkBusinessRoleGate(
	user: AccessUser,
	mode: BusinessAccessMode
): Extract<BusinessAccessResult, { ok: false }> | null {
	const roleCode = user.role?.code
	const hasKnownScope =
		isGlobalVisibilityRole(roleCode) || isScopedRole(roleCode)
	if (!hasKnownScope) {
		return { ok: false, reason: 'FORBIDDEN' }
	}
	if (mode === 'write' && isReadOnlyRole(roleCode)) {
		return { ok: false, reason: 'FORBIDDEN' }
	}
	return null
}

/**
 * `db` defaults to the shared Prisma client so HTTP handlers never touch it;
 * pass a handle explicitly for transactions or tests.
 */
export async function assertBusinessAccess(
	input: {
		user: AccessUser
		businessId: number
		mode: BusinessAccessMode
		ownOnly?: boolean
	},
	db: BusinessAccessDb = sharedPrisma
): Promise<BusinessAccessResult> {
	const { user, businessId, mode, ownOnly } = input

	const denied = checkBusinessRoleGate(user, mode)
	if (denied) return denied

	const scope = await resolveBusinessScope(db, user, { ownOnly })
	const business = await db.business.findFirst({
		where: { idBusiness: businessId, ...scope },
		select: { idUser: true },
	})

	if (!business) {
		return { ok: false, reason: 'NOT_FOUND' }
	}
	return { ok: true, idOwner: business.idUser }
}

/**
 * Decides the owner (`Business.idUser`) for a new business.
 * - PARTNER: always the session user (client input ignored).
 * - Write-bypass roles: the requested user (on-behalf creation, as for agents today).
 * - AGENTE: the requested user only when inside self plus subordinates.
 * - Everything else: denied.
 */
export async function resolveBusinessOwnerId(
	db: Pick<PrismaClient, 'user'>,
	input: { user: AccessUser; requestedIdUser: number }
): Promise<{ ok: true; idUser: number } | { ok: false }> {
	const { user, requestedIdUser } = input
	const roleCode = user.role?.code

	if (roleCode === UserRole.PARTNER) return { ok: true, idUser: user.idUser }
	if (isWriteBypassRole(roleCode)) return { ok: true, idUser: requestedIdUser }
	if (roleCode === UserRole.AGENTE) {
		const scope = await resolveBusinessScope(db, user)
		return scope.idUser?.in.includes(requestedIdUser)
			? { ok: true, idUser: requestedIdUser }
			: { ok: false }
	}
	return { ok: false }
}
