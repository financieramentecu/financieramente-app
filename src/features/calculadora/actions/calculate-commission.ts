'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import * as Sentry from '@sentry/nextjs'

export interface CalculadoraParams {
	idCompany: number
	idProduct: number
	idClientOrigin: number
	/** El nivel hasta donde el usuario quiere ver el desglose */
	idLevelView: number
	/** El nivel del MS que realmente vendió (define la distribución) */
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
	comisionNetaEstimada: number
	comisionTotalBruta: number
	/** Code del nivel que vendió (para resaltar fila) */
	sellerLevelCode: string
	/** Code del nivel real del usuario logueado (para resaltar su fila) */
	userOwnLevelCode: string
	/** Code del nivel a visualizar (hasta donde se ve) */
	viewLevelCode: string
	/** Bono extra del 2% cuando origen es Propio */
	leadBonus: number
}

export async function calculateCommission(
	params: CalculadoraParams
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
				comisionNetaEstimada: 0,
				comisionTotalBruta: 0,
				sellerLevelCode: '',
				userOwnLevelCode: '',
				viewLevelCode: '',
				leadBonus: 0,
			}
		}

		const idUser = parseInt(userIdStr.toString(), 10)

		// 1. Obtener nivel del usuario
		const user = await prisma.user.findUnique({
			where: { idUser },
			include: { level: true, role: true },
		})

		const userRoleCode = user?.role?.code ?? ''
		const userLevelCode = user?.level?.code ?? ''

		if (!user?.idLevel && userRoleCode === 'AGENTE') {
			return {
				success: false,
				error: 'Tu usuario no tiene un nivel configurado en la red de ventas. Por favor, comunícate con soporte.',
				comisionBase: 0,
				trmAplicada: params.trm,
				desglose: [],
				totalClawback: 0,
				comisionNetaEstimada: 0,
				comisionTotalBruta: 0,
				sellerLevelCode: '',
				userOwnLevelCode: '',
				viewLevelCode: '',
				leadBonus: 0,
			}
		}

		// 2. Obtener todos los niveles
		const allLevels = await prisma.level.findMany({ where: { status: true } })

		// Construir un mapa rápido id -> level
		const levelById = new Map(allLevels.map(l => [l.idLevel, l]))

		// Construir los IDs permitidos caminando la cadena desde idLevelOrigin hasta idLevelView
		// La cadena sube usando idNextLevel: LEVEL_0 -> LEVEL_1 -> ... -> LEVEL_5
		const allowedIds = new Set<number>()
		let current: (typeof allLevels)[number] | undefined = levelById.get(params.idLevelOrigin)
		let steps = 0
		while (current && steps < 20) {
			allowedIds.add(current.idLevel)
			if (current.idLevel === params.idLevelView) break // llegamos al techo
			if (!current.idNextLevel) break // no hay siguiente
			current = levelById.get(current.idNextLevel)
			steps++
		}


		// Obtener la config del VENDEDOR (idLevelOrigin) — sus categorías definen
		// cuánto recibe CADA nivel cuando ese vendedor coloca un negocio.
		const sellerProductConfig = await prisma.productConfiguration.findFirst({
			where: {
				idProduct: params.idProduct,
				idLevel: params.idLevelOrigin,
				active: true,
				level: { status: true },
				product: { status: true },
			},
			include: {
				product: true,
				level: true,
				productPercentageCommissions: {
					where: { active: true },
					include: {
						productPercentageCommissionCategories: {
							where: { active: true },
							include: { level: true },
						},
					},
				},
			},
		})

		if (!sellerProductConfig) {
			return {
				success: false,
				error: 'No hay configuración de producto activa para el nivel que vendió.',
				comisionBase: 0,
				trmAplicada: params.trm || 1,
				desglose: [],
				totalClawback: 0,
				comisionNetaEstimada: 0,
				comisionTotalBruta: 0,
				sellerLevelCode: '',
				userOwnLevelCode: userLevelCode,
				viewLevelCode: '',
				leadBonus: 0,
			}
		}

		// Tomar el pctComision base del producto
		const pctComision = sellerProductConfig.product.commissionPercentage
			? new Decimal(sellerProductConfig.product.commissionPercentage).div(100)
			: new Decimal(0)

		const trm = new Decimal(params.trm || 1)
		const montoVenta = new Decimal(params.montoVenta)
		const comisionBase = montoVenta.mul(trm).mul(pctComision)

		// El descuento ya no se aplica. Solo el clawback sobre la comisión del vendedor.
		const clawbackDecimal = new Decimal(params.clawback || 0).div(100)

		const desglose: SimulationHierarchyResult[] = []
		let totalClawback = new Decimal(0)
		let comisionNetaEstimada = new Decimal(0)
		let leadBonusAmount = new Decimal(0)

		// ─────────────────────────────────────────────────────────────────────
		// LÓGICA CENTRAL:
		// Las categorías de la config del VENDEDOR (idLevelOrigin) definen
		// cuánto recibe CADA nivel de la jerarquía cuando ese vendedor coloca
		// un negocio. Iteramos sobre esas categorías y filtramos por allowedIds
		// para mostrar solo los niveles dentro del rango solicitado
		// (de idLevelOrigin hasta idLevelView, inclusive).
		// ─────────────────────────────────────────────────────────────────────

		const activePpc = sellerProductConfig.productPercentageCommissions[0]

		if (!activePpc) {
			return {
				success: false,
				error: 'No hay configuración de comisión activa para el nivel que vendió.',
				comisionBase: comisionBase.toNumber(),
				trmAplicada: trm.toNumber(),
				desglose: [],
				totalClawback: 0,
				comisionNetaEstimada: 0,
				comisionTotalBruta: comisionBase.toNumber(),
				sellerLevelCode: '',
				userOwnLevelCode: userLevelCode,
				viewLevelCode: '',
				leadBonus: 0,
			}
		}

		const allCategories = activePpc.productPercentageCommissionCategories

		// Iterar sobre TODAS las categorías del vendedor y mostrar las que están en allowedIds
		for (const category of allCategories) {
			const catLevelId = category.idLevel

			// Solo mostrar niveles dentro del rango seleccionado
			if (!allowedIds.has(catLevelId)) continue

			const categoryLevel = levelById.get(catLevelId)
			if (!categoryLevel) continue

			const porcentajeCalculo = new Decimal(category.porcentajeDistribucion)

			const porcentajeDisplay = porcentajeCalculo.mul(100)
			const valorComisionBruta = comisionBase.mul(porcentajeCalculo)

			// Clawback SOLO sobre el monto base del nivel visualizado (Tu Nivel / idLevelView)
			let clawbackAmount = new Decimal(0)
			if (catLevelId === params.idLevelView) {
				clawbackAmount = valorComisionBruta.mul(clawbackDecimal)
				totalClawback = totalClawback.add(clawbackAmount)
			}

			// Guardar la comisión neta estimada del nivel que está visualizando (Tu Nivel)
			if (catLevelId === params.idLevelView) {
				comisionNetaEstimada = valorComisionBruta.sub(clawbackAmount)
			}

			desglose.push({
				levelCode: categoryLevel.code,
				levelName: categoryLevel.name,
				porcentaje: porcentajeDisplay.toNumber(),
				monto: valorComisionBruta.toNumber(),
				puntos: 0,
			})

			// Regla: Si el origen es Propio, se calcula un 2% extra
			if (params.idClientOrigin === 1 && catLevelId === params.idLevelOrigin) {
				const bonoPct = new Decimal(0.02)
				const bonoMonto = comisionBase.mul(bonoPct)
				leadBonusAmount = bonoMonto
				// El vendedor también recibe este bono
				if (catLevelId === params.idLevelView) {
					comisionNetaEstimada = comisionNetaEstimada.add(bonoMonto)
				}
			}
		}


		// Ordenar el desglose por número de nivel (LEVEL_0 primero)
		desglose.sort((a, b) => {
			const numA = parseInt(a.levelCode.replace('LEVEL_', ''), 10) || 0
			const numB = parseInt(b.levelCode.replace('LEVEL_', ''), 10) || 0
			return numA - numB
		})

		// El code del nivel del vendedor para resaltar en la UI
		const sellerLevel = levelById.get(params.idLevelOrigin)
		const sellerLevelCode = sellerLevel?.code ?? ''

		// El code del nivel a visualizar
		const viewLevel = levelById.get(params.idLevelView)
		const viewLevelCode = viewLevel?.code ?? ''

		return {
			success: true,
			comisionBase: comisionBase.toNumber(),
			trmAplicada: trm.toNumber(),
			desglose,
			totalClawback: totalClawback.toNumber(),
			comisionNetaEstimada: comisionNetaEstimada.toNumber(),
			comisionTotalBruta: comisionBase.toNumber(),
			sellerLevelCode,
			userOwnLevelCode: userLevelCode,
			viewLevelCode,
			leadBonus: leadBonusAmount.toNumber(),
		}

	} catch (error) {
		console.error('Error en calculateCommission:', error)
		Sentry.captureException(error)

		let errorMessage = error instanceof Error ? error.message : 'Error interno de simulación'

		// Manejar errores de Prisma por columnas o tablas faltantes (migraciones pendientes)
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2021' || error.code === 'P2022') {
				errorMessage = 'La base de datos se encuentra desactualizada (faltan aplicar migraciones). Por favor, contacte a soporte técnico para actualizar la base de datos.'
			}
		}

		return {
			success: false,
			error: errorMessage,
			comisionBase: 0,
			trmAplicada: params.trm,
			desglose: [],
			totalClawback: 0,
			comisionNetaEstimada: 0,
			comisionTotalBruta: 0,
			sellerLevelCode: '',
			userOwnLevelCode: '',
			viewLevelCode: '',
			leadBonus: 0,
		}
	}
}
