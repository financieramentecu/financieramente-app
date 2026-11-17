'use client'

import { useSession } from 'next-auth/react'
import { canWithLevel, can, getScope } from '@/features/access-control/lib/authorization'

/**
 * Permisos del usuario actual (grants de su rol efectivo). Falla cerrado: sin
 * sesión o sin grants nada está permitido.
 */
export function usePermissions() {
	const { data: session } = useSession()
	const role = session?.user?.role
	const grants = session?.user?.grants

	return {
		grants,
		/** Whether the effective role holds the permission (fails closed). */
		can: (permissionCode: string) => can(grants, permissionCode),
		/** Data scope of a permission, when granted. */
		scope: (permissionCode: string) => getScope(grants, permissionCode),
		/** Permission granted and the given level reaches its minimum level. */
		canWithLevel: (permissionCode: string, levelCode: string | null | undefined) =>
			canWithLevel(grants, permissionCode, levelCode, session?.user?.levelOrder ?? []),
		role,
	}
}
