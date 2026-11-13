import type { PrismaClient } from '@prisma/client'
import { can, getScope } from '@/features/access-control/lib/authorization'
import { getRoleGrants } from '@/features/access-control/services/role-permission-check'
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
 * Role gate from the role's grants. Returns a denial (403) when the role cannot
 * see businesses at all (fail closed) or cannot edit on a write; `null` when
 * the role may proceed to the scope check. Routes that load the business
 * themselves use this plus `resolveBusinessScope` in their own `where` clause.
 */
export async function checkBusinessRoleGate(
	user: AccessUser,
	mode: BusinessAccessMode
): Promise<Extract<BusinessAccessResult, { ok: false }> | null> {
	const grants = await getRoleGrants(user.role?.code)
	if (!can(grants, 'negocios.ver')) {
		return { ok: false, reason: 'FORBIDDEN' }
	}
	if (mode === 'write' && !can(grants, 'negocios.editar')) {
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

	const denied = await checkBusinessRoleGate(user, mode)
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
 * Decides the owner (`Business.idUser`) for a new business, from the grants:
 * - needs `negocios.crear`; anything else is denied.
 * - OWN scope (PARTNER): always the session user (client input ignored).
 * - COMPANY scope (ADMIN-like roles): the requested user (on-behalf creation).
 * - TEAM scope (AGENTE): the requested user only when inside self plus subordinates.
 */
export async function resolveBusinessOwnerId(
	db: Pick<PrismaClient, 'user'>,
	input: { user: AccessUser; requestedIdUser: number }
): Promise<{ ok: true; idUser: number } | { ok: false }> {
	const { user, requestedIdUser } = input
	const grants = await getRoleGrants(user.role?.code)
	if (!can(grants, 'negocios.crear')) return { ok: false }

	switch (getScope(grants, 'negocios.ver')) {
		case 'OWN':
			return { ok: true, idUser: user.idUser }
		case 'COMPANY':
			return { ok: true, idUser: requestedIdUser }
		case 'TEAM': {
			const scope = await resolveBusinessScope(db, user)
			return scope.idUser?.in.includes(requestedIdUser)
				? { ok: true, idUser: requestedIdUser }
				: { ok: false }
		}
		default:
			return { ok: false }
	}
}

