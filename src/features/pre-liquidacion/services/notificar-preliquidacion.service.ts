import { prisma } from '@/lib/prisma'
import {
	sendDistribucionLinkEmail,
	type DistribucionLinkKind,
} from '@/features/email/lib/distribucion-link-notification'

/**
 * Servicio para disparar notificaciones de distribución.
 *
 * Los correos enviados contienen un link al recibo del beneficiario (ver
 * {@link sendDistribucionLinkEmail}) y ya no incluyen la tabla de resumen.
 *
 * Soporta dos modos:
 * - "PRE_LIQUIDACION": se dispara cuando hay registros en estado PRE-SETTLED.
 * - "LIQUIDACION": se dispara tras liquidar (comprobante final).
 */

/**
 * Resultado agregado del envío de correos.
 */
export interface ResultadoEnvioNotificaciones {
	enviados: number
	fallidos: number
	omitidos: number
	destinatarios: Array<{ idUser: number; email: string; ok: boolean; error?: string }>
}

interface ResumenBeneficiarioArchivo {
	idUser: number
	email: string
	nombreUsuario: string
	totalNeta: number
	countContratos: number
	countNegocios: number
}

function round2(n: number): number {
	return Math.round(n * 100) / 100
}

function extractPeriodo(file: {
	nameFile: string
	month: number | null
	year: number | null
}): string {
	if (file.month != null && file.year != null) {
		const mm = String(file.month).padStart(2, '0')
		return `${file.year}-${mm}`
	}
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
	const tokens = file.nameFile
		.replace(/\.[^.]+$/, '')
		.toUpperCase()
		.split(/[-_\s]+/)
	const year = tokens.find((t) => /^\d{4}$/.test(t))
	const monthName = tokens.find((t) => t in monthMap)
	return year && monthName
		? `${year}-${monthMap[monthName]}`
		: 'sin periodo'
}

/**
 * Obtiene el resumen por beneficiario (suma de valores, conteo de contratos)
 * para un archivo dado, restringiendo a un estado específico.
 */
async function obtenerResumenBeneficiarios(
	fileImportId: number,
	settlementStatus: string[],
	settlementCommissionIds?: number[]
): Promise<ResumenBeneficiarioArchivo[]> {
	const distribuciones =
		(await prisma.comissionDistribution.findMany({
			where: {
				settlementCommission: {
					idFileImport: fileImportId,
					status: { in: settlementStatus },
					...(settlementCommissionIds && settlementCommissionIds.length > 0
						? { idSettlementCommission: { in: settlementCommissionIds } }
						: {}),
				},
			},
			select: {
				idBeneficiaryUser: true,
				valueComissionFinal: true,
				settlementCommission: {
					select: {
						idSettlementCommission: true,
						idBusiness: true,
					},
				},
				beneficiaryUser: {
					select: {
						idUser: true,
						name: true,
						lastName: true,
						email: true,
						active: true,
					},
				},
			},
		})) ?? []

	const byUser = new Map<
		number,
		{
			email: string
			nombreUsuario: string
			active: boolean
			total: number
			contratos: Set<number>
			negocios: Set<number>
		}
	>()

	for (const d of distribuciones) {
		const u = d.beneficiaryUser
		if (!u || !u.email) continue
		let entry = byUser.get(u.idUser)
		if (!entry) {
			entry = {
				email: u.email,
				nombreUsuario: `${u.name} ${u.lastName ?? ''}`.trim(),
				active: u.active,
				total: 0,
				contratos: new Set<number>(),
				negocios: new Set<number>(),
			}
			byUser.set(u.idUser, entry)
		}
		entry.total += d.valueComissionFinal.toNumber()
		entry.contratos.add(d.settlementCommission.idSettlementCommission)
		if (d.settlementCommission.idBusiness != null) {
			entry.negocios.add(d.settlementCommission.idBusiness)
		}
	}

	const items: ResumenBeneficiarioArchivo[] = []
	for (const [idUser, entry] of byUser) {
		if (!entry.active) continue
		items.push({
			idUser,
			email: entry.email,
			nombreUsuario: entry.nombreUsuario,
			totalNeta: round2(entry.total),
			countContratos: entry.contratos.size,
			countNegocios: entry.negocios.size,
		})
	}
	return items
}

/**
 * Envía un correo por cada beneficiario del archivo con el resumen y el link
 * al detalle. `kind` determina el asunto y las leyendas.
 *
 * Si `kind` no se provee, se infiere del estado del archivo
 * (`SETTLED`/`COMPLETED` → `LIQUIDACION`, caso contrario → `PRE_LIQUIDACION`).
 *
 * Si `targetIdUser` está definido, solo se envía al beneficiario indicado.
 *
 * Si `settlementCommissionIds` está definido, sólo se consideran las
 * distribuciones de esos settlements (usado por `liquidarRegistros` para
 * evitar notificar dos veces a beneficiarios ya liquidados en batches
 * anteriores).
 *
 * Cuando el envío corresponde a `kind === 'LIQUIDACION'` y el archivo está en
 * estado `SETTLED`, el archivo se marca como `COMPLETED` al finalizar (equivalente
 * a la anterior `notificarArchivoCompleto`).
 */
export async function enviarNotificacionesPorArchivo(params: {
	fileImportId: number
	kind?: DistribucionLinkKind
	targetIdUser?: number
	settlementCommissionIds?: number[]
}): Promise<ResultadoEnvioNotificaciones> {
	const { fileImportId, targetIdUser, settlementCommissionIds } = params

	const fileImport = await prisma.fileImport.findUnique({
		where: { idFileImport: fileImportId },
		select: {
			idFileImport: true,
			nameFile: true,
			month: true,
			year: true,
			status: true,
		},
	})
	if (!fileImport) {
		return { enviados: 0, fallidos: 0, omitidos: 0, destinatarios: [] }
	}

	const kind: DistribucionLinkKind =
		params.kind ??
		(fileImport.status === 'SETTLED' || fileImport.status === 'COMPLETED'
			? 'LIQUIDACION'
			: 'PRE_LIQUIDACION')

	const status =
		kind === 'LIQUIDACION'
			? ['SETTLED']
			: ['PRE-SETTLED']
	const beneficiarios = await obtenerResumenBeneficiarios(
		fileImportId,
		status,
		settlementCommissionIds
	)

	const filtered = targetIdUser
		? beneficiarios.filter((b) => b.idUser === targetIdUser)
		: beneficiarios

	const periodo = extractPeriodo({
		nameFile: fileImport.nameFile,
		month: fileImport.month,
		year: fileImport.year,
	})

	const destinatarios: ResultadoEnvioNotificaciones['destinatarios'] = []
	let enviados = 0
	let fallidos = 0
	const omitidos = beneficiarios.length - filtered.length

	for (const b of filtered) {
		try {
			const result = await sendDistribucionLinkEmail({
				to: b.email,
				nombreUsuario: b.nombreUsuario,
				kind,
				archivoNombre: fileImport.nameFile,
				periodo,
				fileImportId: fileImport.idFileImport,
				totalNeta: b.totalNeta,
				countContratos: b.countContratos,
				countNegocios: b.countNegocios,
			})
			if (result.success) {
				enviados++
				destinatarios.push({ idUser: b.idUser, email: b.email, ok: true })
			} else {
				fallidos++
				destinatarios.push({
					idUser: b.idUser,
					email: b.email,
					ok: false,
					error: result.error,
				})
			}
		} catch (err) {
			fallidos++
			destinatarios.push({
				idUser: b.idUser,
				email: b.email,
				ok: false,
				error: err instanceof Error ? err.message : String(err),
			})
		}
	}

	// Tras notificar el comprobante final, el archivo queda COMPLETED.
	// Equivale al antiguo `notificarArchivoCompleto` pero ahora vive aquí.
	if (kind === 'LIQUIDACION' && fileImport.status === 'SETTLED') {
		try {
			await prisma.fileImport.update({
				where: { idFileImport: fileImport.idFileImport },
				data: { status: 'COMPLETED', updatedAt: new Date() },
			})
		} catch (err) {
			console.error(
				'Error marcando archivo como COMPLETED tras notificación:',
				err
			)
		}
	}

	return { enviados, fallidos, omitidos, destinatarios }
}
