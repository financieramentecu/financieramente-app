import type { PrismaClient } from '@prisma/client'
import type { BeneficiaryMode } from '@/features/levels/types/level.types'

/** Max leader hops when walking the upline chain (cycle guard uses visited set). */
export const MAX_UPLINE_DEPTH = 50

export interface UplineChainLink {
	readonly idUser: number
	readonly idLevel: number | null
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
	readonly idLevel: number
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
	if (category.beneficiaryMode === 'BENEFICIARIO_GENERAL') {
		console.log(`[DEBUG] Resolviendo FIXED para ${category.code} -> idFixedUser: ${category.idFixedBeneficiaryUser}`)
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

	console.log(`[DEBUG] Resolviendo UPLINE para ${category.code} (idLevel: ${category.idLevel}) en cadena de ${chain.length} eslabones:`)
	chain.forEach((l, i) => console.log(`   [${i}] User: ${l.idUser}, Level: ${l.idLevel}`))

	for (const link of chain) {
		if (link.idLevel === category.idLevel) {
			console.log(`   [MATCH] Encontrado beneficiario id: ${link.idUser}`)
			return { ok: true, idUser: link.idUser }
		}
	}

	// Diagnose why no match was found for a more specific error message
	console.log(`   [FAIL] No hay coincidencia para idLevel: ${category.idLevel}`)

	const agent = chain[0]
	if (!agent || agent.idLevel == null) {
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
	const leaderHasNoCategory = chain.slice(1).some((l) => l.idLevel == null)
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
			idLevel: number | null
			idUserLeader: number | null
		} | null = await db.user.findUnique({
			where: { idUser: currentId },
			select: {
				idUser: true,
				idLevel: true,
				idUserLeader: true,
			},
		})

		if (!row) {
			break
		}

		chain.push({
			idUser: row.idUser,
			idLevel: row.idLevel,
		})

		currentId = row.idUserLeader
	}

	return chain
}

export function ppcConfigsNeedUplineAgent(
	configs: ReadonlyArray<{ level?: { beneficiaryMode: BeneficiaryMode }; category?: { beneficiaryMode: BeneficiaryMode } }>
): boolean {
	return configs.some((c) => (c.level ?? c.category)?.beneficiaryMode === 'OVERRIDE')
}
