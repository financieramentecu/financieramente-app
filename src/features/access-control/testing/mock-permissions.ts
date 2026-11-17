import { DEFAULT_ROLE_GRANTS } from '../catalog/default-role-grants'
import { can, canWithLevel, getScope } from '../lib/authorization'
import { DEFAULT_LEVEL_ORDER } from '../services/role-grants.service'

/**
 * Test helper: stands in for `usePermissions` by answering from the default
 * grants of the role set with `setMockRole`. Use it in component/hook tests
 * that render without a SessionProvider:
 *
 * vi.mock('@/features/shared/hooks/use-permissions', async () => ({
 *   usePermissions: (await import('@/features/access-control/testing/mock-permissions')).mockedUsePermissions,
 * }))
 */
let currentRole: string | undefined

export function setMockRole(roleCode: string | undefined): void {
	currentRole = roleCode
}

export function mockedUsePermissions() {
	const grants = DEFAULT_ROLE_GRANTS[currentRole ?? ''] ?? {}
	return {
		grants,
		role: currentRole,
		can: (code: string) => can(grants, code),
		scope: (code: string) => getScope(grants, code),
		canWithLevel: (code: string, level: string | null | undefined) =>
			canWithLevel(grants, code, level, DEFAULT_LEVEL_ORDER),
	}
}

type RoleProps = {
	props?: { userRole?: string; userRoleCode?: string; roleCode?: string }
}

/**
 * Role carried by a component under test through its legacy role props, or the
 * fallback when it has none. Lets a test file keep rendering `<Comp userRole=... />`
 * while the mocked `usePermissions` answers for that same role.
 */
export function roleFromElement(ui: unknown, fallback = 'ADMIN'): string {
	const props = (ui as RoleProps)?.props
	return props?.userRole ?? props?.userRoleCode ?? props?.roleCode ?? fallback
}
