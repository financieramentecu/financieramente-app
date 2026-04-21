import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import {
	enviarNotificacionesPorArchivo,
	type ResultadoEnvioNotificaciones,
} from '@/features/pre-liquidacion/services/notificar-preliquidacion.service'
import type { DistribucionLinkKind } from '@/features/email/lib/distribucion-link-notification'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

const ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
]

const BodySchema = z.object({
	fileImportId: z.number().int().positive(),
	kind: z.enum(['PRE_LIQUIDACION', 'LIQUIDACION']).optional(),
	idUser: z.number().int().positive().optional(),
})

export interface NotificarResponseData extends ResultadoEnvioNotificaciones {
	success: boolean
	mensaje: string
	kind: DistribucionLinkKind
}

/**
 * POST /api/pre-liquidacion/notificar
 *
 * Envía correos de notificación con el link al recibo de distribución a los
 * beneficiarios del archivo. El tipo (pre-liquidación o comprobante final) se
 * infiere en el service a partir del estado del archivo (PRE-SETTLED →
 * PRE_LIQUIDACION; SETTLED/COMPLETED → LIQUIDACION) o puede forzarse vía
 * `kind`.
 *
 * Cuando se envía `idUser`, se notifica únicamente a ese beneficiario
 * (habilita el "Notificar a coach" puntual desde la pantalla de detalle).
 */
export async function POST(
	request: NextRequest
): Promise<NextResponse<ApiResponse<NotificarResponseData>>> {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json(
				{ data: null, error: 'No autorizado' },
				{ status: 401 }
			)
		}

		const role = session.user?.role as UserRole | undefined
		if (!role || !ALLOWED_ROLES.includes(role)) {
			return NextResponse.json(
				{ data: null, error: 'Forbidden' },
				{ status: 403 }
			)
		}

		const rawBody = await request.json().catch(() => null)
		const parsed = BodySchema.safeParse(rawBody)
		if (!parsed.success) {
			return NextResponse.json(
				{ data: null, error: `Body inválido: ${parsed.error.message}` },
				{ status: 400 }
			)
		}

		const { fileImportId, kind: kindInput, idUser } = parsed.data

		const resultado = await enviarNotificacionesPorArchivo({
			fileImportId,
			kind: kindInput,
			targetIdUser: idUser,
		})

		// Si el caller no forzó `kind`, el service infirió uno internamente a
		// partir del estado del archivo; lo reportamos aquí como fallback.
		const kindUsed: DistribucionLinkKind = kindInput ?? 'PRE_LIQUIDACION'

		return NextResponse.json({
			data: {
				...resultado,
				success: resultado.enviados > 0 || resultado.fallidos === 0,
				mensaje:
					resultado.enviados === 0 && resultado.fallidos === 0
						? 'No hay beneficiarios para notificar en este archivo.'
						: `Notificaciones enviadas: ${resultado.enviados}; fallidas: ${resultado.fallidos}.`,
				kind: kindUsed,
			},
		})
	} catch (error) {
		console.error('Error al notificar archivo:', error)
		return NextResponse.json(
			{
				data: null,
				error: `Error al notificar archivo: ${
					error instanceof Error ? error.message : 'Error desconocido'
				}`,
			},
			{ status: 500 }
		)
	}
}
