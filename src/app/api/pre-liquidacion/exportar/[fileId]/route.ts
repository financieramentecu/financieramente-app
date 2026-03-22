import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

/**
 * POST /api/pre-liquidacion/exportar/[fileId]
 * Genera y descarga archivo Excel con resultados de pre-liquidación
 */
export async function POST(
    request: NextRequest,
    props: { params: Promise<{ fileId: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const fileId = parseInt(params.fileId)
        if (isNaN(fileId)) {
            return NextResponse.json(
                { error: 'ID de archivo inválido' },
                { status: 400 }
            )
        }

        // Obtener todos los registros pre-liquidados (canonical state: PRE-SETTLED)
        const registros = await prisma.settlementCommission.findMany({
            where: {
                idFileImport: fileId,
                status: 'PRE-SETTLED',
            },
            include: {
                business: {
                    include: {
                        client: true,
                        user: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        if (registros.length === 0) {
            return NextResponse.json(
                { error: 'No hay registros para exportar' },
                { status: 404 }
            )
        }

        // Crear workbook
        const workbook = XLSX.utils.book_new()

        // HOJA 1: Detalle de Cálculos
        const detalleData = registros.map((r) => ({
            'ID Registro': r.idSettlementCommission,
            Producto: r.descripcion || '',
            Rezagado: r.isLag ? 'Sí' : 'No',
            'Nombre Cliente': r.business?.client
                ? `${r.business.client.name} ${r.business.client.lastName || ''}`.trim()
                : '',
            'Cédula Agente': r.business?.user?.identityNumber || '',
            'Nombre Agente': r.business?.user
                ? `${r.business.user.name} ${r.business.user.lastName || ''}`.trim()
                : '',
            'Número Contrato': r.business?.contract || '',
            'Tipo Comisión': r.descripcion || '',
            Comisión: r.commissionValue?.toNumber() || 0,
            'General Bruta': 0, // r.generalBruta?.toNumber() || 0,
            'General Descuento': 0, // r.generalDescuento?.toNumber() || 0,
            'Comisión Bruta Agencia': 0, // r.comisionBrutaAgencia?.toNumber() || 0,
            'Comisión Agencia Descuento': 0, // r.comisionAgenciaDescuento?.toNumber() || 0,
            'Comisión Bruta Líder': 0, // r.comisionBrutaLider?.toNumber() || 0,
            'Comisión Líder Descuento': 0, // r.comisionLiderDescuento?.toNumber() || 0,
            'Comisión Bruta Coach': 0, // r.comisionBrutaCoach?.toNumber() || 0,
            'Comisión Coach Descuento': 0, // r.comisionCoachDescuento?.toNumber() || 0,
            Estado: r.status,
        }))

        const worksheetDetalle = XLSX.utils.json_to_sheet(detalleData)
        XLSX.utils.book_append_sheet(workbook, worksheetDetalle, 'Detalle Cálculos')

        // HOJA 2: Distribución por Agente/Categoría
        interface AgenteExportacion {
            'Cédula Agente': string
            'Nombre Agente': string
            'Total Comisión': number
            'Total General': number
            'Total Agencia': number
            'Total Líder': number
            'Total Coach': number
            'Cantidad Registros': number
        }

        const distribucionMap = new Map<string, AgenteExportacion>()

        registros.forEach((r) => {
            if (!r.business?.user) return

            const agenteKey = `${r.business.user.identityNumber}_${r.business.user.name}`

            if (!distribucionMap.has(agenteKey)) {
                distribucionMap.set(agenteKey, {
                    'Cédula Agente': r.business.user.identityNumber || '',
                    'Nombre Agente': `${r.business.user.name} ${r.business.user.lastName || ''}`.trim(),
                    'Total Comisión': 0,
                    'Total General': 0,
                    'Total Agencia': 0,
                    'Total Líder': 0,
                    'Total Coach': 0,
                    'Cantidad Registros': 0,
                })
            }

            const agente = distribucionMap.get(agenteKey)!
            agente['Total Comisión'] += r.commissionValue?.toNumber() || 0
            agente['Total General'] += 0 // Campo no disponible: r.generalDescuento
            agente['Total Agencia'] += 0 // Campo no disponible: r.comisionAgenciaDescuento
            agente['Total Líder'] += 0 // Campo no disponible: r.comisionLiderDescuento
            agente['Total Coach'] += 0 // Campo no disponible: r.comisionCoachDescuento
            agente['Cantidad Registros'] += 1
        })

        const distribucionData = Array.from(distribucionMap.values())
        const worksheetDistribucion = XLSX.utils.json_to_sheet(distribucionData)
        XLSX.utils.book_append_sheet(
            workbook,
            worksheetDistribucion,
            'Distribución'
        )

        // Generar buffer del Excel
        const excelBuffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
        })

        // Generar nombre de archivo con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const fileName = `preliquidacion_${timestamp}.xlsx`

        // Retornar archivo
        return new NextResponse(excelBuffer, {
            headers: {
                'Content-Type':
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        })
    } catch (error) {
        console.error('Error al exportar Excel:', error)
        return NextResponse.json(
            {
                error: 'Error al exportar Excel',
                details: error instanceof Error ? error.message : 'Error desconocido',
            },
            { status: 500 }
        )
    }
}
