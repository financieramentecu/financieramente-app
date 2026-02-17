import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'
import {
	Prisma,
} from '@prisma/client'
import {
	calculateDistributions,
	type CalculationContext,
	type DistributionCategory,
} from '../lib/calculation-engine'
import { resolveHierarchy } from '../lib/hierarchy-resolver'
import type {
	// New Types
	ResumenFilaPreliquidacion,
	ResumenUsuarioPreliquidacion,
} from '../types/types'

// --- Constants ---
const DESCUENTO_POR_DEFECTO = new Decimal(0.12) // 12% is standard for Voluntarias per spec
const CLAWBACK_POR_DEFECTO = new Decimal(0.10) // 10% is standard for Polizas

// --- Helpers for Procesar ---

/**
 * Helper: Link PENDIENTE records to Business/User based on metadata.
 */
async function matchRecords(fileId: number) {
	// 1. Fetch PENDIENTE records
	const records = await prisma.settlementCommission.findMany({
		where: { idFileImport: fileId, status: 'PENDIENTE' },
	})

	for (const r of records) {
		let businessId: number | null = null

		if (r.commissionType === 'POLIZA' && r.policy) {
			const business = await prisma.business.findFirst({
				where: { contract: r.policy },
			})
			if (business) businessId = business.idBusiness
		} else if (r.commissionType === 'VOLUNTARIA') {
			// Placeholder for Voluntarias matching logic
		}

		if (businessId) {
			await prisma.settlementCommission.update({
				where: { idSettlementCommission: r.idSettlementCommission },
				data: { idBusiness: businessId, status: 'SINCRONIZADO' },
			})
		}
	}
}

/**
 * Core Process Function (New logic)
 */
type SettlementCommissionWithRelations = Prisma.SettlementCommissionGetPayload<{
	include: {
		business: {
			include: {
				user: true,
				productPercentageCommission: {
					include: {
						productPercentageCommissionCategories: {
							include: { category: true }
						}
					}
				}
			}
		}
	}
}>

export async function procesarPreLiquidacion(
	fileImportId: number,
	rangoFecha?: { inicio: Date; fin: Date }
): Promise<{ success: boolean; registrosProcesados: number; mensaje: string }> {
	try {
		await matchRecords(fileImportId)

		const fileImport = await prisma.fileImport.findUnique({
			where: { idFileImport: fileImportId },
		})
		if (!fileImport) throw new Error('Archivo no encontrado')

		const config = await prisma.commissionConfiguration.findFirst({
			where: { status: 'ACTIVE' },
			orderBy: { createdAt: 'desc' }
		})
		const officeDiscount = config?.discountPercentage ?? DESCUENTO_POR_DEFECTO
		const clawbackPercentage = config?.clawbackPercentage ?? CLAWBACK_POR_DEFECTO

		const whereClause: Prisma.SettlementCommissionWhereInput = {
			idFileImport: fileImportId,
			status: { in: ['SINCRONIZADO', 'LAG'] },
		}
		if (rangoFecha) {
			whereClause.paymentDate = { gte: rangoFecha.inicio, lte: rangoFecha.fin }
		}

		const records = await prisma.settlementCommission.findMany({
			where: whereClause,
			include: {
				business: {
					include: {
						user: true,
						productPercentageCommission: {
							include: {
								productPercentageCommissionCategories: {
									include: { category: true },
									where: { active: true }
								}
							}
						},
					},
				},
			},
		}) as SettlementCommissionWithRelations[]

		let processedCount = 0

		for (const record of records) {
			if (!record.business || !record.business.user) {
				console.warn(`Record ${record.idSettlementCommission} has no business / user linked.Skipping.`)
				continue
			}

			const user = record.business.user
			const hierarchy = await resolveHierarchy(user.idUser)

			if (!hierarchy) {
				console.warn(`User ${user.idUser} hierarchy not found.`)
				continue
			}

			const isClawAdjustment = record.description?.toLowerCase().includes('claw')
			const commissionValue = record.commissionValue ?? new Decimal(0)

			if (isClawAdjustment) {
				// T020: Handle Clawback Adjustment
				await prisma.$transaction(async (tx) => {
					await tx.commissionDistribution.deleteMany({
						where: { idSettlementCommission: record.idSettlementCommission }
					})

					// Create Distribution for Visibility (Negative Value)
					const createdDist = await tx.commissionDistribution.create({
						data: {
							idSettlementCommission: record.idSettlementCommission,
							idPercentageCommissionCategory: record.business?.productPercentageCommission?.productPercentageCommissionCategories[0]?.idProductPercentageCommissionCategory ?? 1,
							valueCommission: commissionValue,
							valueCommissionFinal: commissionValue,
							totalDiscount: new Decimal(0),
							idCommissionConfiguration: config?.idCommissionConfiguration,
							status: 'LIQUIDADO'
						}
					})

					// Create Clawback Record (DESCONTADO)
					const absValue = commissionValue.abs()
					await tx.clawback.create({
						data: {
							user: { connect: { idUser: user.idUser } },
							commissionDistribution: { connect: { idCommissionDistribution: createdDist.idCommissionDistribution } },
							value: absValue,
							percentageApplied: new Decimal(100), // Full amount
							state: 'DESCONTADO', // Adjustment/Usage of reserve
							reason: `Adjustment / Clawback: ${record.description} `,
							appliedDate: new Date()
						}
					})

					// Update Balance (Add negative value = Reduce Balance)
					await tx.clawbackBalance.upsert({
						where: { idUser: user.idUser },
						create: {
							user: { connect: { idUser: user.idUser } },
							totalAmount: commissionValue
						},
						update: {
							totalAmount: { increment: commissionValue }
						}
					})

					await tx.settlementCommission.update({
						where: { idSettlementCommission: record.idSettlementCommission },
						data: {
							status: 'PRELIQUIDADO',
							appliedDiscountPercentage: new Decimal(0),
							appliedClawbackPercentage: new Decimal(0)
						}
					})
				})
				processedCount++
				continue
			}
			const categories: DistributionCategory[] = record.business.productPercentageCommission?.productPercentageCommissionCategories.map((c) => ({
				id: c.idProductPercentageCommissionCategory,
				name: c.category.name,
				percentage: c.porcentajeDistribucion
			})) ?? []

			const ctx: CalculationContext = {
				settlementValue: commissionValue,
				hierarchy,
				categories,
				officeDiscount,
				clawbackPercentage,
				isPoliza: record.commissionType === 'POLIZA'
			}

			const distributions = calculateDistributions(ctx)

			await prisma.$transaction(async (tx) => {
				await tx.commissionDistribution.deleteMany({
					where: { idSettlementCommission: record.idSettlementCommission }
				})

				for (const dist of distributions) {
					// 1. Create Distribution
					const createdDist = await tx.commissionDistribution.create({
						data: {
							idSettlementCommission: record.idSettlementCommission,
							idPercentageCommissionCategory: dist.categoryId,
							valueCommission: dist.baseAmount,
							valueCommissionFinal: dist.finalAmount,
							totalDiscount: dist.discountAmount,
							idCommissionConfiguration: config?.idCommissionConfiguration,
							status: 'LIQUIDADO'
						}
					})

					// 2. Handle Clawback (If > 0)
					if (dist.clawbackAmount.gt(0)) {
						// Create Clawback Record
						await tx.clawback.create({
							data: {
								user: { connect: { idUser: user.idUser } },
								commissionDistribution: { connect: { idCommissionDistribution: createdDist.idCommissionDistribution } },
								value: dist.clawbackAmount,
								percentageApplied: dist.clawbackPercentageApplied,
								state: 'ACUMULADO', // Retention
								reason: `Retention 12% Poliza ${record.policy ?? ''}`, // Reason?
								appliedDate: new Date()
							}
						})

						// Update Balance
						await tx.clawbackBalance.upsert({
							where: { idUser: user.idUser },
							create: {
								user: { connect: { idUser: user.idUser } },
								totalAmount: dist.clawbackAmount
							},
							update: {
								totalAmount: { increment: dist.clawbackAmount }
							}
						})
					}
				}

				await tx.settlementCommission.update({
					where: { idSettlementCommission: record.idSettlementCommission },
					data: {
						status: 'PROCESADO',
						appliedDiscountPercentage: officeDiscount,
						appliedClawbackPercentage: record.commissionType === 'POLIZA' ? clawbackPercentage : null
					}
				})
			})

			processedCount++
		}

		await prisma.fileImport.update({
			where: { idFileImport: fileImportId },
			data: {
				status: 'PRELIQUIDADO',
				preLiquidacionDate: new Date()
			}
		})

		// Send email logic (if needed)...

		return {
			success: true,
			registrosProcesados: processedCount,
			mensaje: 'Procesamiento completado',
		}
	} catch (error) {
		console.error('Error in procesarPreLiquidacion:', error)
		return {
			success: false,
			registrosProcesados: 0,
			mensaje: error instanceof Error ? error.message : 'Unknown Error',
		}
	}
}

// --- Legacy Query Functions (Restored & Updated) ---

export async function obtenerDescuentoActivo(): Promise<{
	idDiscount: number
	percentage: Decimal
} | null> {
	const descuentoActivo = await prisma.commissionConfiguration.findFirst({
		where: { status: 'ACTIVE' },
		orderBy: { createdAt: 'desc' },
	})
	if (!descuentoActivo) return null
	return {
		idDiscount: descuentoActivo.idCommissionConfiguration,
		percentage: descuentoActivo.discountPercentage,
	}
}

export async function obtenerConfiguracionPorcentajes(
	idProductPercentageCommission: number
): Promise<ConfiguracionPorcentajes> {
	const configuracion =
		await prisma.productPercentageCommissionCategory.findMany({
			where: {
				idProductPercentageCommission,
				active: true,
			},
			include: { category: true },
		})
	// Map to ConfiguracionPorcentajes
	const porcentajes: ConfiguracionPorcentajes = {}
	for (const config of configuracion) {
		const name = config.category.name.toUpperCase()
		const pct = config.porcentajeDistribucion.toNumber()
		if (name.includes('GENERAL')) porcentajes.general = pct
		else if (name.includes('AGENCIA')) porcentajes.agencia = pct
		else if (name.includes('LIDER') || name.includes('LÍDER')) porcentajes.lider = pct
		else if (name.includes('COACH')) porcentajes.coach = pct
	}
	return porcentajes
}

function configFromCategories(
	cats: Array<{ category: { name: string }; porcentajeDistribucion: Decimal }>
): ConfiguracionPorcentajes {
	const porcentajes: ConfiguracionPorcentajes = {}
	for (const cat of cats) {
		const name = cat.category.name.toUpperCase()
		const pct = cat.porcentajeDistribucion.toNumber()
		if (name.includes('GENERAL')) porcentajes.general = pct
		else if (name.includes('AGENCIA')) porcentajes.agencia = pct
		else if (name.includes('LIDER') || name.includes('LÍDER'))
			porcentajes.lider = pct
		else if (name.includes('COACH')) porcentajes.coach = pct
	}
	return porcentajes
}

export function aplicarFormulas(
	comisionBase: Decimal,
	porcentajes: ConfiguracionPorcentajes,
	descuento?: Decimal
): ComisionesCalculadas {
	// Legacy calculation logic (Used by UI for preview)
	const descuentoAplicar = descuento || DESCUENTO_POR_DEFECTO
	const generalBruta = porcentajes.general ? comisionBase.mul(new Decimal(porcentajes.general)) : new Decimal(0)
	const comisionBrutaAgencia = porcentajes.agencia ? comisionBase.mul(new Decimal(porcentajes.agencia)) : new Decimal(0)
	const comisionBrutaLider = porcentajes.lider ? comisionBase.mul(new Decimal(porcentajes.lider)) : new Decimal(0)
	const comisionBrutaCoach = porcentajes.coach ? comisionBase.mul(new Decimal(porcentajes.coach)) : new Decimal(0)

	const generalDescuento = generalBruta.sub(generalBruta.mul(descuentoAplicar))
	const comisionAgenciaDescuento = comisionBrutaAgencia.sub(comisionBrutaAgencia.mul(descuentoAplicar))
	const comisionLiderDescuento = comisionBrutaLider.sub(comisionBrutaLider.mul(descuentoAplicar))
	const comisionCoachDescuento = comisionBrutaCoach.sub(comisionBrutaCoach.mul(descuentoAplicar))

	return {
		generalBruta,
		generalDescuento,
		comisionBrutaAgencia,
		comisionAgenciaDescuento,
		comisionBrutaLider,
		comisionLiderDescuento,
		comisionBrutaCoach,
		comisionCoachDescuento,
	}
}

export async function obtenerDetallePreLiquidacion(
	fileId: number
): Promise<RespuestaDetallePreLiquidacion | null> {
	// Same implementation as before (Lines 282-404 in previous version)
	const fileImport = await prisma.fileImport.findUnique({
		where: { idFileImport: fileId },
		include: { user: { select: { name: true, lastName: true } } },
	})
	if (!fileImport) return null

	const registros = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileId,
			status: { in: ['SINCRONIZADO', 'LAG', 'PRELIQUIDADO'] }, // Included PRELIQUIDADO
		},
		include: {
			business: {
				include: {
					client: true,
					user: { select: { idUser: true, name: true, lastName: true, identityNumber: true } },
					productPercentageCommission: {
						include: {
							productPercentageCommissionCategories: {
								include: { category: true },
								where: { active: true },
							},
						},
					},
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	}) as SettlementCommissionWithRelations[]

	const descuentoActivo = await obtenerDescuentoActivo()
	const descuentoPorcentaje = descuentoActivo ? descuentoActivo.percentage : DESCUENTO_POR_DEFECTO

	const distribucionMap = new Map<string, AgenteDistribucion>()
	const registrosFormateados: RegistroDetallePreLiquidacion[] = []

	for (const r of registros) {
		const comisionBase = r.commissionValue || new Decimal(0)
		const categorias = r.business?.productPercentageCommission?.productPercentageCommissionCategories ?? []
		const porcentajes = configFromCategories(categorias)
		const comisiones = aplicarFormulas(comisionBase, porcentajes, descuentoPorcentaje)

		if (r.business?.user) {
			const agenteKey = String(r.business.user.idUser)
			if (!distribucionMap.has(agenteKey)) {
				distribucionMap.set(agenteKey, {
					idAgente: r.business.user.idUser,
					nombreAgente: `${r.business.user.name} ${r.business.user.lastName ?? ''} `.trim(),
					cedulaAgente: r.business.user.identityNumber ?? '',
					totalComision: 0,
					totalGeneral: 0,
					totalAgencia: 0,
					totalLider: 0,
					totalCoach: 0,
					cantidadRegistros: 0,
					sincronizados: 0,
					rezagados: 0,
				})
			}
			const agente = distribucionMap.get(agenteKey)!
			agente.totalComision += comisionBase.toNumber()
			agente.totalGeneral += comisiones.generalDescuento.toNumber()
			agente.totalAgencia += comisiones.comisionAgenciaDescuento.toNumber()
			agente.totalLider += comisiones.comisionLiderDescuento.toNumber()
			agente.totalCoach += comisiones.comisionCoachDescuento.toNumber()
			agente.cantidadRegistros += 1
			if (r.status === 'SINCRONIZADO') agente.sincronizados += 1
			else if (r.status === 'LAG') agente.rezagados += 1
		}

		registrosFormateados.push({
			idSettlementCommission: r.idSettlementCommission,
			idBusiness: r.idBusiness ?? 0,
			producto: r.product,
			esRezagado: r.isLag || r.status === 'LAG',
			nombreCliente: r.business?.client ? `${r.business.client.name} ${r.business.client.lastName ?? ''} `.trim() : null,
			cedulaAgente: r.business?.user?.identityNumber ?? '',
			nombreAgente: r.business?.user ? `${r.business.user.name} ${r.business.user.lastName ?? ''} `.trim() : '',
			numeroContrato: r.business?.contract ?? r.policy ?? null,
			tipoComision: r.description ?? r.policy ?? null, // Use description (Legacy 'concepto')
			comision: comisionBase.toNumber(),
			generalBruta: comisiones.generalBruta.toNumber(),
			generalDescuento: comisiones.generalDescuento.toNumber(),
			agenciaBruta: comisiones.comisionBrutaAgencia.toNumber(),
			agenciaDescuento: comisiones.comisionAgenciaDescuento.toNumber(),
			liderBruta: comisiones.comisionBrutaLider.toNumber(),
			liderDescuento: comisiones.comisionLiderDescuento.toNumber(),
			coachBruta: comisiones.comisionBrutaCoach.toNumber(),
			coachDescuento: comisiones.comisionCoachDescuento.toNumber(),
			estado: r.status,
		})
	}

	const distribucion = Array.from(distribucionMap.values())
	const resumen = {
		totalRegistros: registros.length,
		sincronizados: registros.filter((x) => x.status === 'SINCRONIZADO').length,
		rezagados: registros.filter((x) => x.status === 'LAG').length,
		totalComision: registrosFormateados.reduce((s, x) => s + x.comision, 0),
		totalGeneral: registrosFormateados.reduce((s, x) => s + x.generalDescuento, 0),
		totalAgencia: registrosFormateados.reduce((s, x) => s + x.agenciaDescuento, 0),
		totalLider: registrosFormateados.reduce((s, x) => s + x.liderDescuento, 0),
		totalCoach: registrosFormateados.reduce((s, x) => s + x.coachDescuento, 0),
	}

	return {
		archivo: {
			idFileImport: fileImport.idFileImport,
			nombreArchivo: fileImport.nameFile,
			usuarioCargo: `${fileImport.user.name} ${fileImport.user.lastName ?? ''} `.trim(),
			fechaCarga: fileImport.loadDate.toISOString().split('T')[0],
			totalRegistros: fileImport.totalRecord,
			sincronizados: fileImport.sincronizadoRecord,
			rezagados: fileImport.rezagadoRecord,
		},
		registros: registrosFormateados,
		distribucion,
		resumen,
	}
}

export async function calcularComisionesParaRegistro(
	idSettlementCommission: number
): Promise<ComisionesCalculadas | null> {
	// Legacy single record calc
	const settlement = await prisma.settlementCommission.findUnique({
		where: { idSettlementCommission },
		include: { business: { include: { productPercentageCommission: true } } },
	})
	if (!settlement || !settlement.business) return null
	const idProductPercentageCommission = settlement.business.idProductPercentageCommission
	const porcentajes = await obtenerConfiguracionPorcentajes(idProductPercentageCommission)
	const descuentoActivo = await obtenerDescuentoActivo()
	const descuento = descuentoActivo ? descuentoActivo.percentage : DESCUENTO_POR_DEFECTO
	const comisionBase = settlement.commissionValue || new Decimal(0)
	return aplicarFormulas(comisionBase, porcentajes, descuento)
}

export async function obtenerResumenPreliquidacionPorUsuario(
	fileImportId: number,
	rangoFecha: { inicio: Date; fin: Date },
	archivoNombre: string
): Promise<ResumenUsuarioPreliquidacion[]> {
	// Logic from legacy file
	const settlements = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileImportId,
			status: 'PRELIQUIDADO',
			paymentDate: { gte: rangoFecha.inicio, lte: rangoFecha.fin },
		},
		select: { idSettlementCommission: true },
	})
	const ids = settlements.map((s) => s.idSettlementCommission)
	if (ids.length === 0) return []

	const distribuciones = await prisma.commissionDistribution.findMany({
		where: { idSettlementCommission: { in: ids } },
		include: {
			settlementCommission: {
				include: {
					business: {
						include: {
							user: { select: { idUser: true, email: true, name: true, lastName: true } },
						},
					},
				},
			},
			productPercentageCommissionCategory: {
				include: { category: { select: { name: true } } },
			},
		},
	})
	// Grouping logic (same as before)
	const periodo = `${rangoFecha.inicio.toISOString().split('T')[0]} - ${rangoFecha.fin.toISOString().split('T')[0]} `
	const byUser = new Map<number, { email: string; nombreUsuario: string; byBusiness: Map<number, { nombreNegocio: string; valor: number; categorias: string[] }> }>()

	for (const d of distribuciones) {
		const business = d.settlementCommission.business
		if (!business?.user) continue
		const u = business.user
		const idBusiness = business.idBusiness
		const nombreNegocio = business.contract ? `Contrato ${business.contract} ` : `Negocio #${idBusiness} `
		const valor = d.valueCommissionFinal.toNumber()
		const categoria = d.productPercentageCommissionCategory?.category?.name ?? ''

		if (!byUser.has(u.idUser)) {
			byUser.set(u.idUser, { email: u.email, nombreUsuario: `${u.name} ${u.lastName ?? ''} `.trim(), byBusiness: new Map() })
		}
		const userEntry = byUser.get(u.idUser)!
		if (!userEntry.byBusiness.has(idBusiness)) {
			userEntry.byBusiness.set(idBusiness, { nombreNegocio, valor: 0, categorias: [] })
		}
		const biz = userEntry.byBusiness.get(idBusiness)!
		biz.valor += valor
		if (categoria && !biz.categorias.includes(categoria)) biz.categorias.push(categoria)
	}

	const result: ResumenUsuarioPreliquidacion[] = []
	for (const [idUser, entry] of byUser) {
		const filas: ResumenFilaPreliquidacion[] = []
		for (const [idBusiness, biz] of entry.byBusiness) {
			filas.push({
				idBusiness,
				nombreNegocio: biz.nombreNegocio,
				valorComision: Math.round(biz.valor * 100) / 100,
				categoriaConcepto: biz.categorias.length > 0 ? biz.categorias.join(', ') : undefined,
			})
		}
		if (filas.length > 0) {
			result.push({ idUser, email: entry.email, nombreUsuario: entry.nombreUsuario, archivoNombre, periodo, filas })
		}
	}
	return result
}
