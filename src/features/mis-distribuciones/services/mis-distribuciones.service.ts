import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
	canViewUserDistributions,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import type { UserRole } from '@/features/auth/lib/roles'
import type {
	ArchivoMiDistribucion,
	FilaDistribucionDetalle,
	NegocioDistribucionDetalle,
	ReciboMensualDistribucion,
	TotalesRecibo,
} from '../types/types'

/**
 * Servicio del feature "Mis distribuciones".
 *
 * Expone tres operaciones:
 * - {@link obtenerMisArchivosConDistribucion}: lista de archivos/meses con
 *   distribución para un beneficiario.
 * - {@link obtenerReciboDistribucion}: detalle tipo recibo de un archivo.
 * - {@link registrarAprobacionDistribucion}: idempotente, marca "de acuerdo".
 *
 * Todas respetan jerarquía: el `viewerId` solo puede consultar/aprobar en
 * nombre propio; los roles de backoffice bypass-ean la validación para
 * consultas pero jamás para aprobaciones (una aprobación representa el
 * consentimiento personal del beneficiario).
 */

const ISO_SECONDS_PRECISION = 1000

function toIso(value: Date | null | undefined): string | null {
	if (!value) return null
	// Round down to second precision so tests/snapshots stay stable.
	const ms = Math.floor(value.getTime() / ISO_SECONDS_PRECISION) * ISO_SECONDS_PRECISION
	return new Date(ms).toISOString()
}

function round2(n: number): number {
	return Math.round(n * 100) / 100
}

function extractPeriodo(file: {
	nombreArchivo: string
	month: number | null
	year: number | null
	fechaCarga: Date
}): string {
	if (file.month != null && file.year != null) {
		const mm = String(file.month).padStart(2, '0')
		return `${file.year}-${mm}`
	}
	// Fallback: attempt to parse from filename tokens like MES-AÑO.
	const monthMap: Record<string, string> = {
		ENERO: '01',
		FEBRERO: '02',
		MARZO: '03',
		ABRIL: '04',
		MAYO: '05',
		JUNIO: '06',
		JULIO: '07',
		AGOSTO: '08',
		SEPTIEMBRE: '09',
		OCTUBRE: '10',
		NOVIEMBRE: '11',
		DICIEMBRE: '12',
	}
	const tokens = file.nombreArchivo
		.replace(/\.[^.]+$/, '')
		.toUpperCase()
		.split(/[-_\s]+/)
	const year = tokens.find((t) => /^\d{4}$/.test(t))
	const monthName = tokens.find((t) => t in monthMap)
	if (year && monthName) return `${year}-${monthMap[monthName]}`
	// Last resort: use the file loadDate.
	const d = file.fechaCarga
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

type DistributionRow = Prisma.ComissionDistributionGetPayload<{
	include: {
		settlementCommission: {
			include: {
				business: {
					include: { client: true }
				}
				fileImport: true
			}
		}
		productPercentageCommissionCategory: {
			include: {
				level: true
				productPercentageCommission: {
					include: {
						productConfiguration: {
							include: {
								product: true
							}
						}
					}
				}
			}
		}
		clawback: true
	}
}>

/**
 * Lista de archivos/meses con distribución para un usuario beneficiario.
 *
 * Considera únicamente distribuciones cuyo `beneficiaryUser` sea el
 * `idBeneficiary`, agrupadas por archivo. Devuelve totales agregados, estado
 * del archivo y si el usuario ya aprobó ese archivo.
 */
export async function obtenerMisArchivosConDistribucion(
	idBeneficiary: number
): Promise<ArchivoMiDistribucion[]> {
	if (!Number.isFinite(idBeneficiary) || idBeneficiary <= 0) return []

	const distribuciones = await prisma.comissionDistribution.findMany({
		where: { idBeneficiaryUser: idBeneficiary },
		select: {
			valueComission: true,
			valueCommissionWithDiscount: true,
			valueComissionFinal: true,
			totalDiscount: true,
			clawback: { select: { valueClawback: true } },
			settlementCommission: {
				select: {
					idBusiness: true,
					idSettlementCommission: true,
					settledDate: true,
					fileImport: {
						select: {
							idFileImport: true,
							nameFile: true,
							fileType: true,
							loadDate: true,
							preLiquidacionDate: true,
							month: true,
							year: true,
							status: true,
						},
					},
				},
			},
		},
	})

	type Agg = {
		idFileImport: number
		nombreArchivo: string
		estado: string
		periodo: string
		fechaCarga: Date
		fechaPreLiquidacion: Date | null
		fechaLiquidacion: Date | null
		totalNeta: number
		negocioIds: Set<number>
		countContratos: Set<number>
	}

	const byFile = new Map<number, Agg>()
	for (const d of distribuciones) {
		const fi = d.settlementCommission.fileImport
		if (!fi) continue
		let agg = byFile.get(fi.idFileImport)
		if (!agg) {
			agg = {
				idFileImport: fi.idFileImport,
				nombreArchivo: fi.nameFile,
				estado: fi.status,
				periodo: extractPeriodo({
					nombreArchivo: fi.nameFile,
					month: fi.month,
					year: fi.year,
					fechaCarga: fi.loadDate,
				}),
				fechaCarga: fi.loadDate,
				fechaPreLiquidacion: fi.preLiquidacionDate ?? null,
				fechaLiquidacion: null,
				totalNeta: 0,
				negocioIds: new Set<number>(),
				countContratos: new Set<number>(),
			}
			byFile.set(fi.idFileImport, agg)
		}
		agg.totalNeta += d.valueComissionFinal.toNumber()
		if (d.settlementCommission.idBusiness != null) {
			agg.negocioIds.add(d.settlementCommission.idBusiness)
		}
		agg.countContratos.add(d.settlementCommission.idSettlementCommission)
		const settled = d.settlementCommission.settledDate
		if (settled && (!agg.fechaLiquidacion || settled > agg.fechaLiquidacion)) {
			agg.fechaLiquidacion = settled
		}
	}

	const fileIds = Array.from(byFile.keys())
	const approvals = fileIds.length
		? await prisma.distributionApproval.findMany({
				where: {
					idFileImport: { in: fileIds },
					idUser: idBeneficiary,
				},
				select: { idFileImport: true, approvedAt: true },
			})
		: []
	const approvalByFile = new Map(
		approvals.map((a) => [a.idFileImport, a.approvedAt])
	)

	const items: ArchivoMiDistribucion[] = []
	for (const agg of byFile.values()) {
		const approvedAt = approvalByFile.get(agg.idFileImport) ?? null
		items.push({
			idFileImport: agg.idFileImport,
			nombreArchivo: agg.nombreArchivo,
			estado: agg.estado,
			periodo: agg.periodo,
			fechaCarga: toIso(agg.fechaCarga) ?? '',
			fechaPreLiquidacion: toIso(agg.fechaPreLiquidacion),
			fechaLiquidacion: toIso(agg.fechaLiquidacion),
			totalNeta: round2(agg.totalNeta),
			countNegocios: agg.negocioIds.size,
			countContratos: agg.countContratos.size,
			aprobado: approvedAt != null,
			aprobadoAt: toIso(approvedAt),
		})
	}

	items.sort((a, b) => (a.fechaCarga < b.fechaCarga ? 1 : -1))
	return items
}

/**
 * Recibo mensual detallado de un beneficiario para un archivo específico.
 *
 * Valida jerarquía: `viewerId` puede verlo si (a) es el propio beneficiario,
 * (b) es ascendiente del beneficiario, o (c) tiene un rol de backoffice.
 *
 * Devuelve `null` cuando el archivo no tiene distribuciones para el
 * beneficiario (lo que se debe mapear a 404 en la capa HTTP).
 *
 * Si `beneficiaryId` es omitido, se asume que el viewer quiere ver su propio
 * recibo.
 */
export async function obtenerReciboDistribucion(params: {
	fileImportId: number
	viewerId: number
	viewerRole?: UserRole | string | null
	/** Id del beneficiario del que se consulta el recibo. Default: viewerId. */
	beneficiaryId?: number
}): Promise<ReciboMensualDistribucion | null> {
	const { fileImportId, viewerId, viewerRole } = params
	const beneficiaryId = params.beneficiaryId ?? viewerId

	if (!Number.isFinite(fileImportId) || fileImportId <= 0) return null
	if (!Number.isFinite(beneficiaryId) || beneficiaryId <= 0) return null

	const allowed = await canViewUserDistributions(
		viewerId,
		beneficiaryId,
		viewerRole
	)
	if (!allowed) return null

	const fileImport = await prisma.fileImport.findUnique({
		where: { idFileImport: fileImportId },
		select: {
			idFileImport: true,
			nameFile: true,
			fileType: true,
			loadDate: true,
			preLiquidacionDate: true,
			month: true,
			year: true,
			status: true,
		},
	})
	if (!fileImport) return null

	const beneficiary = await prisma.user.findUnique({
		where: { idUser: beneficiaryId },
		select: {
			idUser: true,
			name: true,
			lastName: true,
			email: true,
			typeIdentity: true,
			identityNumber: true,
		},
	})
	if (!beneficiary) return null

	const rows: DistributionRow[] = await prisma.comissionDistribution.findMany({
		where: {
			idBeneficiaryUser: beneficiaryId,
			settlementCommission: { idFileImport: fileImportId },
		},
		include: {
			settlementCommission: {
				include: {
					business: { include: { client: true } },
					fileImport: true,
				},
			},
			productPercentageCommissionCategory: {
				include: {
					level: true,
					productPercentageCommission: {
						include: {
							productConfiguration: {
								include: {
									product: true,
								},
							},
						},
					},
				},
			},
			clawback: true,
		},
	})

	if (rows.length === 0) return null

	const negociosMap = new Map<number, NegocioDistribucionDetalle>()
	let latestSettledDate: Date | null = null
	for (const row of rows) {
		const sc = row.settlementCommission
		const usePortfolio = sc.originCommission === 'CARTERA'
		const ppcc = row.productPercentageCommissionCategory
		const categoria = ppcc?.level?.name ?? ''
		const porcentajeCategoria =
			usePortfolio && ppcc?.porcentajePortfolio != null
				? ppcc.porcentajePortfolio.toNumber()
				: (ppcc?.porcentajeDistribucion?.toNumber() ?? 0)

		const productConfig =
			ppcc?.productPercentageCommission?.productConfiguration
		const producto = productConfig?.product?.name ?? null
		const origen: string | null = null

		const client = sc.business?.client
		const nombreCliente = client
			? `${client.name} ${client.lastName ?? ''}`.trim() || null
			: null

		const bruta = row.valueComission?.toNumber() ?? 0
		const descuento = row.totalDiscount?.toNumber() ?? 0
		const postDescuento =
			row.valueCommissionWithDiscount?.toNumber() ??
			bruta - descuento
		const clawbackValue = row.clawback?.valueClawback?.toNumber() ?? null
		const porcentajeClawback = row.clawback?.porcentajeApplied?.toNumber() ?? null
		const neta = row.valueComissionFinal?.toNumber() ?? 0

		const fila: FilaDistribucionDetalle = {
			idComissionDistribution: row.idComissionDistribution,
			categoria,
			porcentajeCategoria,
			comisionBruta: round2(bruta),
			porcentajeDescuento: row.appliedDiscountPercentage?.toNumber() ?? 0,
			totalDescuento: round2(descuento),
			comisionPostDescuento: round2(postDescuento),
			porcentajeClawback,
			totalClawback: clawbackValue != null ? round2(clawbackValue) : null,
			comisionNeta: round2(neta),
			status: row.status,
		}

		const key = sc.idSettlementCommission
		let negocio = negociosMap.get(key)
		if (!negocio) {
			negocio = {
				idSettlementCommission: sc.idSettlementCommission,
				idBusiness: sc.business?.idBusiness ?? null,
				contrato: sc.contract ?? sc.business?.contract ?? null,
				nombreCliente,
				producto,
				origen,
				comisionTotal: round2(sc.commissionValue?.toNumber() ?? 0),
				totalBruta: 0,
				totalDescuento: 0,
				totalClawback: 0,
				totalNeta: 0,
				filas: [],
				statusSettlement: sc.status,
				settledDate: toIso(sc.settledDate),
			}
			negociosMap.set(key, negocio)
		}
		negocio.filas.push(fila)
		negocio.totalBruta = round2(negocio.totalBruta + bruta)
		negocio.totalDescuento = round2(negocio.totalDescuento + descuento)
		negocio.totalClawback = round2(
			negocio.totalClawback + (clawbackValue ?? 0)
		)
		negocio.totalNeta = round2(negocio.totalNeta + neta)

		if (sc.settledDate && (!latestSettledDate || sc.settledDate > latestSettledDate)) {
			latestSettledDate = sc.settledDate
		}
	}

	const negocios = Array.from(negociosMap.values()).sort((a, b) => {
		const ka = a.contrato ?? String(a.idSettlementCommission)
		const kb = b.contrato ?? String(b.idSettlementCommission)
		return ka.localeCompare(kb)
	})

	const totales: TotalesRecibo = negocios.reduce(
		(acc, n) => ({
			totalBruta: round2(acc.totalBruta + n.totalBruta),
			totalDescuento: round2(acc.totalDescuento + n.totalDescuento),
			totalClawback: round2(acc.totalClawback + n.totalClawback),
			totalNeta: round2(acc.totalNeta + n.totalNeta),
			countContratos: acc.countContratos + 1,
			countNegocios:
				acc.countNegocios +
				(n.idBusiness != null &&
					!negocios
						.slice(0, negocios.indexOf(n))
						.some((prev) => prev.idBusiness === n.idBusiness)
					? 1
					: 0),
		}),
		{
			totalBruta: 0,
			totalDescuento: 0,
			totalClawback: 0,
			totalNeta: 0,
			countContratos: 0,
			countNegocios: 0,
		}
	)

	const approval = await prisma.distributionApproval.findUnique({
		where: {
			idFileImport_idUser: {
				idFileImport: fileImportId,
				idUser: beneficiaryId,
			},
		},
	})

	const periodo = extractPeriodo({
		nombreArchivo: fileImport.nameFile,
		month: fileImport.month,
		year: fileImport.year,
		fechaCarga: fileImport.loadDate,
	})

	const viewerIsBeneficiary = viewerId === beneficiaryId
	const bypass = isHierarchyBypassRole(viewerRole)

	return {
		beneficiario: {
			idUser: beneficiary.idUser,
			nombreCompleto: `${beneficiary.name} ${beneficiary.lastName ?? ''}`.trim(),
			typeIdentity: beneficiary.typeIdentity ?? null,
			identityNumber: beneficiary.identityNumber ?? null,
			email: beneficiary.email,
		},
		archivo: {
			idFileImport: fileImport.idFileImport,
			nombreArchivo: fileImport.nameFile,
			periodo,
			estado: fileImport.status,
			fileType: fileImport.fileType ?? null,
			fechaCarga: toIso(fileImport.loadDate) ?? '',
			fechaPreLiquidacion: toIso(fileImport.preLiquidacionDate),
			fechaLiquidacion: toIso(latestSettledDate),
		},
		totales,
		negocios,
		aprobacion: {
			aprobado: approval != null,
			aprobadoAt: toIso(approval?.approvedAt),
		},
		permisos: {
			// Solo el beneficiario puede aprobar su propia distribución.
			puedeAprobar: viewerIsBeneficiary,
			// Backoffice y jerarquía superior pueden disparar notificaciones.
			puedeNotificar: bypass || !viewerIsBeneficiary,
		},
	}
}

/**
 * Registra la aprobación "De acuerdo" de un beneficiario sobre un archivo.
 *
 * Es idempotente: si ya existe una aprobación, devuelve la existente sin
 * error. Solo el propio beneficiario puede aprobar su distribución (no se
 * puede aprobar por cuenta ajena aunque el viewer sea backoffice).
 */
export async function registrarAprobacionDistribucion(params: {
	fileImportId: number
	idUser: number
}): Promise<{ aprobado: true; aprobadoAt: Date }> {
	const { fileImportId, idUser } = params

	if (!Number.isFinite(fileImportId) || fileImportId <= 0) {
		throw new Error('fileImportId inválido')
	}
	if (!Number.isFinite(idUser) || idUser <= 0) {
		throw new Error('idUser inválido')
	}

	// Verifica que haya distribuciones efectivas para ese usuario en ese archivo.
	const count = await prisma.comissionDistribution.count({
		where: {
			idBeneficiaryUser: idUser,
			settlementCommission: { idFileImport: fileImportId },
		},
	})
	if (count === 0) {
		throw new Error('No hay distribuciones para aprobar en este archivo')
	}

	const now = new Date()
	const record = await prisma.distributionApproval.upsert({
		where: {
			idFileImport_idUser: { idFileImport: fileImportId, idUser },
		},
		create: { idFileImport: fileImportId, idUser, approvedAt: now },
		update: {},
	})
	return { aprobado: true, aprobadoAt: record.approvedAt }
}

/**
 * Información mínima de un usuario beneficiario para encabezados de la
 * pantalla "Mis distribuciones". Devuelve `null` si no existe.
 */
export async function obtenerInfoBeneficiario(
	idUser: number
): Promise<{ idUser: number; nombreUsuario: string } | null> {
	if (!Number.isFinite(idUser) || idUser <= 0) return null
	const user = await prisma.user.findUnique({
		where: { idUser },
		select: { idUser: true, name: true, lastName: true },
	})
	if (!user) return null
	return {
		idUser: user.idUser,
		nombreUsuario: `${user.name} ${user.lastName ?? ''}`.trim(),
	}
}

/**
 * Cuenta beneficiarios únicos y aprobaciones existentes para un archivo.
 * Útil para mostrar "X/Y coaches aprobaron" en la tabla del backoffice.
 */
export async function contarAprobacionesArchivo(
	fileImportId: number
): Promise<{ total: number; aprobados: number }> {
	if (!Number.isFinite(fileImportId) || fileImportId <= 0) {
		return { total: 0, aprobados: 0 }
	}
	const [beneficiarios, aprobados] = await Promise.all([
		prisma.comissionDistribution.findMany({
			where: { settlementCommission: { idFileImport: fileImportId } },
			select: { idBeneficiaryUser: true },
			distinct: ['idBeneficiaryUser'],
		}),
		prisma.distributionApproval.count({
			where: { idFileImport: fileImportId },
		}),
	])
	return { total: beneficiarios.length, aprobados }
}
