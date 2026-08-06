import type { AgentInfo } from '@/features/negocios/types/business-entity.types'

/** Minimal shape needed from a `Lead.user` (+ role + category) relation. */
export interface LeadOwnerUser {
	idUser: number
	name: string
	lastName: string | null
	email: string
	phone: string | null
	role: { name: string } | null
	category: { name: string } | null
}

function buildFullName(name: string, lastName: string | null): string {
	return [name, lastName].filter(Boolean).join(' ').trim()
}

/**
 * Maps a lead's owner (`Lead.user`, joined with `role`/`category`) to the
 * `AgentInfo` shape already consumed by `useAgentPermissions` /
 * `agentInfoToUserWithRole` — reused (R1) to default and lock the business
 * form's `agent` field to the lead's assigned Money Strategist.
 */
export function mapLeadOwnerToAgentInfo(user: LeadOwnerUser): AgentInfo {
	return {
		id: user.idUser,
		fullName: buildFullName(user.name, user.lastName),
		roleName: user.role?.name ?? null,
		categoryName: user.category?.name ?? null,
		email: user.email,
		phone: user.phone,
	}
}
