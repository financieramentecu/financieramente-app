import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import type { RespuestaArchivosDisponibles } from '@/features/pre-liquidacion/types/types'

/**
 * GET /api/pre-liquidacion/archivos
 * Lista archivos disponibles para pre-liquidar (COMPLETADO) y pre-liquidados (PRELIQUIDADO)
 */
export async function GET(_request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        // Obtener archivos con conteo de preliquidados
        const todosArchivos = await prisma.fileImport.findMany({
            where: {
                status: {
                    in: ['COMPLETADO', 'PRELIQUIDADO'],
                },
            },
            include: {
                user: {
                    select: {
                        name: true,
                        lastName: true,
                    },
                },
                _count: {
                    select: {
                        settlementCommissions: {
                            where: { status: 'PRELIQUIDADO' }
                        }
                    }
                }
            },
            orderBy: {
                loadDate: 'desc',
            },
        })

        // Formatear respuesta
        const archivos = todosArchivos.map((archivo) => {
            const preliquidadosCount = archivo._count.settlementCommissions

            return {
                idFileImport: archivo.idFileImport,
                nombreArchivo: archivo.nameFile,
                usuarioCargo: `${archivo.user.name} ${archivo.user.lastName || ''}`.trim(),
                fechaCarga: archivo.loadDate.toISOString().split('T')[0],
                fechaPreLiquidacion: archivo.preLiquidacionDate ? archivo.preLiquidacionDate.toISOString().split('T')[0] : null,
                cantidadRegistros: archivo.totalRecord,
                totalRegistros: archivo.totalRecord,
                sincronizados: archivo.sincronizadoRecord,
                rezagados: archivo.rezagadoRecord,
                estado: archivo.status,
                registrosPreliquidados: preliquidadosCount
            }
        })

        const archivosCompletados = archivos.filter((a) => a.estado === 'COMPLETADO')
        const archivosPreLiquidados = archivos.filter((a) => a.estado === 'PRELIQUIDADO')

        const resumen = {
            totalArchivos: archivos.length,
            sincronizados: archivosCompletados.length,
            preLiquidados: archivosPreLiquidados.length,
        }

        const response: RespuestaArchivosDisponibles = {
            archivos,
            resumen,
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error al obtener archivos disponibles:', error)
        return NextResponse.json(
            {
                error: 'Error al obtener archivos',
                details: error instanceof Error ? error.message : 'Error desconocido',
            },
            { status: 500 }
        )
    }
}
