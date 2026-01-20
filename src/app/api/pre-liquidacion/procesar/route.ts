import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
// import { procesarPreLiquidacion } from '@/features/pre-liquidacion/services/pre-liquidacion.service'

/**
 * POST /api/pre-liquidacion/procesar
 * Ejecuta el proceso de pre-liquidación para un archivo
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { fileImportId } = body

        if (!fileImportId || typeof fileImportId !== 'number') {
            return NextResponse.json(
                { error: 'fileImportId es requerido y debe ser un número' },
                { status: 400 }
            )
        }

        // Procesar pre-liquidación (MOCK)
        // const resultado = await procesarPreLiquidacion(fileImportId)

        // Simular retardo
        await new Promise(resolve => setTimeout(resolve, 2000))

        const resultado = {
            success: true,
            mensaje: 'Pre-liquidación simulada exitosamente',
            procesados: 150
        }

        if (!resultado.success) {
            return NextResponse.json(
                { error: resultado.mensaje },
                { status: 400 }
            )
        }

        return NextResponse.json(resultado)
    } catch (error) {
        console.error('Error al procesar pre-liquidación:', error)
        return NextResponse.json(
            {
                error: 'Error al procesar pre-liquidación',
                details: error instanceof Error ? error.message : 'Error desconocido',
            },
            { status: 500 }
        )
    }
}
