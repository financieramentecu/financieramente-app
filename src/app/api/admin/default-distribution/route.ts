import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { roleCan } from '@/features/access-control/services/role-permission-check'
import {
	AuditAction,
	getClientIp,
	getUserAgent,
	logAuditEvent,
} from '@/features/auth/lib/audit-logger'
import {
	DefaultDistributionUpdateError,
	updateDefaultDistributionSchema,
} from '@/features/distribution-commission/lib/default-distribution-update'
import {
	listDefaultDistribution,
	updateDefaultDistribution,
} from '@/features/distribution-commission/services/default-distribution.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

async function requireAdmin() {
	const session = await auth()
	if (!session?.user) {
		return {
			session: null,
			response: NextResponse.json(
				{ data: null, error: 'No autorizado' } satisfies ApiResponse<null>,
				{ status: 401 }
			),
		}
	}
	if (!(await roleCan(session.user.role, 'configuracion.distribucion'))) {
		return {
			session: null,
			response: NextResponse.json(
				{ data: null, error: 'No autorizado' } satisfies ApiResponse<null>,
				{ status: 403 }
			),
		}
	}
	return { session, response: null }
}

export async function GET() {
	const { response } = await requireAdmin()
	if (response) {
		return response
	}

	try {
		const groups = await listDefaultDistribution()
		return NextResponse.json({ data: { groups } })
	} catch (error) {
		console.error('Error listing default distribution:', error)
		return NextResponse.json(
			{ data: null, error: 'No se pudo cargar la distribución por defecto' },
			{ status: 500 }
		)
	}
}

export async function PUT(request: Request) {
	const { session, response } = await requireAdmin()
	if (response || !session) {
		return response
	}

	try {
		const body = updateDefaultDistributionSchema.parse(await request.json())
		const groups = await updateDefaultDistribution(body.lines)
		await logAuditEvent({
			userId: session.user.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.DEFAULT_DISTRIBUTION_UPDATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(request.headers),
			userAgent: getUserAgent(request.headers),
			details: `Distribución por defecto actualizada (${body.lines.length} porcentajes)`,
		})
		return NextResponse.json({ data: { groups } })
	} catch (error) {
		if (error instanceof z.ZodError || error instanceof DefaultDistributionUpdateError) {
			return NextResponse.json(
				{
					data: null,
					error:
						error instanceof DefaultDistributionUpdateError
							? error.message
							: 'Los porcentajes no son válidos',
				},
				{ status: 400 }
			)
		}
		console.error('Error updating default distribution:', error)
		return NextResponse.json(
			{ data: null, error: 'No se pudo guardar la distribución por defecto' },
			{ status: 500 }
		)
	}
}
