import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

export async function requireSystemAdmin() {
	const session = await auth()
	if (!session?.user?.email) {
		return { ok: false as const, status: 401 as const, error: 'No autorizado' }
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (
		session.user.role !== UserRole.ADMIN ||
		currentUser?.role?.code !== UserRole.ADMIN
	) {
		return {
			ok: false as const,
			status: 403 as const,
			error: 'Solo el Administrador del Sistema puede acceder a Tipos de Documento',
		}
	}

	return { ok: true as const, session, currentUser }
}
