import { prisma } from '@/lib/prisma'

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

	const [totalNegocios, ventasEfectuadas, negociosEmitidos, valorTotalMes] = await Promise.all([
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
	])

	return {
		totalNegocios,
		ventasEfectuadas,
		negociosEmitidos,
		valorTotal: valorTotalMes._sum.value || 0,
	}
}
