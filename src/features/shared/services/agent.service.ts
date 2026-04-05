import { prisma } from '@/lib/prisma'

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

