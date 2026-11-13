'use client'

import { useSession } from 'next-auth/react'
import { UserRole } from '@/features/auth/lib/roles'
import {
	RolePermissions,
	getRolePermissions,
	hasPermission,
	hasNestedPermission,
} from '@/features/auth/lib/permissions'
import { can, getScope } from '@/features/access-control/lib/authorization'

/**
 * Hook para acceder a permisos del usuario actual
 */
export function usePermissions() {
	const { data: session } = useSession()
	const role = session?.user?.role
	const permissions =
		session?.user?.permissions || getRolePermissions(role || null)

	const grants = session?.user?.grants

	return {
		grants,
		/** Whether the effective role holds the permission (fails closed). */
		can: (permissionCode: string) => can(grants, permissionCode),
		/** Data scope of a permission, when granted. */
		scope: (permissionCode: string) => getScope(grants, permissionCode),
		role: role as UserRole | null | undefined,
		permissions: permissions as RolePermissions | null,
		hasPermission: (permission: keyof RolePermissions) =>
			hasPermission(role, permission),
		hasNestedPermission: (
			category: keyof RolePermissions,
			permission: string
		) => hasNestedPermission(role, category, permission),
	}
}
