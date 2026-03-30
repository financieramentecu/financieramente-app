import { prisma } from '@/lib/prisma'
import { sendResumenPreliquidacionEmail } from '@/features/email/lib/preliquidacion-resumen-notification'
import { Decimal } from '@prisma/client/runtime/library'
import type {
	AgenteDistribucion,
	ArchivoDisponible,
	ComisionesCalculadas,
	ConfiguracionPorcentajes,
	DistribucionComision,
	ItemDistribucionComision,
	RegistroDetallePreLiquidacion,
	RegistroLiquidacionDetalle,
	RespuestaArchivosDisponibles,
	RespuestaDetallePreLiquidacion,
	RespuestaDistribucionComision,
	RespuestaRegistrosLiquidacion,
	ResumenFilaPreliquidacion,
	ResumenUsuarioPreliquidacion,
} from '../types/types'
import { deriveFlow } from '../lib/pre-liquidacion-flow'

/**
 * Obtiene los archivos disponibles para pre-liquidar y los ya pre-liquidados.
 * Enforces Screaming Architecture isolating the database calls from the API router.
 */
export async function obtenerArchivosDisponiblesPreliquidacion(): Promise<RespuestaArchivosDisponibles> {
	const todosArchivos = await prisma.fileImport.findMany({
		where: {
			status: { in: ['LOAD', 'PRE-SETTLED', 'PRE-SETTLE-APROVED'] },
			settlementCommissions: {
				some: {
					status: {
						in: ['SYNCHRONIZED', 'PRE-SETTLED', 'PRE-SETTLE-APROVED'],
					},
				},
			},
		},
		select: {
			idFileImport: true,
			nameFile: true,
			fileType: true,
			loadDate: true,
			preLiquidacionDate: true,
			totalRecord: true,
			sincronizadoRecord: true,
			rezagadoRecord: true,
			status: true,
			user: {
				select: {
					name: true,
					lastName: true,
				},
			},
		},
		orderBy: {
			loadDate: 'desc',
		},
	})

	const fileIds = todosArchivos.map((a) => a.idFileImport)
	const countsMap: Record<
		number,
		{ sincronizados: number; registrosPreliquidados: number }
	> = {}

	if (fileIds.length > 0) {
		const groups = await prisma.settlementCommission.groupBy({
			by: ['idFileImport', 'status'],
			where: {
				idFileImport: { in: fileIds },
				status: { in: ['SYNCHRONIZED', 'PRE-SETTLED', 'PRE-SETTLE-APROVED'] },
			},
			_count: { idSettlementCommission: true },
		})
		for (const row of groups) {
			if (!countsMap[row.idFileImport]) {
				countsMap[row.idFileImport] = {
					sincronizados: 0,
					registrosPreliquidados: 0,
				}
			}
			const count = row._count.idSettlementCommission
			if (row.status === 'SYNCHRONIZED') {
				countsMap[row.idFileImport].sincronizados = count
			} else if (row.status === 'PRE-SETTLED' || row.status === 'PRE-SETTLE-APROVED') {
				countsMap[row.idFileImport].registrosPreliquidados += count
			}
		}
	}

	const archivos: ArchivoDisponible[] = todosArchivos.map((archivo) => {
		const counts = countsMap[archivo.idFileImport] ?? {
			sincronizados: 0,
			registrosPreliquidados: 0,
		}
		return {
			idFileImport: archivo.idFileImport,
			nombreArchivo: archivo.nameFile,
			fileType: archivo.fileType,
			usuarioCargo:
				`${archivo.user.name} ${archivo.user.lastName || ''}`.trim(),
			fechaCarga: archivo.loadDate.toISOString().split('T')[0],
			fechaPreLiquidacion: archivo.preLiquidacionDate
				? archivo.preLiquidacionDate.toISOString().split('T')[0]
				: null,
			cantidadRegistros: archivo.totalRecord,
			totalRegistros: archivo.totalRecord,
			sincronizados: counts.sincronizados,
			rezagados: archivo.rezagadoRecord,
			estado: archivo.status,
			registrosPreliquidados: counts.registrosPreliquidados,
		}
	})

	const disponiblesParaPreliquidar = archivos.filter(
		(a) => a.estado === 'LOAD' && (a.sincronizados ?? 0) > (a.registrosPreliquidados ?? 0)
	)
	const archivosPreLiquidados = archivos.filter(
		(a) => a.estado === 'PRE-SETTLED' || (a.registrosPreliquidados ?? 0) > 0
	)

	const resumen = {
		totalArchivos: archivos.length,
		sincronizados: disponiblesParaPreliquidar.length,
		preLiquidados: archivosPreLiquidados.length,
	}

	return {
		archivos,
		resumen,
	}
}

/**
 * Porcentaje de descuento por defecto (12%)
 * Se usa como fallback si no hay descuento activo en base de datos
 */
const DESCUENTO_POR_DEFECTO = new Decimal(0.12)

/**
 * Obtiene el descuento activo desde la base de datos
 * @returns Objeto con el porcentaje de descuento y su ID, o null si no hay descuento activo
 */
export async function obtenerDescuentoActivo(): Promise<{
	discountPercentage: Decimal
	clawbackPercentage: Decimal | null
} | null> {
	const activeDiscounts = await prisma.commissionDiscount.findMany({
		where: { status: 'ACTIVE', type: { in: ['IMPUESTO', 'CLAWBACK'] } },
	})

	const impuesto = activeDiscounts.find((d) => d.type === 'IMPUESTO')
	const clawback = activeDiscounts.find((d) => d.type === 'CLAWBACK')

	if (!impuesto) {
		return null
	}

	return {
		discountPercentage: new Decimal(impuesto.percentage.toNumber() / 100),
		clawbackPercentage: clawback
			? new Decimal(clawback.percentage.toNumber() / 100)
			: null,
	}
}

/**
 * Obtiene la configuración de porcentajes de comisión para un negocio
 */
export async function obtenerConfiguracionPorcentajes(
	idProductPercentageCommission: number,
	usePortfolio: boolean
): Promise<ConfiguracionPorcentajes> {
	const configuracion =
		await prisma.productPercentageCommissionCategory.findMany({
			where: {
				idProductPercentageCommission,
				active: true,
			},
			include: {
				category: true,
			},
		})

	return configFromCategories(configuracion, usePortfolio)
}

/**
 * Construye ConfiguracionPorcentajes desde categorías ya cargadas (evita N+1)
 */
function configFromCategories(
	cats: Array<{
		category: { name: string }
		porcentajeDistribucion: Decimal
		porcentajePortfolio: Decimal | null
	}>,
	usePortfolio: boolean
): ConfiguracionPorcentajes {
	const porcentajes: ConfiguracionPorcentajes = {}
	for (const cat of cats) {
		const name = cat.category.name.toUpperCase()
		const pctSource =
			usePortfolio && cat.porcentajePortfolio !== null
				? cat.porcentajePortfolio
				: cat.porcentajeDistribucion
		const pct = pctSource.toNumber()
		if (name.includes('GENERAL')) porcentajes.general = pct
		else if (name.includes('AGENCIA')) porcentajes.agencia = pct
		else if (name.includes('LIDER') || name.includes('LÍDER'))
			porcentajes.lider = pct
		else if (name.includes('COACH')) porcentajes.coach = pct
	}
	return porcentajes
}

/**
 * Obtiene el detalle de pre-liquidación de un archivo (registros, distribución por agente, resumen).
 * Toda la lógica de negocio y acceso a datos vive aquí; el router solo delega.
 */
export async function obtenerDetallePreLiquidacion(
	fileId: number
): Promise<RespuestaDetallePreLiquidacion | null> {
	const fileImport = await prisma.fileImport.findUnique({
		where: { idFileImport: fileId },
		include: {
			user: { select: { name: true, lastName: true } },
		},
	})

	if (!fileImport) return null

	const registros = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileId,
			status: 'SYNCHRONIZED',
		},
		include: {
			business: {
				include: {
					client: true,
					user: {
						select: {
							idUser: true,
							name: true,
							lastName: true,
							identityNumber: true,
						},
					},
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
	})

	const distribucionMap = new Map<string, AgenteDistribucion>()
	const registrosFormateados: RegistroDetallePreLiquidacion[] = []

	for (const r of registros) {
		const comisionBase = r.baseCommission || r.commissionValue || new Decimal(0)
		const descuentoPorcentaje = r.discountPercentage ?? DESCUENTO_POR_DEFECTO
		const clawbackPorcentaje = r.clawbackPercentage ?? new Decimal(0)
		const usePortfolio = r.originCommission === 'CARTERA'
		const categorias =
			r.business?.productPercentageCommission
				?.productPercentageCommissionCategories ?? []
		const porcentajes = configFromCategories(categorias, usePortfolio)
		const comisiones = aplicarFormulas(
			comisionBase,
			porcentajes,
			descuentoPorcentaje,
			clawbackPorcentaje
		)

		if (r.business?.user) {
			const agenteKey = String(r.business.user.idUser)
			if (!distribucionMap.has(agenteKey)) {
				distribucionMap.set(agenteKey, {
					idAgente: r.business.user.idUser,
					nombreAgente:
						`${r.business.user.name} ${r.business.user.lastName ?? ''}`.trim(),
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
			if (r.status === 'SYNCHRONIZED') agente.sincronizados += 1
			else if (r.status === 'LAG') agente.rezagados += 1
		}

		registrosFormateados.push({
			idSettlementCommission: r.idSettlementCommission,
			idBusiness: r.idBusiness ?? 0,
			producto: r.descripcion,
			esRezagado: r.isLag || r.status === 'LAG',
			nombreCliente: r.business?.client
				? `${r.business.client.name} ${r.business.client.lastName ?? ''}`.trim()
				: null,
			cedulaAgente: r.business?.user?.identityNumber ?? '',
			nombreAgente: r.business?.user
				? `${r.business.user.name} ${r.business.user.lastName ?? ''}`.trim()
				: '',
			numeroContrato: r.business?.contract ?? null,
			tipoComision: r.descripcion,
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
		sincronizados: registros.filter((x) => x.status === 'SYNCHRONIZED').length,
		rezagados: registros.filter((x) => x.status === 'LAG').length,
		totalComision: registrosFormateados.reduce((s, x) => s + x.comision, 0),
		totalGeneral: registrosFormateados.reduce(
			(s, x) => s + x.generalDescuento,
			0
		),
		totalAgencia: registrosFormateados.reduce(
			(s, x) => s + x.agenciaDescuento,
			0
		),
		totalLider: registrosFormateados.reduce((s, x) => s + x.liderDescuento, 0),
		totalCoach: registrosFormateados.reduce((s, x) => s + x.coachDescuento, 0),
	}

	return {
		archivo: {
			idFileImport: fileImport.idFileImport,
			nombreArchivo: fileImport.nameFile,
			usuarioCargo:
				`${fileImport.user.name} ${fileImport.user.lastName ?? ''}`.trim(),
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

/**
 * Returns PRE-SETTLED records for a given file import.
 * Used by the pre-liquidación detail page to display commissions already processed.
 * Does not run distribution formulas — flat field set only.
 */
export async function obtenerComisionesPreliquidadas(
	fileId: number
): Promise<RespuestaRegistrosLiquidacion | null> {
	const fileImport = await prisma.fileImport.findUnique({
		where: { idFileImport: fileId },
		select: {
			idFileImport: true,
			nameFile: true,
			fileType: true,
			loadDate: true,
			totalRecord: true,
			sincronizadoRecord: true,
			rezagadoRecord: true,
			user: {
				select: { name: true, lastName: true },
			},
		},
	})

	if (!fileImport) return null

	const registros = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileId,
			status: 'PRE-SETTLED',
		},
		include: {
			business: {
				select: {
					contract: true,
					user: {
						select: { name: true, lastName: true },
					},
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	})

	const flat: RegistroLiquidacionDetalle[] = registros.map((r) => {
		const nombreAsesor = r.business?.user
			? `${r.business.user.name} ${r.business.user.lastName ?? ''}`.trim()
			: ''
		return {
			idSettlementCommission: r.idSettlementCommission,
			idBusiness: r.idBusiness,
			contrato: r.contract ?? r.business?.contract ?? null,
			nombreAsesor,
			tipo: r.descripcion,
			monto: (r.commissionValue ?? r.baseCommission ?? new Decimal(0)).toNumber(),
			baseComision: (r.baseCommission ?? r.commissionValue ?? new Decimal(0)).toNumber(),
			porcentajeDescuento: (r.discountPercentage ?? new Decimal(0)).toNumber(),
			porcentajeClawback: (r.clawbackPercentage ?? new Decimal(0)).toNumber(),
			esClawback: r.isClawback ?? false,
			esRezagado: r.isLag ?? false,
			fechaSincronizacion: r.syncDate?.toISOString() ?? null,
			fechaRezagado: r.lagDate?.toISOString() ?? null,
			fechaInicio: r.startDate?.toISOString().split('T')[0] ?? null,
			fechaFin: r.endDate?.toISOString().split('T')[0] ?? null,
		}
	})

	const fileType = fileImport.fileType ?? ''

	return {
		archivo: {
			idFileImport: fileImport.idFileImport,
			nombreArchivo: fileImport.nameFile,
			fileType,
			usuarioCargo:
				`${fileImport.user.name} ${fileImport.user.lastName ?? ''}`.trim(),
			fechaCarga: fileImport.loadDate.toISOString().split('T')[0],
			totalRegistros: fileImport.totalRecord,
			sincronizados: flat.length,
		},
		registros: flat,
	}
}

/**
 * Returns SYNCHRONIZED records for the detail page (per-record Liquidar/Rezagar).
 * Does not run distribution formulas — flat field set only.
 */
export async function obtenerRegistrosParaLiquidacion(
	fileId: number
): Promise<RespuestaRegistrosLiquidacion | null> {
	const fileImport = await prisma.fileImport.findUnique({
		where: { idFileImport: fileId },
		select: {
			idFileImport: true,
			nameFile: true,
			fileType: true,
			loadDate: true,
			totalRecord: true,
			sincronizadoRecord: true,
			rezagadoRecord: true,
			user: {
				select: { name: true, lastName: true },
			},
		},
	})

	if (!fileImport) return null

	const registros = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileId,
			status: 'SYNCHRONIZED',
		},
		include: {
			business: {
				select: {
					contract: true,
					user: {
						select: { name: true, lastName: true },
					},
				},
			},
		},
		orderBy: { createdAt: 'asc' },
	})

	const flat: RegistroLiquidacionDetalle[] = registros.map((r) => {
		const nombreAsesor = r.business?.user
			? `${r.business.user.name} ${r.business.user.lastName ?? ''}`.trim()
			: ''
		return {
			idSettlementCommission: r.idSettlementCommission,
			idBusiness: r.idBusiness,
			contrato: r.contract ?? r.business?.contract ?? null,
			nombreAsesor,
			tipo: r.descripcion,
			monto: (r.commissionValue ?? r.baseCommission ?? new Decimal(0)).toNumber(),
			baseComision: (r.baseCommission ?? r.commissionValue ?? new Decimal(0)).toNumber(),
			porcentajeDescuento: (r.discountPercentage ?? new Decimal(0)).toNumber(),
			porcentajeClawback: (r.clawbackPercentage ?? new Decimal(0)).toNumber(),
			esClawback: r.isClawback ?? false,
			esRezagado: r.isLag ?? false,
			fechaSincronizacion: r.syncDate?.toISOString() ?? null,
			fechaRezagado: r.lagDate?.toISOString() ?? null,
			fechaInicio: r.startDate?.toISOString().split('T')[0] ?? null,
			fechaFin: r.endDate?.toISOString().split('T')[0] ?? null,
		}
	})

	const fileType = fileImport.fileType ?? ''

	return {
		archivo: {
			idFileImport: fileImport.idFileImport,
			nombreArchivo: fileImport.nameFile,
			fileType,
			usuarioCargo:
				`${fileImport.user.name} ${fileImport.user.lastName ?? ''}`.trim(),
			fechaCarga: fileImport.loadDate.toISOString().split('T')[0],
			totalRegistros: fileImport.totalRecord,
			sincronizados: flat.length,
		},
		registros: flat,
	}
}

/**
 * Returns the commission distribution breakdown for a given settlement commission.
 * Performs a single findMany with a 4-level include chain to avoid N+1 queries.
 * Returns null when no ComissionDistribution rows exist for the given id.
 */
export async function obtenerDistribucionComision(
	id: number
): Promise<RespuestaDistribucionComision | null> {
	const rows = await prisma.comissionDistribution.findMany({
		where: { idSettlementCommission: id },
		include: {
			productPercentageCommissionCategory: {
				include: {
					category: true,
					productPercentageCommission: {
						include: {
							productConfiguration: {
								include: {
									product: true,
									clientOrigin: true,
								},
							},
						},
					},
				},
			},
			settlementCommission: {
				include: {
					business: {
						include: {
							user: { select: { name: true, lastName: true } },
						},
					},
				},
			},
			clawback: true,
		},
	})

	if (rows.length === 0) return null

	const first = rows[0]
	const sc = first.settlementCommission
	const usePortfolio = sc.originCommission === 'CARTERA'

	const distribuciones: ItemDistribucionComision[] = rows.map((row) => {
		const ppcc = row.productPercentageCommissionCategory
		const categoriaNombre = ppcc?.category?.name ?? ''
		const porcentajeDistribucion =
			usePortfolio && ppcc?.porcentajePortfolio != null
				? ppcc.porcentajePortfolio.toNumber()
				: (ppcc?.porcentajeDistribucion?.toNumber() ?? 0)

		const clawbackData = row.clawback
			? {
					valor: row.clawback.valueClawback.toNumber(),
					porcentaje: row.clawback.porcentajeApplied.toNumber(),
					estado: row.clawback.state,
					fechaAplicacion: row.clawback.appliedDate
						? row.clawback.appliedDate.toISOString().split('T')[0]
						: null,
				}
			: null

		return {
			idComissionDistribution: row.idComissionDistribution,
			categoria: categoriaNombre,
			porcentajeDistribucion,
			comisionBruta: row.valueComission.toNumber(),
			comisionNeta: row.valueComissionFinal.toNumber(),
			totalDescuento: row.totalDiscount?.toNumber() ?? 0,
			porcentajeDescuento: row.appliedDiscountPercentage?.toNumber() ?? 0,
			value_commission_final: row.valueComissionFinal.toNumber(),
			value_clawback_percentage: row.clawback?.porcentajeApplied.toNumber() ?? 0,
			clawback: clawbackData,
		}
	})

	const ppccFirst = first.productPercentageCommissionCategory
	const productConfig =
		ppccFirst?.productPercentageCommission?.productConfiguration

	const distribucion: DistribucionComision = {
		idSettlementCommission: id,
		categoria: ppccFirst?.category?.name ?? null,
		producto: productConfig?.product?.name ?? null,
		origen: productConfig?.clientOrigin?.name ?? null,
		nombreAsesor: sc.business?.user
			? `${sc.business.user.name} ${sc.business.user.lastName ?? ''}`.trim()
			: null,
		distribuciones,
	}

	return { distribucion }
}

/**
 * Transitions selected SYNCHRONIZED records to SETTLED. If no SYNCHRONIZED remain for the file, sets FileImport.status to COMPLETED.
 */
export async function liquidarRegistros(
	ids: number[],
	_userId: number,
	fileId: number
): Promise<{ liquidated: number; fileCompleted: boolean }> {
	return prisma.$transaction(async (tx) => {
		const result = await tx.settlementCommission.updateMany({
			where: {
				idSettlementCommission: { in: ids },
				status: 'SYNCHRONIZED',
			},
			data: { status: 'SETTLED', updatedAt: new Date() },
		})

		const remaining = await tx.settlementCommission.count({
			where: {
				idFileImport: fileId,
				status: 'SYNCHRONIZED',
			},
		})

		if (remaining === 0) {
			await tx.fileImport.update({
				where: { idFileImport: fileId },
				data: { status: 'COMPLETED', updatedAt: new Date() },
			})
		}

		return {
			liquidated: result.count,
			fileCompleted: remaining === 0,
		}
	})
}

/**
 * Transitions selected SYNCHRONIZED records to LAG with lagDate and isLag set.
 * Does not update FileImport.status.
 */
export async function rezagarRegistros(
	ids: number[],
	_userId: number
): Promise<{ lagged: number }> {
	const result = await prisma.settlementCommission.updateMany({
		where: {
			idSettlementCommission: { in: ids },
			status: 'SYNCHRONIZED',
		},
		data: {
			status: 'LAG',
			isLag: true,
			lagDate: new Date(),
			updatedAt: new Date(),
		},
	})
	return { lagged: result.count }
}

/**
 * Aplica las fórmulas de cálculo de comisiones
 * Fórmula: liquidacion_bruta_POSITION = comision * %comisiones.POSITION
 * Fórmula: liquidacion_con_descuento = liquidacion_bruta - (liquidacion_bruta * (%descuento + %clawback))
 * @param descuento - Porcentaje de descuento. Si no se proporciona, se usa DESCUENTO_POR_DEFECTO como fallback
 * @param clawback - Porcentaje de clawback aplicado cuando corresponde
 */
export function aplicarFormulas(
	comisionBase: Decimal,
	porcentajes: ConfiguracionPorcentajes,
	descuento?: Decimal,
	clawback?: Decimal | null
): ComisionesCalculadas {
	const descuentoAplicar = descuento || DESCUENTO_POR_DEFECTO
	const clawbackAplicar = clawback ?? new Decimal(0)
	const totalDescuentoFactor = descuentoAplicar.add(clawbackAplicar)
	// Calcular comisiones brutas
	const generalBruta = porcentajes.general
		? comisionBase.mul(new Decimal(porcentajes.general))
		: new Decimal(0)

	const comisionBrutaAgencia = porcentajes.agencia
		? comisionBase.mul(new Decimal(porcentajes.agencia))
		: new Decimal(0)

	const comisionBrutaLider = porcentajes.lider
		? comisionBase.mul(new Decimal(porcentajes.lider))
		: new Decimal(0)

	const comisionBrutaCoach = porcentajes.coach
		? comisionBase.mul(new Decimal(porcentajes.coach))
		: new Decimal(0)

	// Aplicar descuento + clawback
	const generalDescuento = generalBruta.sub(
		generalBruta.mul(totalDescuentoFactor)
	)
	const comisionAgenciaDescuento = comisionBrutaAgencia.sub(
		comisionBrutaAgencia.mul(totalDescuentoFactor)
	)
	const comisionLiderDescuento = comisionBrutaLider.sub(
		comisionBrutaLider.mul(totalDescuentoFactor)
	)
	const comisionCoachDescuento = comisionBrutaCoach.sub(
		comisionBrutaCoach.mul(totalDescuentoFactor)
	)

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

/**
 * Calcula las comisiones para un registro de liquidación
 */
export async function calcularComisionesParaRegistro(
	idSettlementCommission: number
): Promise<ComisionesCalculadas | null> {
	// Obtener el registro de liquidación con su negocio
	const settlement = await prisma.settlementCommission.findUnique({
		where: { idSettlementCommission },
		include: {
			business: {
				include: {
					productPercentageCommission: true,
				},
			},
		},
	})

	if (!settlement || !settlement.business) {
		return null
	}

	// Obtener configuración de porcentajes
	const porcentajes = await obtenerConfiguracionPorcentajes(
		settlement.business.idProductPercentageCommission,
		settlement.originCommission === 'CARTERA'
	)

	const descuento = settlement.discountPercentage ?? DESCUENTO_POR_DEFECTO
	const clawback = settlement.clawbackPercentage ?? new Decimal(0)

	// Aplicar fórmulas
	const comisionBase =
		settlement.baseCommission || settlement.commissionValue || new Decimal(0)
	const comisionesCalculadas = aplicarFormulas(
		comisionBase,
		porcentajes,
		descuento,
		clawback
	)

	return comisionesCalculadas
}

/**
 * Obtiene el resumen de pre-liquidación agrupado por usuario para envío de correos.
 * Una fila por negocio por usuario (valor = suma de valueComissionFinal por negocio).
 */
export async function obtenerResumenPreliquidacionPorUsuario(
	fileImportId: number,
	rangoFecha: { inicio: Date; fin: Date },
	archivoNombre: string
): Promise<ResumenUsuarioPreliquidacion[]> {
	const settlements = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileImportId,
			status: 'PRE-SETTLED',
			createdAt: {
				gte: rangoFecha.inicio,
				lte: rangoFecha.fin,
			},
		},
		select: { idSettlementCommission: true },
	})
	const ids = settlements.map((s) => s.idSettlementCommission)
	if (ids.length === 0) return []

	const distribuciones = await prisma.comissionDistribution.findMany({
		where: { idSettlementCommission: { in: ids } },
		include: {
			settlementCommission: {
				include: {
					business: {
						include: {
							user: {
								select: {
									idUser: true,
									email: true,
									name: true,
									lastName: true,
								},
							},
						},
					},
				},
			},
			productPercentageCommissionCategory: {
				include: { category: { select: { name: true } } },
			},
		},
	})

	const periodo = `${rangoFecha.inicio.toISOString().split('T')[0]} - ${rangoFecha.fin.toISOString().split('T')[0]}`
	const byUser = new Map<
		number,
		{
			email: string
			nombreUsuario: string
			byBusiness: Map<
				number,
				{ nombreNegocio: string; valor: number; categorias: string[] }
			>
		}
	>()

	for (const d of distribuciones) {
		const business = d.settlementCommission.business
		if (!business?.user) continue
		const u = business.user
		const idBusiness = business.idBusiness
		const nombreNegocio = business.contract
			? `Contrato ${business.contract}`
			: `Negocio #${idBusiness}`
		const valor = d.valueComissionFinal.toNumber()
		const categoria =
			d.productPercentageCommissionCategory?.category?.name ?? ''

		if (!byUser.has(u.idUser)) {
			byUser.set(u.idUser, {
				email: u.email,
				nombreUsuario: `${u.name} ${u.lastName ?? ''}`.trim(),
				byBusiness: new Map(),
			})
		}
		const userEntry = byUser.get(u.idUser)!
		if (!userEntry.byBusiness.has(idBusiness)) {
			userEntry.byBusiness.set(idBusiness, {
				nombreNegocio,
				valor: 0,
				categorias: [],
			})
		}
		const biz = userEntry.byBusiness.get(idBusiness)!
		biz.valor += valor
		if (categoria && !biz.categorias.includes(categoria))
			biz.categorias.push(categoria)
	}

	const result: ResumenUsuarioPreliquidacion[] = []
	for (const [idUser, entry] of byUser) {
		const filas: ResumenFilaPreliquidacion[] = []
		for (const [idBusiness, biz] of entry.byBusiness) {
			filas.push({
				idBusiness,
				nombreNegocio: biz.nombreNegocio,
				valorComision: Math.round(biz.valor * 100) / 100,
				categoriaConcepto:
					biz.categorias.length > 0 ? biz.categorias.join(', ') : undefined,
			})
		}
		if (filas.length > 0) {
			result.push({
				idUser,
				email: entry.email,
				nombreUsuario: entry.nombreUsuario,
				archivoNombre,
				periodo,
				filas,
			})
		}
	}
	return result
}

/**
 * Procesa la pre-liquidación de un archivo completo
 */
export async function procesarPreLiquidacion(
	fileImportId: number,
	rangoFecha: { inicio: Date; fin: Date }
): Promise<{ success: boolean; registrosProcesados: number; mensaje: string }> {
	try {
		// Verificar que el archivo existe y está en estado LOAD
		const fileImport = await prisma.fileImport.findUnique({
			where: { idFileImport: fileImportId },
		})

		if (!fileImport) {
			return {
				success: false,
				registrosProcesados: 0,
				mensaje: 'Archivo no encontrado',
			}
		}

		if (fileImport.status !== 'LOAD') {
			return {
				success: false,
				registrosProcesados: 0,
				mensaje: `El archivo debe estar en estado LOAD para ser pre-liquidado (Estado actual: ${fileImport.status})`,
			}
		}

		// Obtener todos los registros SYNCHRONIZED del archivo en el rango de fechas
		const registros = await prisma.settlementCommission.findMany({
			where: {
				idFileImport: fileImportId,
				status: 'SYNCHRONIZED',
				createdAt: {
					gte: rangoFecha.inicio,
					lte: rangoFecha.fin,
				},
			},
			include: {
				business: {
					include: {
						user: true,
						productPercentageCommission: true,
					},
				},
			},
		})

		if (registros.length === 0) {
			return {
				success: false,
				registrosProcesados: 0,
				mensaje:
					'No hay registros sincronizados para procesar en el rango de fechas seleccionado',
			}
		}

		let registrosProcesados = 0

		// Procesar cada registro dentro de una transacción sería ideal, pero por volumen
		// lo hacemos iterativo. Si falla uno, marcamos error o continuamos.
		// Para consistencia crítica, podríamos agrupar en chunks y usar prisma.$transaction.

		for (const registro of registros) {
			if (!registro.business) {
				console.warn(
					`Registro ${registro.idSettlementCommission} no tiene negocio asociado`
				)
				continue
			}

			const flow = deriveFlow({
				commissionType: registro.commissionType,
				originCommission: registro.originCommission,
				isClawback: registro.isClawback,
			})

			if (flow !== 'VOLUNTARIA' && !registro.business.user) {
				console.warn(
					`Registro ${registro.idSettlementCommission} requiere business.user para flujo ${flow}; omitiendo`
				)
				continue
			}

			const descuentoPorcentaje =
				registro.discountPercentage ?? DESCUENTO_POR_DEFECTO
			const clawbackPorcentaje = registro.clawbackPercentage ?? new Decimal(0)
			const usePortfolio = registro.originCommission === 'CARTERA'

			// 1. Obtener configuración de porcentajes del producto asociado al negocio
			const configCategorias =
				await prisma.productPercentageCommissionCategory.findMany({
					where: {
						idProductPercentageCommission:
							registro.business.idProductPercentageCommission,
						active: true,
					},
				})

			if (configCategorias.length === 0) {
				console.warn(
					`Negocio del registro ${registro.idSettlementCommission} no tiene configuración de porcentajes activa`
				)
				// Podríamos marcarlo con error o saltarlo. Por ahora saltamos.
				continue
			}

			const comisionBase =
				registro.baseCommission || registro.commissionValue || new Decimal(0)
			const idUser = registro.business.user?.idUser

			if (idUser === undefined) {
				console.warn(
					`Registro ${registro.idSettlementCommission} sin id de usuario asesor; omitiendo liquidación`
				)
				continue
			}

			// Usamos transacción para asegurar que se crean las distribuciones y se actualiza el estado atómicamente
			await prisma.$transaction(async (tx) => {
				let totalValorClawback = new Decimal(0)

				// 2. Calcular y guardar distribución para cada categoría configurada
				for (const config of configCategorias) {
					const porcentaje =
						usePortfolio && config.porcentajePortfolio !== null
							? config.porcentajePortfolio
							: config.porcentajeDistribucion

					// Cálculo: Bruta = ComisionBase * %Categoria
					const valorComisionBruta = comisionBase.mul(porcentaje)

					// Cálculo: Descuento = Bruta * %Descuento
					const valorDescuento = valorComisionBruta.mul(descuentoPorcentaje)
					const valorClawback = valorComisionBruta.mul(clawbackPorcentaje)
					const totalDescuento = valorDescuento.add(valorClawback)

					// Cálculo: Final = Bruta - Descuento - Clawback
					const valorComisionFinal = valorComisionBruta.sub(totalDescuento)

					const created = await tx.comissionDistribution.create({
						data: {
							idSettlementCommission: registro.idSettlementCommission,
							idPercentajeCommisionCategory: config.id,
							idBeneficiaryUser: idUser,
							valueComission: valorComisionBruta,
							valueComissionFinal: valorComisionFinal,
							totalDiscount: totalDescuento,
							appliedDiscountPercentage: descuentoPorcentaje,
							status: 'LIQUIDADO',
						},
					})

					// Clawback row when flow is Poliza (CARTERA or NO_CLAW) and valorClawback > 0 (not POLIZA_CLAW — that is Phase 4)
					if (
						flow !== 'VOLUNTARIA' &&
						flow !== 'POLIZA_CLAW' &&
						valorClawback.gt(0) &&
						idUser !== undefined
					) {
						await tx.clawback.create({
							data: {
								idComissionDistribution: created.idComissionDistribution,
								idUser,
								valueClawback: valorClawback,
								porcentajeApplied: clawbackPorcentaje,
								state: 'RETENIDO',
							},
						})
						totalValorClawback = totalValorClawback.add(valorClawback)
					}
				}

				// ClawbackBalance is no longer updated during pre-liquidación.
				// It will be updated by the liquidación process.

				// 3. Actualizar registro a PRE-SETTLED
				await tx.settlementCommission.update({
					where: { idSettlementCommission: registro.idSettlementCommission },
					data: {
						status: 'PRE-SETTLED',
					},
				})
			})

			registrosProcesados++
		}

		// 4. Actualizar estado del archivo a PRE-SETTLED (siempre que el proceso haya corrido)
		await prisma.fileImport.update({
			where: { idFileImport: fileImportId },
			data: {
				status: 'PRE-SETTLED',
				preLiquidacionDate: new Date(),
				updatedAt: new Date(),
			},
		})

		// Envío de correos con resumen por usuario (fire-and-forget: no bloquea la respuesta)
		if (registrosProcesados > 0) {
			obtenerResumenPreliquidacionPorUsuario(
				fileImportId,
				rangoFecha,
				fileImport.nameFile
			)
				.then((resumenes) => {
					for (const r of resumenes) {
						sendResumenPreliquidacionEmail({
							to: r.email,
							nombreUsuario: r.nombreUsuario,
							archivoNombre: r.archivoNombre,
							periodo: r.periodo,
							filas: r.filas.map((f) => ({
								nombreNegocio: f.nombreNegocio,
								valorComision: f.valorComision,
								categoriaConcepto: f.categoriaConcepto,
							})),
						}).catch((err) => {
							console.error(
								`Error enviando resumen pre-liquidación a ${r.email}:`,
								err
							)
						})
					}
				})
				.catch((err) => {
					console.error(
						'Error obteniendo resumen pre-liquidación para correos:',
						err
					)
				})
		}

		return {
			success: true,
			registrosProcesados,
			mensaje: `Se procesaron exitosamente ${registrosProcesados} registros`,
		}
	} catch (error) {
		console.error('Error al procesar pre-liquidación:', error)
		return {
			success: false,
			registrosProcesados: 0,
			mensaje: `Error al procesar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
		}
	}
}
