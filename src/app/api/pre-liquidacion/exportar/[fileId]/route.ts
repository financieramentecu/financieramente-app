import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

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
            include: { user: true }
        })

        if (!fileImport) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        // Fetch data for export
        const distributions = await prisma.commissionDistribution.findMany({
            where: {
                settlementCommission: {
                    idFileImport: id
                }
            },
            include: {
                settlementCommission: {
                    include: {
                        business: {
                            include: {
                                client: true,
                                user: true
                            }
                        }
                    }
                },
                productPercentageCommissionCategory: {
                    include: { category: true }
                }
            }
        })

        // Transform to Excel format
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = distributions.map((d: any) => ({
            'ID Registro': d.settlementCommission.idSettlementCommission,
            'Producto': d.settlementCommission.product,
            'Tipo Comision': d.settlementCommission.commissionType,
            'Agente': d.settlementCommission.business?.user?.name ?? 'Unknown',
            'Cliente': d.settlementCommission.business?.client?.name ?? 'Unknown',
            'Contrato/Poliza': d.settlementCommission.business?.contract ?? d.settlementCommission.poliza,
            'Categoria': (d as any).productPercentageCommissionCategory?.category?.name ?? 'General',
            'Valor Base': d.settlementCommission.commissionValue ? d.settlementCommission.commissionValue.toNumber() : 0,
            'Comision Bruta': d.valueCommission.toNumber(),
            'Comision Neta': d.valueCommissionFinal.toNumber(),
            'Estado': d.status
        }))

        // Create Workbook
        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte')
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

        // Return File
        const headers = new Headers()
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        headers.set('Content-Disposition', `attachment; filename="Reporte_${fileImport.nameFile}.xlsx"`)

        return new NextResponse(buffer, {
            status: 200,
            headers
        })

    } catch (error) {
        console.error('Error exporting file:', error)
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
