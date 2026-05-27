'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import { computeLineDistributionAmounts } from '@/features/pre-liquidacion/lib/compute-line-distribution'

export interface SimuladorParams {
	idCompany: number
	idProduct: number
	idClientOrigin: number
	idLevelOrigin: number
	montoVenta: number // en moneda base (USD)
	trm: number // default a 1
	descuento: number // % descuento (0-100)
	clawback: number // % clawback (0-100)
}

export interface SimulationHierarchyResult {
	levelCode: string
	levelName: string
	porcentaje: number
	monto: number
	puntos: number // Opcional, si hay puntos
	error?: string
}

export interface SimulationResult {
	success: boolean
	error?: string
	comisionBase: number
	trmAplicada: number
	desglose: SimulationHierarchyResult[]
	totalClawback: number
	totalDescuento: number
	comisionNetaEstimada: number
}

export async function simulateCommission(
	params: SimuladorParams
): Promise<SimulationResult> {
	try {
		const session = await auth()
		const userIdStr = (session?.user as { idUser?: number })?.idUser || session?.user?.id
		if (!userIdStr) {
			return {
				success: false,
				error: 'No hay sesión activa o falta el ID de usuario.',
				comisionBase: 0,
				trmAplicada: params.trm,
				desglose: [],
				totalClawback: 0,
				totalDescuento: 0,
				comisionNetaEstimada: 0,
			}
		}

		const idUser = parseInt(userIdStr.toString(), 10)

		// 1. Obtener nivel del usuario
		const user = await prisma.user.findUnique({
			where: { idUser },
			include: { level: true },
		})

		if (!user?.idLevel) {
			return {
				success: false,
				error: 'El usuario no tiene un nivel configurado.',
				comisionBase: 0,
				trmAplicada: params.trm,
				desglose: [],
				totalClawback: 0,
				totalDescuento: 0,
				comisionNetaEstimada: 0,
			}
		}

		// 2. Obtener todos los niveles para calcular la jerarquía hacia abajo
		const allLevels = await prisma.level.findMany({ where: { status: true } })
		
		const allowedIds = new Set<number>()
		allowedIds.add(params.idLevelOrigin) // Mi nivel

		let addedNew = true
		while (addedNew) {
			addedNew = false
			for (const lvl of allLevels) {
				if (!allowedIds.has(lvl.idLevel) && lvl.idNextLevel && allowedIds.has(lvl.idNextLevel)) {
					allowedIds.add(lvl.idLevel)
					addedNew = true
				}
			}
		}

		// Obtener las configuraciones de producto para cada nivel de origen en allowedIds
		const productConfigurations = await prisma.productConfiguration.findMany({
			where: {
				idProduct: params.idProduct,
				idLevel: { in: Array.from(allowedIds) },
				active: true,
				level: { status: true },
				product: { status: true },
			},
			include: {
				product: true,
				level: true, // El nivel que origina
				productPercentageCommissions: {
					where: { active: true },
					include: {
						productPercentageCommissionCategories: {
							where: { 
								active: true,
							},
							include: {
								level: true,
							},
						},
					},
				},
			},
		})

		if (productConfigurations.length === 0) {
			return {
				success: false,
				error: 'No hay configuraciones de producto para esta jerarquía.',
				comisionBase: 0,
				trmAplicada: params.trm || 1,
				desglose: [],
				totalClawback: 0,
				totalDescuento: 0,
				comisionNetaEstimada: 0,
			}
		}

		// Tomar el pctComision base del producto
		const baseProduct = productConfigurations[0].product
		const pctComision = baseProduct.commissionPercentage
			? new Decimal(baseProduct.commissionPercentage).div(100)
			: new Decimal(0)
			
		const trm = new Decimal(params.trm || 1)
		const montoVenta = new Decimal(params.montoVenta)
		const comisionBase = montoVenta.mul(trm).mul(pctComision)

		const descuentoDecimal = new Decimal(params.descuento || 0).div(100)
		const clawbackDecimal = new Decimal(params.clawback || 0).div(100)

		const desglose: SimulationHierarchyResult[] = []
		let totalClawback = new Decimal(0)
		let totalDescuento = new Decimal(0)
		let comisionNetaEstimada = new Decimal(0)

		const miaLevel = allLevels.find(l => l.name.toUpperCase().includes('MIA'))
		const miaLevelId = miaLevel ? miaLevel.idLevel : -1

		// Procesar cada nivel de origen
		for (const config of productConfigurations) {
			const activePpc = config.productPercentageCommissions[0]
			if (!activePpc) continue

			const categoryForMe = activePpc.productPercentageCommissionCategories.find(c => c.idLevel === params.idLevelOrigin)
			const categoryForMia = activePpc.productPercentageCommissionCategories.find(c => c.idLevel === miaLevelId)
			
			if (categoryForMe) {
				// El valor en la BD (ej. 0.6) es directamente el multiplicador (60%)
				const porcentajeCalculo = categoryForMe.porcentajeDistribucion
				// Para mostrar en pantalla lo multiplicamos por 100
				const porcentajeDisplay = porcentajeCalculo.mul(100)

				const valorComisionBruta = comisionBase.mul(porcentajeCalculo)
				const amounts = computeLineDistributionAmounts(
					valorComisionBruta,
					descuentoDecimal,
					clawbackDecimal
				)

				let miaDisplay = 0
				let miaMonto = 0

				if (categoryForMia) {
					const miaCalc = categoryForMia.porcentajeDistribucion
					miaDisplay = miaCalc.mul(100).toNumber()
					const miaBruta = comisionBase.mul(miaCalc)
					const miaAmounts = computeLineDistributionAmounts(miaBruta, descuentoDecimal, clawbackDecimal)
					miaMonto = miaAmounts.finalAmount.toNumber()
				}

				// Push result representing "If config.level makes a sale, I get this"
				desglose.push({
					levelCode: config.level.code,
					levelName: `${config.level.name}`,
					porcentaje: porcentajeDisplay.toNumber(),
					monto: amounts.finalAmount.toNumber(),
					puntos: miaMonto, // Usaremos "puntos" temporalmente para guardar el monto de MIA
					// Para pasar el % de MIA lo guardaremos en error (hack temporal hasta que ajustemos la interfaz)
					error: miaDisplay.toString() 
				})

				totalClawback = totalClawback.add(amounts.clawbackAmount)
				totalDescuento = totalDescuento.add(amounts.taxAmount)
				comisionNetaEstimada = comisionNetaEstimada.add(amounts.finalAmount)
			}
		}

		// Ordenar el desglose por nivel de origen
		desglose.sort((a, b) => {
			const numA = parseInt(a.levelCode.replace('LEVEL_', ''), 10) || 0
			const numB = parseInt(b.levelCode.replace('LEVEL_', ''), 10) || 0
			return numA - numB
		})

		return {
			success: true,
			comisionBase: comisionBase.toNumber(),
			trmAplicada: trm.toNumber(),
			desglose,
			totalClawback: totalClawback.toNumber(),
			totalDescuento: totalDescuento.toNumber(),
			comisionNetaEstimada: comisionNetaEstimada.toNumber(),
		}

	} catch (error) {
		console.error('Error en simulateCommission:', error)
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Error interno de simulación',
			comisionBase: 0,
			trmAplicada: params.trm,
			desglose: [],
			totalClawback: 0,
			totalDescuento: 0,
			comisionNetaEstimada: 0,
		}
	}
}
