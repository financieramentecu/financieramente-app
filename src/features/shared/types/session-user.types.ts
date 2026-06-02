/**
 * Minimal viewer identity shape needed by any feature that resolves
 * the currently authenticated user — no feature-specific fields.
 */
export interface SessionUser {
	idUser: number
	name: string
	lastName: string | null
	email: string
	active: boolean
	idLevel: number | null
	idCategory: number | null
	idUserLeader: number | null
	role: { code: string } | null
	level: { code: string } | null
}
