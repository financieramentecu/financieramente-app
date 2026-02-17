import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ fileId: string }> }
): Promise<NextResponse> {
	try {
		const { fileId } = await params
		const session = await auth()
		if (!session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const id = parseInt(fileId)
		if (isNaN(id)) {
			return NextResponse.json({ error: 'Invalid File ID' }, { status: 400 })
		}

		const fileImport = await prisma.fileImport.findUnique({
			where: { idFileImport: id },
		})

		if (!fileImport) {
			return NextResponse.json({ error: 'File not found' }, { status: 404 })
		}

		// Calculate progress and summary
		// For now, if status is LOAD, progress is 0. If PRELIQUIDADO, progress is 100.
		// Real-time progress would require a job queue or tracking table update.
		// We will approximate based on status.

		let progress = 0
		if (fileImport.status === 'PRELIQUIDADO' || fileImport.status === 'CLOSED') {
			progress = 100
		} else if (fileImport.status === 'PROCESSING') {
			progress = 50 // Mock
		}

		let summary = null

		if (progress === 100) {
			const settlements = await prisma.settlementCommission.findMany({
				where: { idFileImport: id },
				include: {
					commissionDistributions: true
				}
			})

			const totalProcessed = settlements.length
			// Assuming "failed" rows are skipped or have specific status?
			const successfulRows = settlements.filter(s => s.status !== 'ERROR').length
			const failedRows = totalProcessed - successfulRows

			// Calculate totals
			let totalBruta = new Decimal(0)
			let totalNeta = new Decimal(0) // Logic for Neta might differ based on distributions
			let totalClawback = new Decimal(0)

			// To get accurate totals we might need to sum distributions?
			// Or sum settlement values?
			// Use distributions for Neta/Clawback
			const distributions = await prisma.commissionDistribution.findMany({
				where: {
					settlementCommission: {
						idFileImport: id
					}
				},
				include: {
					clawbacks: true
				}
			})

			for (const dist of distributions) {
				totalBruta = totalBruta.add(dist.valueCommission)
				totalNeta = totalNeta.add(dist.valueCommissionFinal)

				// Check clawbacks linked to this distribution
				// Actually clawback is linked to distribution in schema?
				// Yes: Clawback -> CommissionDistribution
			}

			// Fetch clawbacks separately or via relation
			const clawbacks = await prisma.clawback.findMany({
				where: {
					commissionDistribution: {
						settlementCommission: {
							idFileImport: id
						}
					}
				}
			})

			totalClawback = clawbacks.reduce((sum, c) => sum.add(c.value), new Decimal(0))


			summary = {
				totalProcessed,
				successfulRows,
				failedRows,
				errors: [], // Populate if we tracked errors
				totalCommissionBruta: totalBruta.toNumber(),
				totalCommissionNeta: totalNeta.toNumber(),
				totalClawbackRetained: totalClawback.toNumber()
			}
		}

		return NextResponse.json({
			data: {
				fileId: fileId,
				status: fileImport.status,
				progress,
				summary
			}
		})

	} catch (error) {
		console.error('Error fetching results:', error)
		return NextResponse.json(
			{ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
			{ status: 500 }
		)
	}
}
