import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { can } from '../lib/authorization'
import { resolveRoleGrants } from './role-grants.service'

/**
 * Page-level guard for Server Component pages: sends visitors without a session
 * to /login and visitors whose role lacks `permissionCode` to access-denied.
 * It never returns a value; it either lets the page render or redirects.
 * (APIs keep their own guard, `requirePermission`.)
 */
export async function requirePagePermission(permissionCode: string): Promise<void> {
	const session = (await auth()) as Session | null
	if (!session?.user) redirect('/login')
	const grants = await resolveRoleGrants(prisma, session.user.role)
	if (!can(grants, permissionCode)) {
		redirect('/access-denied?reason=no_permissions')
	}
}
