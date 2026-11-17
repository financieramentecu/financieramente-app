/**
 * Navigation layout of a role. PARTNER and AGENTE have bespoke, fixed menus
 * (system templates); every other role gets the full menu filtered by its
 * grants. This is a layout choice, not an authorization decision: routes and
 * actions are still guarded by permissions.
 */
export type MenuTemplate = 'PARTNER' | 'AGENTE' | 'GRANTS'

export function menuTemplateForRole(
	roleCode: string | null | undefined
): MenuTemplate {
	if (roleCode === 'PARTNER') return 'PARTNER'
	if (roleCode === 'AGENTE') return 'AGENTE'
	return 'GRANTS'
}
