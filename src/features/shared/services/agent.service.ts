import { prisma } from '@/lib/prisma'

export interface AgentCatalogItem {
	id: number
	name: string
	lastName: string | null
}

export interface AgentCatalogResult {
	agents: AgentCatalogItem[]
	showFilter: boolean
}

const MS_JUNIOR_LEVEL_CODE = 'LEVEL_0'

const HIERARCHY_BYPASS_ROLE_CODES = new Set(['ADMIN', 'ASISTENTE_GERENCIA_OPERATIVA', 'ANALISTA_SOPORTE'])

async function fetchAgentsByIds(userIds: number[]): Promise<AgentCatalogItem[]> {
	const users = await prisma.user.findMany({
		where: {
			active: true,
			role: { code: 'AGENTE' },
			idUser: { in: userIds },
		},
		select: { idUser: true, name: true, lastName: true },
		orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
	})
	return users.map((u) => ({ id: u.idUser, name: u.name, lastName: u.lastName }))
}

export async function listActiveAgents(viewer: {
	idUser: number
	roleCode: string | null
	levelCode: string | null
}): Promise<AgentCatalogResult> {
	const { idUser, roleCode, levelCode } = viewer

	// Backoffice roles — return all active AGENTEs
	if (roleCode && HIERARCHY_BYPASS_ROLE_CODES.has(roleCode)) {
		const users = await prisma.user.findMany({
			where: { active: true, role: { code: 'AGENTE' } },
			select: { idUser: true, name: true, lastName: true },
			orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
		})
		return {
			agents: users.map((u) => ({ id: u.idUser, name: u.name, lastName: u.lastName })),
			showFilter: true,
		}
	}

	// AGENTE at lowest level — hide the filter entirely
	if (levelCode === MS_JUNIOR_LEVEL_CODE) {
		return { agents: [], showFilter: false }
	}

	// AGENTE at a higher level — return only their tree (descendants + self)
	const { getAccessibleUserIds } = await import('@/features/auth/lib/hierarchy')
	const accessibleIds = await getAccessibleUserIds(idUser)
	// Exclude the viewer from the list (they are filtering OTHER agents)
	const subordinateIds = accessibleIds.filter((id) => id !== idUser)

	if (subordinateIds.length === 0) {
		return { agents: [], showFilter: false }
	}

	const agents = await fetchAgentsByIds(subordinateIds)
	return { agents, showFilter: true }
}

/**
 * Obtiene el saldo de Clawback acumulado para un usuario.
 */
export async function getClawbackBalance(userId: number): Promise<number> {
	const balance = await prisma.clawbackBalance.findUnique({
		where: { idUser: userId },
		select: { totalAmount: true },
	})

	return balance ? Number(balance.totalAmount) : 0
}

/**
 * Servicio para estadísticas y datos del agente (Server-side)
 */
export async function getAgentDashboardStats(userId: number) {
	const now = new Date()
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
	const endOfMonth = new Date(
		now.getFullYear(),
		now.getMonth() + 1,
		0,
		23,
		59,
		59
	)

	const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
	const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

	const [
		totalNegocios,
		ventasEfectuadas,
		negociosEmitidos,
		valorTotalMes,
		clawbackBalance,
		totalNegociosPrev,
		ventasEfectuadasPrev,
		negociosEmitidosPrev,
		valorTotalMesPrev,
	] = await Promise.all([
		prisma.business.count({
			where: {
				idUser: userId,
				createdAt: { gte: startOfMonth, lte: endOfMonth },
			},
		}),
		prisma.business.count({
			where: {
				idUser: userId,
				status: 'Venta Efectuada',
				createdAt: { gte: startOfMonth, lte: endOfMonth },
			},
		}),
		prisma.business.count({
			where: {
				idUser: userId,
				status: 'Emitido',
				createdAt: { gte: startOfMonth, lte: endOfMonth },
			},
		}),
		prisma.business.aggregate({
			where: {
				idUser: userId,
				createdAt: { gte: startOfMonth, lte: endOfMonth },
			},
			_sum: { value: true },
		}),
		getClawbackBalance(userId),
		// Estadísticas del mes pasado
		prisma.business.count({
			where: {
				idUser: userId,
				createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
			},
		}),
		prisma.business.count({
			where: {
				idUser: userId,
				status: 'Venta Efectuada',
				createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
			},
		}),
		prisma.business.count({
			where: {
				idUser: userId,
				status: 'Emitido',
				createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
			},
		}),
		prisma.business.aggregate({
			where: {
				idUser: userId,
				createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
			},
			_sum: { value: true },
		}),
	])

	const currentValorTotal = valorTotalMes._sum.value ? Number(valorTotalMes._sum.value) : 0
	const prevValorTotal = valorTotalMesPrev._sum.value ? Number(valorTotalMesPrev._sum.value) : 0

	const calcTrend = (current: number, prev: number) => {
		if (prev === 0) return current > 0 ? 100 : 0
		return Math.round(((current - prev) / prev) * 100)
	}

	return {
		totalNegocios,
		ventasEfectuadas,
		negociosEmitidos,
		valorTotal: currentValorTotal,
		clawbackBalance,
		trends: {
			totalNegocios: calcTrend(totalNegocios, totalNegociosPrev),
			ventasEfectuadas: calcTrend(ventasEfectuadas, ventasEfectuadasPrev),
			negociosEmitidos: calcTrend(negociosEmitidos, negociosEmitidosPrev),
			valorTotal: calcTrend(currentValorTotal, prevValorTotal),
		},
	}

}

