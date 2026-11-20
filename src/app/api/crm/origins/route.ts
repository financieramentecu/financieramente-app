import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { crmErrorResponse as error } from '@/lib/auth/require-crm-actor'
import {
	listLeadOriginOptions,
	type LeadOriginOption,
} from '@/features/leads/table/lead-origin-options.service'

/** GET /api/crm/origins — active `client_origin` rows for the pipeline and lead table filters. */
export async function GET() {
	const session = await auth()
	if (!session?.user?.email) return error('No autorizado', 401)

	try {
		const currentUser = await getCurrentUserByEmail(session.user.email)
		if (!currentUser) return error('Usuario no encontrado', 404)
		const origins = await listLeadOriginOptions()
		return NextResponse.json({ data: origins } satisfies ApiResponse<LeadOriginOption[]>)
	} catch (cause) {
		console.error('Error fetching CRM lead origins:', cause)
		return error('Error al obtener los orígenes', 500)
	}
}
