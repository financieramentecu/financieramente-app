'use server'

import { prisma } from '@/lib/prisma'

export async function getProductDistribution(idProduct: number, idLevelOrigin: number) {
	try {
		// Fetch discount and clawback from CommissionDiscount table (global defaults)
		const [impuesto, clawbackOperativo] = await Promise.all([
			prisma.commissionDiscount.findFirst({
				where: { type: 'IMPUESTO', status: 'ACTIVE' },
				orderBy: { createdAt: 'desc' }
			}),
			prisma.commissionDiscount.findFirst({
				where: { type: 'CLAWBACK', status: 'ACTIVE' },
				orderBy: { createdAt: 'desc' }
			})
		])

		const discountPercentage = impuesto?.percentage ? Number(impuesto.percentage) : 12
		const clawbackPercentage = clawbackOperativo?.percentage ? Number(clawbackOperativo.percentage) : 10

		const config = await prisma.productConfiguration.findFirst({
			where: {
				idProduct,
				idLevel: idLevelOrigin,
				active: true
			},
			include: {
				productPercentageCommissionNewBusinesses: {
					include: {
						productPercentageCommissionCategories: {
							where: { active: true },
							include: { level: true }
						}
					}
				}
			}
		})

		if (!config || !config.productPercentageCommissionNewBusinesses) {
			return { success: false, data: [], discountPercentage, clawbackPercentage }
		}

		const categories = config.productPercentageCommissionNewBusinesses.productPercentageCommissionCategories
		const data = categories.map(c => ({
			levelCode: c.level.code,
			levelName: c.level.name,
			porcentaje: Number(c.porcentajeDistribucion) * 100
		})).sort((a, b) => {
			const numA = parseInt(a.levelCode.replace('LEVEL_', ''), 10) || 0
			const numB = parseInt(b.levelCode.replace('LEVEL_', ''), 10) || 0
			return numA - numB
		})

		return { 
			success: true, 
			data,
			discountPercentage,
			clawbackPercentage
		}
	} catch (error) {
		console.error('Error fetching product distribution:', error)
		return { success: false, data: [], discountPercentage: 12, clawbackPercentage: 10 }
	}
}
