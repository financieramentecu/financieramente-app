import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { can } from '../lib/authorization'
import type { RoleGrants } from '../types/access-control.types'
import { resolveRoleGrants } from './role-grants.service'

export type RequirePermissionFailure = { ok: false; response: NextResponse }
export type RequirePermissionSuccess = {
	ok: true
	session: Session
	grants: RoleGrants
}

/**
 * The single API guard: authenticated session whose role holds `permissionCode`.
 * Grants are read from the database on every call (no stale cache), and any
 * missing role/permission fails closed with 403.
 */
export async function requirePermission(
	permissionCode: string
): Promise<RequirePermissionSuccess | RequirePermissionFailure> {
	const session = (await auth()) as Session | null
	if (!session?.user) {
		return {
			ok: false,
			response: NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			),
		}
	}
	const grants = await resolveRoleGrants(prisma, session.user.role)
	if (!can(grants, permissionCode)) {
		return {
			ok: false,
			response: NextResponse.json(
				{ data: null, error: 'Sin permisos' },
				{ status: 403 }
			),
		}
	}
	return { ok: true, session, grants }
}
