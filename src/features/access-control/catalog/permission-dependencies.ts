/**
 * Soft dependencies between permissions: granting the key without its
 * requirement is allowed (S4) but the editor warns about it.
 */
export const PERMISSION_DEPENDENCIES: Readonly<Record<string, string>> = {
	'aportes.fondear': 'aportes.ver',
}
