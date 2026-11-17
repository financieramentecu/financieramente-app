import { auth } from '@/auth'
import { roleCan } from '@/features/access-control/services/role-permission-check'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

export async function requireSystemAdmin() {
	const session = await auth()
	if (!session?.user?.email) {
		return { ok: false as const, status: 401 as const, error: 'No autorizado' }
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (
		!currentUser ||
		!(await roleCan(session.user.role, 'configuracion.tipos_documento')) ||
		!(await roleCan(currentUser?.role?.code, 'configuracion.tipos_documento'))
	) {
		return {
			ok: false as const,
			status: 403 as const,
			error: 'Solo el Administrador del Sistema puede acceder a Tipos de Documento',
		}
	}

	return { ok: true as const, session, currentUser }
}
