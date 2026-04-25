/**
 * POST /api/negocios/export — Excel negocios (H5)
 */

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { negociosExportBodySchema } from '@/features/negocios/lib/business-api.schemas'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { UserRole } from '@/features/auth/lib/roles'
import { buildBusinessListWhere } from '@/features/negocios/lib/build-business-list-where'
import { toBusinessListFilterInput } from '@/features/negocios/lib/to-business-list-filter-input'
import { businessExportInclude } from '@/features/negocios/lib/business-export-include'
import {
	businessesToExportRows,
	computeMaxAnnualColumns,
	computeMaxLeaderLevels,
	negociosExportColumnHeaders,
} from '@/features/negocios/lib/map-business-to-export-row'
import {
	resolveLeaderChainForExport,
	type LeaderExportLevel,
} from '@/features/negocios/lib/resolve-leader-chain-export'
import { EXPORT_MAX_ROWS } from '@/features/negocios/lib/export-limits'

const EXPORT_ROLES: readonly string[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
	UserRole.ANALISTA_SOPORTE,
]

export async function POST(request: Request) {
	try {
		const session = await auth()
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		let json: unknown
		try {
			json = await request.json()
		} catch {
			return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
		}

		const parsed = negociosExportBodySchema.safeParse(json)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: parsed.error.flatten().fieldErrors },
				{ status: 400 }
			)
		}

		const currentUser = await getCurrentUserByEmail(session.user.email)
		if (!currentUser) {
			return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
		}

		const roleCode = currentUser.role?.code
		if (!roleCode || !EXPORT_ROLES.includes(roleCode)) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
		}

		const { dateFrom, dateTo, search, status } = parsed.data

		const where = buildBusinessListWhere(
			currentUser,
			toBusinessListFilterInput({
				search,
				status,
				dateFrom,
				dateTo,
			})
		)

		const total = await prisma.business.count({ where })

		if (total === 0) {
			return NextResponse.json(
				{ error: 'No hay registros para exportar' },
				{ status: 404 }
			)
		}

		if (total > EXPORT_MAX_ROWS) {
			return NextResponse.json(
				{
					error: `El resultado supera el máximo de ${EXPORT_MAX_ROWS} filas por exportación`,
				},
				{ status: 413 }
			)
		}

		const businesses = await prisma.business.findMany({
			where,
			include: businessExportInclude,
			orderBy: { idBusiness: 'asc' },
			take: EXPORT_MAX_ROWS,
		})

		const leaderCache = new Map<number, LeaderExportLevel[]>()
		for (const b of businesses) {
			await resolveLeaderChainForExport(prisma, b.user.idUser, leaderCache)
		}

		const chains = businesses.map(
			(b) => leaderCache.get(b.user.idUser) ?? []
		)
		const maxLeaderLevels = computeMaxLeaderLevels(chains)
		const maxAnnualCols = computeMaxAnnualColumns(businesses)

		const dateFromObj = dateFrom ? new Date(dateFrom) : undefined
		const dateToObj = dateTo ? new Date(dateTo) : undefined

		const headers = negociosExportColumnHeaders(maxLeaderLevels, maxAnnualCols, dateFromObj, dateToObj)
		const rows = businessesToExportRows(
			businesses,
			leaderCache,
			maxAnnualCols,
			maxLeaderLevels,
			dateFromObj,
			dateToObj
		)

		const worksheet = XLSX.utils.json_to_sheet(rows, {
			header: headers,
		})

		interface StyledCell extends XLSX.CellObject {
			s?: {
				font?: { bold?: boolean };
				fill?: { fgColor?: { rgb?: string } };
				alignment?: { horizontal?: string };
				border?: {
					bottom?: { style: string; color: { rgb: string } };
				};
			};
		}

		// Aplicar estilos, formatos y auto-ajuste de columnas
		if (worksheet['!ref']) {
			const range = XLSX.utils.decode_range(worksheet['!ref'])
			const VALOR_NEGOCIO_COL_NAME = 'Valor negocio'
			const colIndexValor = headers.indexOf(VALOR_NEGOCIO_COL_NAME)

			// Inicializar anchos con el tamaño de los headers
			const colWidths = headers.map((h) => ({ wch: h.length + 2 }))

			for (let C = range.s.c; C <= range.e.c; ++C) {
				// Estilo de Cabecera (Fila 1)
				const headerAddr = XLSX.utils.encode_cell({ r: 0, c: C })
				const headerCell = worksheet[headerAddr] as StyledCell | undefined
				if (headerCell) {
					headerCell.s = {
						font: { bold: true },
						fill: { fgColor: { rgb: 'ADD8E6' } }, // Azul claro
						alignment: { horizontal: 'center' },
						border: {
							bottom: { style: 'thin', color: { rgb: '000000' } }
						}
					}
				}

				// Formato de Moneda y Cálculo de Ancho para datos
				for (let R = range.s.r + 1; R <= range.e.r; ++R) {
					const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
					const cell = worksheet[cellAddr]
					if (!cell) continue

					// Formato de moneda
					if (C === colIndexValor) {
						cell.z = '$#,##0.00'
					}

					// Actualizar ancho máximo
					const valStr = cell.v ? String(cell.v) : ''
					if (valStr.length + 2 > colWidths[C].wch) {
						colWidths[C].wch = valStr.length + 2
					}
				}
			}

			// Limitar ancho máximo para evitar columnas excesivamente anchas
			worksheet['!cols'] = colWidths.map(w => ({ wch: Math.min(w.wch, 50) }))
		}

		const workbook = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Negocios')

		const excelBuffer = XLSX.write(workbook, {
			type: 'buffer',
			bookType: 'xlsx',
		})

		const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
		const fileName = `negocios_${timestamp}.xlsx`

		return new NextResponse(excelBuffer, {
			headers: {
				'Content-Type':
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${fileName}"`,
			},
		})
	} catch (error) {
		console.error('Error al exportar negocios:', error)
		return NextResponse.json(
			{
				error: 'Error al exportar Excel',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
