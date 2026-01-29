import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { procesarPreLiquidacion } from '@/features/pre-liquidacion/services/pre-liquidacion.service'
import { procesarPreLiquidacionSchema } from '@/features/pre-liquidacion/lib/pre-liquidacion-schemas'

/**
 * POST /api/pre-liquidacion/procesar
 * Ejecuta el proceso de pre-liquidación para un archivo en un rango de fechas
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const body = await request.json()

		// Validar con schema Zod
		const validationResult = procesarPreLiquidacionSchema.safeParse(body)
		if (!validationResult.success) {
			return NextResponse.json(
				{
					error: 'Datos inválidos',
					details: validationResult.error.errors.map((e) => ({
						path: e.path.join('.'),
						message: e.message,
					})),
				},
				{ status: 400 }
			)
		}

		const { fileImportId, mes, fechaInicio, fechaFin } = validationResult.data

		let rangoFecha: { inicio: Date; fin: Date }

		// Opción 1: Rango de fechas explícito
		if (fechaInicio && fechaFin) {
			rangoFecha = {
				inicio: new Date(fechaInicio),
				fin: new Date(fechaFin),
			}
		}
		// Opción 2: Mes "YYYY-MM"
		else if (mes) {
			const [year, month] = mes.split('-').map(Number)
			rangoFecha = {
				inicio: new Date(year, month - 1, 1), // Mes es 0-indexed en JS
				fin: new Date(year, month, 0), // Día 0 del siguiente mes es el último día del mes actual
			}
			// Asegurar fin del día para la fecha fin si es necesario,
			// pero como fechaPago suele ser DateTime, mejor asegurar cobertura total
			// Ajustamos horas para cubrir todo el día
			rangoFecha.fin.setHours(23, 59, 59, 999)
		} else {
			// Este caso no debería ocurrir debido a la validación del schema,
			// pero lo mantenemos como fallback
			return NextResponse.json(
				{ error: 'Se requiere "mes" (YYYY-MM) o "fechaInicio" y "fechaFin".' },
				{ status: 400 }
			)
		}

		// Ejecutar proceso
		const resultado = await procesarPreLiquidacion(fileImportId, rangoFecha)

		if (!resultado.success) {
			return NextResponse.json({ error: resultado.mensaje }, { status: 400 })
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
