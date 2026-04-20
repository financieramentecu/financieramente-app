import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth/nextauth'
import { UserRole } from '@/features/auth/lib/roles'
import { prisma } from '@/lib/prisma'
import { enviarNotificacionesPorArchivo } from '@/features/pre-liquidacion/services/notificar-preliquidacion.service'
import type { DistribucionLinkKind } from '@/features/email/lib/distribucion-link-notification'

const ALLOWED_ROLES: UserRole[] = [
	UserRole.ADMIN,
	UserRole.ASISTENTE_GERENCIA_OPERATIVA,
]

const BodySchema = z.object({
	fileImportId: z.number().int().positive(),
	kind: z.enum(['PRE_LIQUIDACION', 'LIQUIDACION']).optional(),
	idUser: z.number().int().positive().optional(),
})

/**
 * POST /api/pre-liquidacion/notificar
 *
 * Envía correos de notificación con el link al recibo de distribución a los
 * beneficiarios del archivo. El tipo (pre-liquidación o comprobante final) se
 * infiere del estado actual del archivo o puede forzarse vía `kind`:
 * - PRE-SETTLED → kind = PRE_LIQUIDACION
 * - SETTLED/COMPLETED → kind = LIQUIDACION
 *
 * Cuando se envía `idUser`, se notifica únicamente a ese beneficiario
 * (habilita el "Notificar a coach" puntual desde la pantalla de detalle).
 */
export async function POST(request: NextRequest) {
	try {
		const session = await auth()
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
		}

		const role = session.user?.role as UserRole | undefined
		if (!role || !ALLOWED_ROLES.includes(role)) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
		}

		const rawBody = await request.json().catch(() => null)
		const parsed = BodySchema.safeParse(rawBody)
		if (!parsed.success) {
			return NextResponse.json(
				{ error: 'Body inválido', details: parsed.error.message },
				{ status: 400 }
			)
		}

		const { fileImportId, idUser } = parsed.data

		let kind: DistribucionLinkKind | undefined = parsed.data.kind
		if (!kind) {
			const file = await prisma.fileImport.findUnique({
				where: { idFileImport: fileImportId },
				select: { status: true },
			})
			if (!file) {
				return NextResponse.json(
					{ error: 'Archivo no encontrado' },
					{ status: 404 }
				)
			}
			kind =
				file.status === 'SETTLED' || file.status === 'COMPLETED'
					? 'LIQUIDACION'
					: 'PRE_LIQUIDACION'
		}

		const resultado = await enviarNotificacionesPorArchivo({
			fileImportId,
			kind,
			targetIdUser: idUser,
		})

		return NextResponse.json({
			success: resultado.enviados > 0 || resultado.fallidos === 0,
			mensaje:
				resultado.enviados === 0 && resultado.fallidos === 0
					? 'No hay beneficiarios para notificar en este archivo.'
					: `Notificaciones enviadas: ${resultado.enviados}; fallidas: ${resultado.fallidos}.`,
			kind,
			...resultado,
		})
	} catch (error) {
		console.error('Error al notificar archivo:', error)
		return NextResponse.json(
			{
				error: 'Error al notificar archivo',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
