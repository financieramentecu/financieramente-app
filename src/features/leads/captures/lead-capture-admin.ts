import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { crmErrorResponse } from '@/lib/auth/require-crm-actor'

export async function requireLeadCaptureAdmin() {
	const session = await auth()
	if (!session?.user?.email)
		return {
			ok: false as const,
			response: crmErrorResponse('No autorizado', 401),
		}
	const user = await getCurrentUserByEmail(session.user.email)
	if (user?.role?.code !== UserRole.ADMIN)
		return {
			ok: false as const,
			response: crmErrorResponse(
				'Solo administradores pueden gestionar capturas',
				403
			),
		}
	return { ok: true as const }
}
