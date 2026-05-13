import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { NegociosPageClient } from './negocios-page-client'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

/**
 * Página de Negocios (Server Component)
 *
 * Obtiene la sesión del usuario y pasa los datos al componente cliente
 */
export default async function NegociosPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	// Obtener información completa del usuario desde la base de datos
	const currentUser = await getCurrentUserByEmail(session.user.email)

	return (
		<DashboardLayout currentPage="Negocio" disableScroll={true}>
			<NegociosPageClient currentUser={currentUser ?? undefined} />
		</DashboardLayout>
	)
}
