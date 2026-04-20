import type { Business, SettlementCommission } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { enviarNotificacionesPorArchivo } from './notificar-preliquidacion.service'
import { Decimal } from '@prisma/client/runtime/library'
import { Prisma } from '@prisma/client'
import { computeLineDistributionAmounts } from '@/features/pre-liquidacion/lib/compute-line-distribution'

export interface ConfigCategoryItem {
	id: number
	porcentajePortfolio: Decimal | null
	porcentajeDistribucion: Decimal
	category: CategoryForBeneficiaryResolve
}
import type {
	AgenteDistribucion,
	ArchivoDisponible,
	ComisionesCalculadas,
	ConfiguracionPorcentajes,
	DistribucionComision,
	RegistroDetallePreLiquidacion,
	RegistroLiquidacionDetalle,
	RespuestaArchivosDisponibles,
	RespuestaDetallePreLiquidacion,
	RespuestaDistribucionComision,
	RespuestaRegistrosLiquidacion,
	ResumenFilaPreliquidacion,
	ResumenUsuarioPreliquidacion,
} from '../types/types'
import { deriveFlow, shouldPersistClawback } from '../lib/pre-liquidacion-flow'
import {
	buildUplineChain,
	resolveBeneficiaryUserId,
	ppcConfigsNeedUplineAgent,
	type CategoryForBeneficiaryResolve,
} from '../lib/resolve-beneficiary'

/**
 * Obtiene los archivos disponibles para pre-liquidar y los ya pre-liquidados.
 * Enforces Screaming Architecture isolating the database calls from the API router.
 */
export async function obtenerArchivosDisponiblesPreliquidacion(): Promise<RespuestaArchivosDisponibles> {
	const todosArchivos = await prisma.fileImport.findMany({
		where: {
			status: { in: ['LOAD', 'PRE-SETTLED', 'PRE-SETTLE-APROVED', 'SETTLED', 'COMPLETED'] },
			settlementCommissions: {
				some: {
					status: {
						in: ['SYNCHRONIZED', 'PRE-SETTLED', 'PRE-SETTLE-APROVED', 'SETTLED'],
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
				status: {
					in: [
						'SYNCHRONIZED',
						'PRE-SETTLED',
						'PRE-SETTLE-APROVED',
						'SETTLED',
						'LAG',
					],
				},
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
			} else if (
				row.status === 'PRE-SETTLED' ||
				row.status === 'PRE-SETTLE-APROVED' ||
				row.status === 'SETTLED' ||
				row.status === 'LAG'
			) {
				countsMap[row.idFileImport].registrosPreliquidados += count
			}
		}
	}

	// Cuenta beneficiarios únicos y aprobaciones por archivo (para UI backoffice)
	const approvalsByFile: Record<number, number> = {}
	const beneficiariesByFile: Record<number, number> = {}
	if (fileIds.length > 0) {
		const [approvals, beneficiaries] = await Promise.all([
			prisma.distributionApproval.groupBy({
				by: ['idFileImport'],
				where: { idFileImport: { in: fileIds } },
				_count: { idUser: true },
			}),
			prisma.comissionDistribution.findMany({
				where: {
					settlementCommission: {
						idFileImport: { in: fileIds },
					},
				},
				select: {
					idBeneficiaryUser: true,
					settlementCommission: { select: { idFileImport: true } },
				},
			}),
		])
		for (const a of approvals) {
			approvalsByFile[a.idFileImport] = a._count.idUser
		}
		const benefSet: Record<number, Set<number>> = {}
		for (const d of beneficiaries) {
			const fid = d.settlementCommission.idFileImport
			if (!benefSet[fid]) benefSet[fid] = new Set<number>()
			benefSet[fid].add(d.idBeneficiaryUser)
		}
		for (const fid of Object.keys(benefSet)) {
			beneficiariesByFile[Number(fid)] = benefSet[Number(fid)].size
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
			totalBeneficiarios: beneficiariesByFile[archivo.idFileImport] ?? 0,
			aprobaciones: approvalsByFile[archivo.idFileImport] ?? 0,
		}
	})

	const disponiblesParaPreliquidar = archivos.filter(
		(a) =>
			a.estado === 'LOAD' &&
			(a.sincronizados ?? 0) > (a.registrosPreliquidados ?? 0)
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
		const comisionBase = r.commissionValue || new Decimal(0)
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
			status: true,
			user: {
				select: { name: true, lastName: true },
			},
		},
	})

	if (!fileImport) return null

	const registros = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileId,
			status: { in: ['SYNCHRONIZED', 'PRE-SETTLED', 'SETTLED', 'LAG'] },
		},
		include: {
			business: {
				select: {
					contract: true,
					client: {
						select: { name: true, lastName: true },
					},
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

		const clientNameRow = r.business?.client
			? `${r.business.client.name} ${r.business.client.lastName ?? ''}`.trim()
			: null

		return {
			idSettlementCommission: r.idSettlementCommission,
			idBusiness: r.idBusiness,
			contrato: r.contract ?? r.business?.contract ?? null,
			nombreAsesor,
			nombreCliente: clientNameRow,
			status: r.status,
			tipo: r.descripcion,
			monto: (r.commissionValue ?? r.baseCommission ?? new Decimal(0)).toNumber(),
			baseComision: (
				r.baseCommission ??
				r.commissionValue ??
				new Decimal(0)
			).toNumber(),
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
			sincronizados: fileImport.sincronizadoRecord,
			rezagados: fileImport.rezagadoRecord,
			estado: fileImport.status,
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
			status: true,
			user: {
				select: { name: true, lastName: true },
			},
		},
	})

	if (!fileImport) return null

	const registros = await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileId,
			status: { in: ['SYNCHRONIZED', 'PRE-SETTLED', 'SETTLED', 'LAG'] },
		},
		include: {
			business: {
				select: {
					contract: true,
					client: {
						select: { name: true, lastName: true },
					},
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
		
		const clientNameRow = r.business?.client
			? `${r.business.client.name} ${r.business.client.lastName ?? ''}`.trim()
			: null

		return {
			idSettlementCommission: r.idSettlementCommission,
			idBusiness: r.idBusiness,
			contrato: r.contract ?? r.business?.contract ?? null,
			nombreAsesor,
			nombreCliente: clientNameRow,
			tipo: r.descripcion,
			monto: (
				r.commissionValue ??
				r.baseCommission ??
				new Decimal(0)
			).toNumber(),
			baseComision: (
				r.baseCommission ??
				r.commissionValue ??
				new Decimal(0)
			).toNumber(),
			porcentajeDescuento: (r.discountPercentage ?? new Decimal(0)).toNumber(),
			porcentajeClawback: (r.clawbackPercentage ?? new Decimal(0)).toNumber(),
			esClawback: r.isClawback ?? false,
			esRezagado: r.isLag ?? false,
			status: r.status,
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
			rezagados: fileImport.rezagadoRecord ?? 0,
			estado: fileImport.status,
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
	const rows = (await (prisma.comissionDistribution).findMany({
		where: { idSettlementCommission: id },
		include: {
			beneficiaryUser: {
				select: { name: true, lastName: true },
			},
			productPercentageCommissionCategory: {
				include: {
					category: true,
					productPercentageCommission: {
						include: {
							productConfiguration: {
								include: {
									product: true,
									clientOrigin: true,
									category: true,
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
	}))

	if (rows.length === 0) return null

	const first = rows[0]
	const sc = first.settlementCommission as SettlementCommission & {
		business?: {
			user?: {
				name: string
				lastName: string | null
			} | null
		} | null
		commissionValue?: Decimal | null
		baseCommission?: Decimal | null
	}
	const usePortfolio = sc.originCommission === 'CARTERA'

	const distribuciones = rows.map((row) => {
		const ppcc = row.productPercentageCommissionCategory
		const categoriaNombre = ppcc?.category?.name ?? ''
		const porcentajeDistribucion =
			usePortfolio && ppcc?.porcentajePortfolio != null
				? ppcc.porcentajePortfolio.toNumber()
				: (ppcc?.porcentajeDistribucion?.toNumber() ?? 0)

		const ben = row.beneficiaryUser
		const beneficiarioNombre = ben
			? `${ben.name} ${ben.lastName ?? ''}`.trim()
			: ''

		const valueCommissionWithDiscountResolved =
			row.valueCommissionWithDiscount != null
				? row.valueCommissionWithDiscount.toNumber()
				: (row.valueComissionFinal?.toNumber() ?? 0) +
					(row.clawback?.valueClawback.toNumber() ?? 0)

		return {
			idComissionDistribution: row.idComissionDistribution,
			idBeneficiaryUser: row.idBeneficiaryUser,
			categoria: categoriaNombre,
			beneficiarioNombre,
			value_commision: row.valueComission?.toNumber() ?? 0,
			applied_discount_percentace:
				row.appliedDiscountPercentage?.toNumber() ?? 0,
			discount_total: row.totalDiscount?.toNumber() ?? 0,
			value_commission_with_discount: valueCommissionWithDiscountResolved,
			commission_porcentaje: porcentajeDistribucion,
			percentaje_applied: row.clawback?.porcentajeApplied.toNumber() ?? null,
			value_clawback: row.clawback?.valueClawback.toNumber() ?? null,
			comisionNeta: row.valueComissionFinal?.toNumber() ?? 0,
		}
	})

	const ppccFirst = first.productPercentageCommissionCategory
	const productConfig =
		ppccFirst?.productPercentageCommission?.productConfiguration

	const commissionValueParent =
		sc.commissionValue?.toNumber() ?? sc.baseCommission?.toNumber() ?? 0

	const distribucion: DistribucionComision = {
		idSettlementCommission: id,
		commission_value: commissionValueParent,
		categoria: productConfig?.category?.name ?? null,
		producto: productConfig?.product?.name ?? null,
		origen: productConfig?.clientOrigin?.name ?? null,
		nombreAsesor: sc.business?.user
			? `${sc.business.user.name} ${sc.business.user.lastName ?? ''}`.trim()
			: null,
		distribuciones,
	}

	return { distribucion }
}

// ---------------------------------------------------------------------------
// Internal transaction helpers
// ---------------------------------------------------------------------------

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/**
 * Applies clawbacks within a settlement transaction for POLIZA commissions.
 * For each commission distribution that has a linked Clawback row:
 *   - Sets applied_date=now() and state=APPLIED
 *   - Appends "retención del clawback de la póliza" to reason
 *   - Upserts ClawbackBalance per user, incrementing totalAmount
 */
async function applyClawbacksForSettlement(
	tx: PrismaTx,
	commissions: Array<{
		idSettlementCommission: number
		commissionType: string
		originCommission: string | null
		isClawback: boolean
	}>
): Promise<void> {
	const now = new Date()

	// Filter to POLIZA flows only
	const polizaCommissionIds = commissions
		.filter((c) => shouldPersistClawback(deriveFlow(c)))
		.map((c) => c.idSettlementCommission)

	if (polizaCommissionIds.length === 0) return

	// Fetch all distributions with their clawback rows for these commissions
	const distributions = await tx.comissionDistribution.findMany({
		where: {
			idSettlementCommission: { in: polizaCommissionIds },
			clawback: { isNot: null },
		},
		include: {
			clawback: true,
		},
	})

	if (distributions.length === 0) return

	// Group clawback values by userId for balance upsert
	const balanceByUser = new Map<number, number>()

	for (const dist of distributions) {
		const claw = dist.clawback
		if (!claw) continue

		const existingReason = claw.reason ?? ''
		const appendedReason = existingReason
			? `${existingReason}, retención del clawback de la póliza`
			: 'retención del clawback de la póliza'

		await tx.clawback.update({
			where: { idClawback: claw.idClawback },
			data: {
				appliedDate: now,
				state: 'APPLIED',
				reason: appendedReason,
				updatedAt: now,
			},
		})

		const userId = claw.idUser
		const clawValue = claw.valueClawback.toNumber()
		balanceByUser.set(userId, (balanceByUser.get(userId) ?? 0) + clawValue)
	}

	// Upsert ClawbackBalance per user
	for (const [userId, totalValue] of balanceByUser.entries()) {
		await tx.clawbackBalance.upsert({
			where: { idUser: userId },
			create: { idUser: userId, totalAmount: totalValue },
			update: { totalAmount: { increment: totalValue } },
		})
	}
}

/**
 * Transitions businesses from EMITIDO to COMISIONANDO within a settlement transaction.
 * Only affects businesses currently in EMITIDO status (idempotent for others).
 */
async function updateBusinessStatusOnSettle(
	tx: PrismaTx,
	businessIds: number[]
): Promise<void> {
	if (businessIds.length === 0) return

	await tx.business.updateMany({
		where: {
			idBusiness: { in: businessIds },
			status: 'EMITIDO',
		},
		data: {
			status: 'COMISIONANDO',
			updatedAt: new Date(),
		},
	})
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/**
 * Checks if a file import has any remaining SYNCHRONIZED or PRE-SETTLED commissions.
 * If none remain, transitions the file status to COMPLETED.
 */
async function checkAndSetFileImportStatus(
	tx: Prisma.TransactionClient,
	fileId: number,
	now: Date
): Promise<boolean> {
	const remainingSynchronized = await tx.settlementCommission.count({
		where: {
			idFileImport: fileId,
			status: 'SYNCHRONIZED',
		},
	})
	const remainingPreSettled = await tx.settlementCommission.count({
		where: {
			idFileImport: fileId,
			status: 'PRE-SETTLED',
		},
	})

	const fileCompleted =
		remainingSynchronized === 0 && remainingPreSettled === 0

	if (fileCompleted) {
		await tx.fileImport.update({
			where: { idFileImport: fileId },
			data: { status: 'SETTLED', updatedAt: now },
		})
	}

	return fileCompleted
}

/**
 * Transitions selected PRE-SETTLED records to SETTLED.
 * Within a single transaction:
 *   - Updates settlement_commission: status=SETTLED, settledDate=now()
 *   - Updates all linked comission_distribution rows: status=SETTLED
 *   - Applies clawbacks for POLIZA commissions (appliedDate, state=APPLIED, reason append, balance upsert)
 *   - Transitions linked businesses from EMITIDO to COMISIONANDO
 *   - Sets FileImport.status=COMPLETED only when no SYNCHRONIZED and no PRE-SETTLED remain for the file
 */
export async function liquidarRegistros(
	ids: number[],
	_userId: number,
	fileId: number
): Promise<{ liquidated: number; fileCompleted: boolean }> {
	return prisma.$transaction(async (tx) => {
		const now = new Date()

		// 1. Fetch commissions with all related data
		const commissions = await tx.settlementCommission.findMany({
			where: {
				idSettlementCommission: { in: ids },
				status: 'PRE-SETTLED',
			},
			select: {
				idSettlementCommission: true,
				idBusiness: true,
				commissionType: true,
				originCommission: true,
				isClawback: true,
			},
		})

		const settledIds = commissions.map((c) => c.idSettlementCommission)

		if (settledIds.length === 0) {
			return { liquidated: 0, fileCompleted: false }
		}

		// 2. Update settlement_commission: status=SETTLED, settledDate=now()
		const result = await tx.settlementCommission.updateMany({
			where: { idSettlementCommission: { in: settledIds } },
			data: { status: 'SETTLED', settledDate: now, updatedAt: now },
		})

		// 3. Update all linked comission_distribution rows: status=SETTLED
		await tx.comissionDistribution.updateMany({
			where: { idSettlementCommission: { in: settledIds } },
			data: { status: 'SETTLED', updatedAt: now },
		})

		// 4. Apply clawbacks for POLIZA commissions
		await applyClawbacksForSettlement(tx, commissions)

		// 5. Transition linked businesses from EMITIDO to COMISIONANDO
		const businessIds = [
			...new Set(
				commissions
					.map((c) => c.idBusiness)
					.filter((id): id is number => id !== null)
			),
		]
		await updateBusinessStatusOnSettle(tx, businessIds)

		// 6. COMPLETED only when no sync backlog and no pre-liquidation queue left for this import
		const fileCompleted = await checkAndSetFileImportStatus(tx, fileId, now)

		return {
			liquidated: result.count,
			fileCompleted,
		}
	}).then(async (out) => {
		// Fire-and-forget: enviar comprobante final de liquidación a beneficiarios.
		if (out.liquidated > 0) {
			enviarNotificacionesPorArchivo({
				fileImportId: fileId,
				kind: 'LIQUIDACION',
			}).catch((err) => {
				console.error(
					'Error enviando comprobante final de liquidación:',
					err
				)
			})
		}
		return out
	})
}

/**
 * Transitions selected PRE-SETTLED records to LAG with lagDate, isLag,
 * isLagByUser and isLagByUserDate set (user-initiated lag tracking).
 * Also transitions FileImport.status to COMPLETED if no records remain.
 */
export async function rezagarRegistros(
	ids: number[],
	_userId: number,
	fileId: number
): Promise<{ lagged: number; fileCompleted: boolean }> {
	return prisma.$transaction(async (tx) => {
		const now = new Date()
		const result = await tx.settlementCommission.updateMany({
			where: {
				idSettlementCommission: { in: ids },
				status: 'PRE-SETTLED',
			},
			data: {
				status: 'LAG',
				isLag: true,
				lagDate: now,
				isLagByUser: true,
				isLagByUserDate: now,
				updatedAt: now,
			},
		})

		const fileCompleted = await checkAndSetFileImportStatus(tx, fileId, now)

		return {
			lagged: result.count,
			fileCompleted,
		}
	})
}

/**
 * Aplica las fórmulas de cálculo de comisiones
 * Fórmula: liquidacion_bruta_POSITION = comision * %comisiones.POSITION
 * Por bucket: impuesto sobre bruta, luego clawback sobre el monto post-impuesto (igual que distribución persistida).
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

	const netAfterSequential = (bruta: Decimal) =>
		computeLineDistributionAmounts(bruta, descuentoAplicar, clawbackAplicar)
			.finalAmount

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

	const generalDescuento = porcentajes.general
		? netAfterSequential(generalBruta)
		: new Decimal(0)
	const comisionAgenciaDescuento = porcentajes.agencia
		? netAfterSequential(comisionBrutaAgencia)
		: new Decimal(0)
	const comisionLiderDescuento = porcentajes.lider
		? netAfterSequential(comisionBrutaLider)
		: new Decimal(0)
	const comisionCoachDescuento = porcentajes.coach
		? netAfterSequential(comisionBrutaCoach)
		: new Decimal(0)

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
	const comisionBase = settlement.commissionValue || new Decimal(0)
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
	const settlements = (await prisma.settlementCommission.findMany({
		where: {
			idFileImport: fileImportId,
			status: 'PRE-SETTLED',
			createdAt: {
				gte: rangoFecha.inicio,
				lte: rangoFecha.fin,
			},
		},
		select: { idSettlementCommission: true },
	})) || []
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
 * Calcula y guarda la distribución de comisiones para un registro
 */
export async function calcularYGuardarDistribucion(
	tx: Prisma.TransactionClient,
	idSettlementCommission: number,
	configCategorias: ConfigCategoryItem[],
	beneficiaryByConfigId: Map<number, number>,
	comisionBase: Decimal,
	descuentoPorcentaje: Decimal,
	clawbackPorcentaje: Decimal,
	usePortfolio: boolean,
	flow: string,
	idUser: number | undefined
) {
	let totalValorClawback = new Decimal(0)

	for (const config of configCategorias) {
		const porcentaje =
			usePortfolio && config.porcentajePortfolio !== null
				? config.porcentajePortfolio
				: config.porcentajeDistribucion

		// Cálculo: Bruta = ComisionBase * %Categoria; impuesto sobre bruta; clawback sobre post-impuesto
		const valorComisionBruta = comisionBase.mul(porcentaje)
		const amounts = computeLineDistributionAmounts(
			valorComisionBruta,
			descuentoPorcentaje,
			clawbackPorcentaje
		)
		const valorDescuento = amounts.taxAmount
		const valorClawback = amounts.clawbackAmount
		const valorComisionFinal = amounts.finalAmount

		const idBeneficiaryUser = beneficiaryByConfigId.get(config.id)
		if (idBeneficiaryUser === undefined) {
			throw new Error(`No se pudo resolver el beneficiario para la categoría ${config.category.code}`)
		}

		const created = await tx.comissionDistribution.create({
			data: {
				idSettlementCommission,
				idPercentajeCommisionCategory: config.id,
				idBeneficiaryUser,
				valueComission: valorComisionBruta,
				valueCommissionWithDiscount: amounts.valueCommissionWithDiscount,
				valueComissionFinal: valorComisionFinal,
				totalDiscount: valorDescuento,
				appliedDiscountPercentage: descuentoPorcentaje,
				status: 'LIQUIDADO',
			},
		})

		// Clawback row when flow is Poliza (CARTERA or NO_CLAW) and valorClawback > 0 (not POLIZA_CLAW)
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

	return totalValorClawback
}

/**
 * Sincroniza y calcula las comisiones para un registro de liquidación rezagado
 */
export async function sincronizarYCalcularRegistroRezagado(
	idSettlementCommission: number,
	contractNumber: string
): Promise<{ success: boolean; mensaje: string }> {
	try {
		return await prisma.$transaction(async (tx) => {
			// 1. Buscar el negocio por número de contrato
			const business = await tx.business.findFirst({
				where: { contract: contractNumber },
				include: {
					user: true,
					productPercentageCommission: true,
				},
			})

			if (!business) {
				throw new Error(
					`No se encontró ningún negocio con el contrato ${contractNumber}`
				)
			}

			// 2. Buscar el registro de liquidación
			const settlement = await tx.settlementCommission.findUnique({
				where: { idSettlementCommission },
			})

			if (!settlement) {
				throw new Error('Registro de liquidación no encontrado')
			}

			if (settlement.status !== 'LAG') {
				throw new Error(
					`El registro debe estar en estado LAG (Estado actual: ${settlement.status})`
				)
			}

			// 3. Actualizar el registro para vincularlo al negocio y marcarlo como SYNCHRONIZED
			await tx.settlementCommission.update({
				where: { idSettlementCommission },
				data: {
					idBusiness: business.idBusiness,
					status: 'SYNCHRONIZED',
				},
			})

			// 4. Calcular Comisión
			const flow = deriveFlow({
				commissionType: settlement.commissionType,
				originCommission: settlement.originCommission,
				isClawback: settlement.isClawback,
			})

			if (flow !== 'VOLUNTARIA' && !business.user) {
				throw new Error(
					`Se requiere un usuario asesor para el flujo ${flow}`
				)
			}

			const descuentoPorcentaje =
				settlement.discountPercentage ?? DESCUENTO_POR_DEFECTO
			const clawbackPorcentaje =
				settlement.clawbackPercentage ?? new Decimal(0)
			const usePortfolio = settlement.originCommission === 'CARTERA'

			// Obtener porcentajes
			const configCategorias: ConfigCategoryItem[] =
				(await tx.productPercentageCommissionCategory.findMany({
					where: {
						idProductPercentageCommission:
							business.idProductPercentageCommission,
						active: true,
					},
					include: {
						category: {
							include: {
								fixedBeneficiaryUser: {
									select: {
										idUser: true,
										active: true,
									},
								},
							},
						},
					},
				})) as unknown as ConfigCategoryItem[]

			if (configCategorias.length === 0) {
				throw new Error(
					'El negocio no tiene configuración de porcentajes activa'
				)
			}

			const comisionBase =
				settlement.baseCommission ||
				settlement.commissionValue ||
				new Decimal(0)
			const idUser = business.user?.idUser

			const chain =
				business.user != null && ppcConfigsNeedUplineAgent(configCategorias)
					? await buildUplineChain(tx, business.user.idUser)
					: []

			const beneficiaryByConfigId = new Map<number, number>()
			for (const cfg of configCategorias) {
				const res = resolveBeneficiaryUserId(cfg.category, chain)
				if (!res.ok) {
					throw new Error(
						`Error resolviendo beneficiario para ${cfg.category.code}: ${res.code}`
					)
				}
				beneficiaryByConfigId.set(cfg.id, res.idUser)
			}

			// 5. Calcular y Guardar Distribución
			await calcularYGuardarDistribucion(
				tx,
				idSettlementCommission,
				configCategorias,
				beneficiaryByConfigId,
				comisionBase,
				descuentoPorcentaje,
				clawbackPorcentaje,
				usePortfolio,
				flow,
				idUser
			)

			// 6. Actualizar estado a PRE-SETTLED
			await tx.settlementCommission.update({
				where: { idSettlementCommission },
				data: {
					status: 'PRE-SETTLED',
				},
			})

			return {
				success: true,
				mensaje: 'Registro sincronizado y pre-liquidado exitosamente',
			}
		})
	} catch (error) {
		console.error('Error en sincronizarYCalcularRegistroRezagado:', error)
		return {
			success: false,
			mensaje:
				error instanceof Error ? error.message : 'Error interno del servidor',
		}
	}
}

/**
 * Procesa la pre-liquidación de un archivo completo
 */
export async function procesarPreLiquidacion(
	fileImportId: number,
	rangoFecha: { inicio: Date; fin: Date }
): Promise<{
	success: boolean
	registrosProcesados: number
	registrosOmitidos?: number
	mensaje: string
	registrosConError: {
		idSettlementCommission: number
		categoryCode: string
		errorCode: string
		contrato: string | null
		idBusiness: number
		idUserAgent: number
	}[]
}> {
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
				registrosConError: [],
			}
		}

		if (fileImport.status !== 'LOAD') {
			return {
				success: false,
				registrosProcesados: 0,
				mensaje: `El archivo debe estar en estado LOAD para ser pre-liquidado (Estado actual: ${fileImport.status})`,
				registrosConError: [],
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
				registrosConError: [],
			}
		}

		let registrosProcesados = 0
		let registrosOmitidos = 0
		const registrosConError: {
			idSettlementCommission: number
			categoryCode: string
			errorCode: string
			contrato: string | null
			idBusiness: number
			idUserAgent: number
		}[] = []

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

			const configCategorias =
				(await prisma.productPercentageCommissionCategory.findMany({
					where: {
						idProductPercentageCommission:
							registro.business.idProductPercentageCommission,
						active: true,
					},
					include: {
						category: {
							include: {
								fixedBeneficiaryUser: {
									select: { idUser: true, active: true },
								},
							},
						},
					},
				}))

			if (configCategorias.length === 0) {
				console.warn(
					`Negocio del registro ${registro.idSettlementCommission} no tiene configuración de porcentajes activa`
				)
				continue
			}

			if (
				ppcConfigsNeedUplineAgent(configCategorias) &&
				!registro.business.user
			) {
				console.warn(
					`Registro ${registro.idSettlementCommission}: se requiere usuario del negocio para categorías UPLINE_CHAIN; omitiendo`
				)
				registrosOmitidos++
				continue
			}

			const chain =
				registro.business.user != null &&
					ppcConfigsNeedUplineAgent(configCategorias)
					? await buildUplineChain(prisma, registro.business.user.idUser)
					: []

			const resolutions = configCategorias.map((cfg) =>
				resolveBeneficiaryUserId(cfg.category, chain)
			)
			const failed = resolutions.find((r) => !r.ok)
			if (failed && !failed.ok) {
				console.warn(
					`Pre-liquidación omitida registro ${registro.idSettlementCommission}: categoría ${failed.categoryCode} — ${failed.code}`
				)
				registrosConError.push({
					idSettlementCommission: registro.idSettlementCommission,
					categoryCode: failed.categoryCode,
					errorCode: failed.code,
					contrato: registro.business.contract ?? registro.contract ?? null,
					idBusiness: registro.business.idBusiness,
					idUserAgent: registro.business.user?.idUser ?? 0,
				})
				registrosOmitidos++
				continue
			}

			const beneficiaryByConfigId = new Map<number, number>()
			configCategorias.forEach((cfg, i) => {
				const r = resolutions[i]
				if (r?.ok) {
					beneficiaryByConfigId.set(cfg.id, r.idUser)
				}
			})

			const comisionBase = registro.commissionValue || new Decimal(0)

			// Usamos transacción para asegurar que se crean las distribuciones y se actualiza el estado atómicamente
			await prisma.$transaction(async (tx) => {
				for (const config of configCategorias) {
					const idBeneficiaryUser = beneficiaryByConfigId.get(config.id)
					if (idBeneficiaryUser == null) {
						throw new Error(
							`Beneficiario no resuelto para PPC ${config.id} (registro ${registro.idSettlementCommission})`
						)
					}

					const porcentaje =
						usePortfolio && config.porcentajePortfolio !== null
							? config.porcentajePortfolio
							: config.porcentajeDistribucion

					const valorComisionBruta = comisionBase.mul(porcentaje)
					const amounts = computeLineDistributionAmounts(
						valorComisionBruta,
						descuentoPorcentaje,
						clawbackPorcentaje
					)
					const valorDescuento = amounts.taxAmount
					const valorClawback = amounts.clawbackAmount
					const valorComisionFinal = amounts.finalAmount

					const created = await tx.comissionDistribution.create({
						data: {
							idSettlementCommission: registro.idSettlementCommission,
							idPercentajeCommisionCategory: config.id,
							idBeneficiaryUser,
							valueComission: valorComisionBruta,
							valueCommissionWithDiscount: amounts.valueCommissionWithDiscount,
							valueComissionFinal: valorComisionFinal,
							totalDiscount: valorDescuento,
							appliedDiscountPercentage: descuentoPorcentaje,
							status: 'PRE-SETTLED',
						},
					})

					if (
						flow !== 'VOLUNTARIA' &&
						flow !== 'POLIZA_CLAW' &&
						valorClawback.gt(0)
					) {
						await tx.clawback.create({
							data: {
								idComissionDistribution: created.idComissionDistribution,
								idUser: idBeneficiaryUser,
								valueClawback: valorClawback,
								porcentajeApplied: clawbackPorcentaje,
								state: 'RETENIDO',
							},
						})
					}
				}

				await tx.settlementCommission.update({
					where: { idSettlementCommission: registro.idSettlementCommission },
					data: {
						status: 'PRE-SETTLED',
					},
				})
			})

			registrosProcesados++
		}

		// 4. Actualizar estado del archivo a PRE-SETTLED solo si no quedan registros SYNCHRONIZED
		const remainingSynchronized = await prisma.settlementCommission.count({
			where: { idFileImport: fileImportId, status: 'SYNCHRONIZED' },
		})

		if (remainingSynchronized === 0) {
			await prisma.fileImport.update({
				where: { idFileImport: fileImportId },
				data: {
					status: 'PRE-SETTLED',
					preLiquidacionDate: new Date(),
					updatedAt: new Date(),
				},
			})
		} else {
			await prisma.fileImport.update({
				where: { idFileImport: fileImportId },
				data: {
					preLiquidacionDate: new Date(),
					updatedAt: new Date(),
				},
			})
		}

		// Envío de correos con link al detalle (fire-and-forget: no bloquea la respuesta).
		// Antes enviábamos un resumen tabular en el correo; ahora enviamos un
		// link al recibo de distribución en la plataforma (ver
		// `notificar-preliquidacion.service.ts`).
		if (registrosProcesados > 0) {
			enviarNotificacionesPorArchivo({
				fileImportId,
				kind: 'PRE_LIQUIDACION',
			}).catch((err) => {
				console.error(
					'Error enviando notificaciones de pre-liquidación:',
					err
				)
			})
		}

		const omitSuffix =
			registrosOmitidos > 0
				? ` (${registrosOmitidos} registro(s) omitido(s) por beneficiario no resuelto)`
				: ''

		return {
			success: true,
			registrosProcesados,
			...(registrosOmitidos > 0 ? { registrosOmitidos } : {}),
			mensaje: `Se procesaron exitosamente ${registrosProcesados} registros${omitSuffix}`,
			registrosConError,
		}
	} catch (error) {
		console.error('Error al procesar pre-liquidación:', error)
		return {
			success: false,
			registrosProcesados: 0,
			mensaje: `Error al procesar: ${error instanceof Error ? error.message : 'Error desconocido'}`,
			registrosConError: [],
		}
	}
}

/**
 * Recalcula comisiones de un negocio en estado EMITIDO al cambiar su origen.
 * Asegura la retención de descuentos y clawbacks de las comisiones PRE-SETTLED.
 */
export async function recalcularComisionesPorCambioOrigen(
	idBusiness: number,
	idClientOrigin: number,
	usuarioAccion: { idUser: number; name: string }
): Promise<{
	success: boolean
	business?: Business
	countRecreados?: number
	message?: string
}> {
	return prisma.$transaction(async (tx) => {
		const business = await tx.business.findUnique({
			where: { idBusiness },
			include: {
				user: true,
				productPercentageCommission: {
					include: { productConfiguration: true },
				},
			},
		})
		if (!business) throw new Error('Negocio no encontrado')

		const productConfig = await tx.productConfiguration.findFirst({
			where: {
				idProduct:
					business.productPercentageCommission.productConfiguration.idProduct,
				idCategory:
					business.productPercentageCommission.productConfiguration.idCategory,
				idClientOrigin,
			},
			include: {
				productPercentageCommissions: {
					where: { active: true },
				},
			},
		})

		if (!productConfig) {
			throw new Error(
				'No existe configuración de producto para el nuevo origen'
			)
		}

		const activePercentageConfig = productConfig.productPercentageCommissions[0]
		if (!activePercentageConfig) {
			throw new Error(
				'No existe distribución de comisiones para el nuevo origen'
			)
		}

		const updatedBusiness = await tx.business.update({
			where: { idBusiness },
			data: {
				idClientOrigin,
				idProductPercentageCommission:
					activePercentageConfig.idProductPercentageCommission,
				updatedAt: new Date(),
			},
		})

		const preSettledCommissions = await tx.settlementCommission.findMany({
			where: {
				idBusiness,
				status: 'PRE-SETTLED',
			},
		})

		let countRecreados = 0

		if (preSettledCommissions.length > 0) {
			const newCategories =
				(await tx.productPercentageCommissionCategory.findMany({
					where: {
						idProductPercentageCommission:
							activePercentageConfig.idProductPercentageCommission,
						active: true,
					},
					include: {
						category: {
							include: {
								fixedBeneficiaryUser: {
									select: { idUser: true, active: true },
								},
							},
						},
					},
				}))

			if (newCategories.length === 0) {
				throw new Error(
					'La nueva configuración de origen no tiene reglas de distribución activas configuradas'
				)
			}

			if (ppcConfigsNeedUplineAgent(newCategories) && !business.user) {
				throw new Error(
					'El negocio no tiene usuario asesor; no se puede recalcular distribución con categorías UPLINE_CHAIN'
				)
			}

			const chain =
				business.user != null && ppcConfigsNeedUplineAgent(newCategories)
					? await buildUplineChain(tx, business.user.idUser)
					: []

			const ids = preSettledCommissions.map((c) => c.idSettlementCommission)

			await tx.clawback.deleteMany({
				where: {
					comissionDistribution: { idSettlementCommission: { in: ids } },
				},
			})

			await tx.comissionDistribution.deleteMany({
				where: { idSettlementCommission: { in: ids } },
			})

			for (const record of preSettledCommissions) {
				const flow = deriveFlow({
					commissionType: record.commissionType,
					originCommission: record.originCommission,
					isClawback: record.isClawback,
				})
				const usePortfolio = record.originCommission === 'CARTERA'
				const comisionBase = record.commissionValue || new Decimal(0)
				const descuentoPorcentaje = record.discountPercentage ?? new Decimal(0)
				const clawbackPorcentaje = record.clawbackPercentage ?? new Decimal(0)

				for (const cat of newCategories) {
					const resolved = resolveBeneficiaryUserId(cat.category, chain)
					if (!resolved.ok) {
						throw new Error(
							`No se pudo resolver beneficiario (categoría ${resolved.categoryCode}): ${resolved.code}`
						)
					}
					const idBeneficiaryUser = resolved.idUser

					const catAny = cat
					const porcentaje =
						usePortfolio && catAny.porcentajePortfolio !== null
							? catAny.porcentajePortfolio
							: catAny.porcentajeDistribucion

					const valorComisionBruta = comisionBase.mul(porcentaje)
					const amounts = computeLineDistributionAmounts(
						valorComisionBruta,
						descuentoPorcentaje,
						clawbackPorcentaje
					)
					const valorDescuento = amounts.taxAmount
					const valorClawback = amounts.clawbackAmount
					const valorComisionFinal = amounts.finalAmount

					if (valorComisionBruta.toNumber() > 0 || porcentaje.toNumber() > 0) {
						const dist = await tx.comissionDistribution.create({
							data: {
								idSettlementCommission: record.idSettlementCommission,
								idPercentajeCommisionCategory: cat.id,
								appliedDiscountPercentage: descuentoPorcentaje,
								totalDiscount: valorDescuento,
								valueComission: valorComisionBruta,
								valueCommissionWithDiscount: amounts.valueCommissionWithDiscount,
								valueComissionFinal: valorComisionFinal,
								status: 'PRE-SETTLED',
								idBeneficiaryUser,
							},
						})

						if (
							flow !== 'VOLUNTARIA' &&
							flow !== 'POLIZA_CLAW' &&
							valorClawback.toNumber() > 0
						) {
							await tx.clawback.create({
								data: {
									idComissionDistribution: dist.idComissionDistribution,
									valueClawback: valorClawback,
									porcentajeApplied: clawbackPorcentaje,
									idUser: idBeneficiaryUser,
									state: 'RETENIDO',
								},
							})
						}
					}
				}
				countRecreados++
			}
		}

		await tx.auditLog.create({
			data: {
				action: 'RECALCULATE_COMMISSIONS_ORIGIN',
				details: JSON.stringify({
					entityType: 'BUSINESS',
					entityId: business.idBusiness,
					previousOrigin: business.idClientOrigin,
					newOrigin: idClientOrigin,
					recalculatedCommissionsCount: countRecreados,
				}),
				idUser: usuarioAccion.idUser,
			},
		})

		return { success: true, business: updatedBusiness, countRecreados }
	})
}

/**
 * Liquida todos los registros PRE-SETTLED de un archivo importado.
 * Cambia el estado del archivo a SETTLED al finalizar.
 */
export async function liquidarArchivoCompleto(
	fileId: number,
	userId: number
): Promise<{ success: boolean; mensaje: string; liquidados: number }> {
	try {
		const preSettledRecords = await prisma.settlementCommission.findMany({
			where: {
				idFileImport: fileId,
				status: 'PRE-SETTLED',
			},
			select: { idSettlementCommission: true },
		})

		if (preSettledRecords.length === 0) {
			return {
				success: false,
				mensaje: 'No hay registros en estado Pre-liquidado para liquidar',
				liquidados: 0,
			}
		}

		const ids = preSettledRecords.map((r) => r.idSettlementCommission)
		const { liquidated } = await liquidarRegistros(ids, userId, fileId)

		// Una vez liquidados todos, forzamos el estado SETTLED del archivo
		// (aunque liquidarRegistros podría haberlo puesto en COMPLETED,
		//  queremos que pase por SETTLED para el paso de Notificación según el nuevo flujo)
		await prisma.fileImport.update({
			where: { idFileImport: fileId },
			data: { status: 'SETTLED', updatedAt: new Date() },
		})

		return {
			success: true,
			mensaje: `Se han liquidado exitosamente ${liquidated} registros`,
			liquidados: liquidated,
		}
	} catch (error) {
		console.error('Error en liquidarArchivoCompleto:', error)
		return {
			success: false,
			mensaje: error instanceof Error ? error.message : 'Error desconocido',
			liquidados: 0,
		}
	}
}

/**
 * Finaliza el flujo de liquidación de un archivo (Notificación).
 * Cambia el estado del archivo a COMPLETED.
 */
export async function notificarArchivoCompleto(
	fileId: number
): Promise<{ success: boolean; mensaje: string }> {
	try {
		await prisma.fileImport.update({
			where: { idFileImport: fileId },
			data: { status: 'COMPLETED', updatedAt: new Date() },
		})

		return {
			success: true,
			mensaje: 'Archivo marcado como Completado y Notificado',
		}
	} catch (error) {
		console.error('Error en notificarArchivoCompleto:', error)
		return {
			success: false,
			mensaje: error instanceof Error ? error.message : 'Error desconocido',
		}
	}
}
