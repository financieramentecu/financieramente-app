import type { PrismaClient } from '@prisma/client'
import type { BeneficiaryMode } from '@/features/categories/types/category.types'

/** Max leader hops when walking the upline chain (cycle guard uses visited set). */
export const MAX_UPLINE_DEPTH = 50

export interface UplineChainLink {
	readonly idUser: number
	readonly idCategoria: number | null
}

export type ResolveBeneficiaryErrorCode =
	| 'FIXED_MISSING_USER'
	| 'FIXED_USER_INACTIVE'
	| 'UPLINE_NO_MATCH'
	| 'UPLINE_AGENT_NO_CATEGORY'
	| 'UPLINE_NO_LEADER'
	| 'UPLINE_LEADER_NO_CATEGORY'

export type ResolveBeneficiaryResult =
	| { ok: true; idUser: number }
	| {
			ok: false
			code: ResolveBeneficiaryErrorCode
			categoryCode: string
	  }

export interface CategoryForBeneficiaryResolve {
	readonly idCategory: number
	readonly code: string
	readonly beneficiaryMode: BeneficiaryMode
	readonly idFixedBeneficiaryUser: number | null
	readonly fixedBeneficiaryUser?: {
		idUser: number
		active: boolean
	} | null
}

/**
 * Resolves beneficiary user id for one distribution category.
 * UPLINE_CHAIN: first user in chain (agent → leader → …) with matching idCategoria.
 * FIXED_BENEFICIARY: idFixedBeneficiaryUser; ignores chain; requires loaded fixed user and active.
 */
export function resolveBeneficiaryUserId(
	category: CategoryForBeneficiaryResolve,
	chain: ReadonlyArray<UplineChainLink>
): ResolveBeneficiaryResult {
	if (category.beneficiaryMode === 'FIXED_BENEFICIARY') {
		if (category.idFixedBeneficiaryUser == null) {
			return {
				ok: false,
				code: 'FIXED_MISSING_USER',
				categoryCode: category.code,
			}
		}
		const fu = category.fixedBeneficiaryUser
		if (fu == null || fu.idUser !== category.idFixedBeneficiaryUser) {
			return {
				ok: false,
				code: 'FIXED_MISSING_USER',
				categoryCode: category.code,
			}
		}
		if (!fu.active) {
			return {
				ok: false,
				code: 'FIXED_USER_INACTIVE',
				categoryCode: category.code,
			}
		}
		return { ok: true, idUser: fu.idUser }
	}

	for (const link of chain) {
		if (link.idCategoria === category.idCategory) {
			return { ok: true, idUser: link.idUser }
		}
	}

	// Diagnose why no match was found for a more specific error message
	const agent = chain[0]
	if (!agent || agent.idCategoria == null) {
		return {
			ok: false,
			code: 'UPLINE_AGENT_NO_CATEGORY',
			categoryCode: category.code,
		}
	}
	if (chain.length === 1) {
		return {
			ok: false,
			code: 'UPLINE_NO_LEADER',
			categoryCode: category.code,
		}
	}
	const leaderHasNoCategory = chain.slice(1).some((l) => l.idCategoria == null)
	if (leaderHasNoCategory) {
		return {
			ok: false,
			code: 'UPLINE_LEADER_NO_CATEGORY',
			categoryCode: category.code,
		}
	}
	return {
		ok: false,
		code: 'UPLINE_NO_MATCH',
		categoryCode: category.code,
	}
}

/**
 * Loads the upline chain starting at the business agent, following idUserLeader.
 */
export async function buildUplineChain(
	db: Pick<PrismaClient, 'user'>,
	startUserId: number
): Promise<UplineChainLink[]> {
	const chain: UplineChainLink[] = []
	const visited = new Set<number>()
	let currentId: number | null = startUserId

	for (let depth = 0; depth < MAX_UPLINE_DEPTH && currentId != null; depth++) {
		if (visited.has(currentId)) {
			break
		}
		visited.add(currentId)

		const row: {
			idUser: number
			idCategoria: number | null
			idUserLeader: number | null
		} | null = await db.user.findUnique({
			where: { idUser: currentId },
			select: {
				idUser: true,
				idCategoria: true,
				idUserLeader: true,
			},
		})

		if (!row) {
			break
		}

		chain.push({
			idUser: row.idUser,
			idCategoria: row.idCategoria,
		})

		currentId = row.idUserLeader
	}

	return chain
}

export function ppcConfigsNeedUplineAgent(
	configs: ReadonlyArray<{ category: { beneficiaryMode: BeneficiaryMode } }>
): boolean {
	return configs.some((c) => c.category.beneficiaryMode === 'UPLINE_CHAIN')
}
