import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
	parseExcelFile,
	type DetectedFileType,
} from '@/features/pre-liquidacion/lib/excel-parser'
import type { UploadCommissionFileResponse } from '@/features/pre-liquidacion/types/types'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(request: Request): Promise<NextResponse> {
	try {
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}
		const userId = parseInt(session.user.id ?? '0')
		if (!userId) {
			return NextResponse.json({ error: 'Invalid User ID' }, { status: 401 })
		}

		const formData = await request.formData()
		const file = formData.get('file') as File
		const manualFileType = formData.get('manualFileType') as string | null

		if (!file) {
			return NextResponse.json({ error: 'No file provided' }, { status: 400 })
		}

		const buffer = Buffer.from(await file.arrayBuffer())

		// Parse Excel
		const parseResult = await parseExcelFile(buffer)

		// Manual Override (T028)
		if (manualFileType && manualFileType !== 'AUTO') {
			parseResult.fileType = manualFileType as DetectedFileType
		}

		if (parseResult.fileType === 'UNKNOWN') {
			return NextResponse.json(
				{
					error: 'Formato de archivo desconocido',
					details: [
						'Verifique que el archivo contenga las columnas requeridas para Voluntarias o Pólizas.',
					],
				},
				{ status: 400 }
			)
		}

		// Check blocking for CLOSED periods (T026)
		// Extract distinct months from rows
		const dates = parseResult.rows
			.map(r => r.paymentDate)
			.filter((d): d is Date => !!d)

		if (dates.length > 0) {
			const monthsToCheck = new Set(dates.map(d => `${d.getFullYear()}-${d.getMonth() + 1}`))

			// Find conflicting CLOSED file imports
			// We define a "Closed Period" as any FileImport with status 'CLOSED' 
			// that contains records for the same Year-Month.
			// This is an approximation as we don't have a specific Period table.

			// Efficient check: Query FileImports that are CLOSED and join with SettlementCommission 
			// where paymentDate is in the range.
			// Since we can't do complex distinct joins easily in one filtered query without raw SQL or heavy logic,
			// we will iterate check. (Assuming limited number of closed periods)

			// Actually, better to check if there is ANY SettlementCommission 
			// where status != 'PENDIENTE' (or FileImport.status = CLOSED)
			// AND paymentDate is in the set of months.

			for (const monthStr of monthsToCheck) {
				const [year, month] = monthStr.split('-').map(Number)
				const startDate = new Date(year, month - 1, 1)
				const endDate = new Date(year, month, 0) // Last day of month

				const closedPeriodExists = await prisma.settlementCommission.findFirst({
					where: {
						paymentDate: {
							gte: startDate,
							lte: endDate
						},
						fileImport: {
							status: 'CLOSED'
						}
					},
					select: { id: true }
				})

				if (closedPeriodExists) {
					return NextResponse.json(
						{
							error: 'Periodo Cerrado',
							details: [`No se pueden cargar registros para el periodo ${monthStr} porque ya se encuentra CERRADO.`]
						},
						{ status: 400 }
					)
				}
			}
		}

		// DB Transaction
		const result = await prisma.$transaction(async (tx) => {
			// 1. Create FileImport
			const fileImport = await tx.fileImport.create({
				data: {
					nameFile: file.name,
					user: { connect: { idUser: userId } },
					totalRecord: parseResult.summary.totalRows,
					sincronizadoRecord: 0,
					rezagadoRecord: 0,
					status: 'LOAD',
					loadDate: new Date(),
					fileType: parseResult.fileType
				},
			})

			// 2. Create SettlementCommission rows
			if (parseResult.rows.length > 0) {
				await tx.settlementCommission.createMany({
					data: parseResult.rows.map((row) => ({
						idFileImport: fileImport.idFileImport,
						commissionType: parseResult.fileType,
						status: 'PENDIENTE',

						// Mappings
						product: row.productName,
						description: row.description,
						commissionValue: row.commissionValue ? new Decimal(row.commissionValue) : null,
						baseCommission: row.baseCommission ? new Decimal(row.baseCommission) : null,

						// Poliza specific
						policy: row.policyNumber,
						branch: row.branch,
						receipt: row.receipt,

						// New Field T015
						originCommission: row.originCommission,

						// T026
						paymentDate: row.paymentDate
					})),
				})
			}

			return fileImport
		})

		const response: UploadCommissionFileResponse = {
			fileId: result.idFileImport.toString(),
			fileName: result.nameFile,
			status: result.status,
			totalRows: result.totalRecord,
			detectedType: parseResult.fileType,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error uploading file:', error)
		return NextResponse.json(
			{ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		)
	}
}
