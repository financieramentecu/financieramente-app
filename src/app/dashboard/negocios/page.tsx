import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { NegociosPageClient } from './negocios-page-client'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'

/**
 * Página de Negocios (Server Component)
 *
 * Obtiene la sesión del usuario y pasa los datos al componente cliente.
 * searchParams se pasa al cliente para inicializar con los filtros de URL.
 */
export default async function NegociosPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	// Obtener información completa del usuario desde la base de datos
	const currentUser = await getCurrentUserByEmail(session.user.email)

	// Await searchParams (Next.js 15: searchParams is a Promise in server components)
	const resolvedSearchParams = searchParams ? await searchParams : {}

	return (
		<DashboardLayout currentPage="Negocio">
			<NegociosPageClient
				currentUser={currentUser ?? undefined}
				initialSearchParams={resolvedSearchParams}
			/>
		</DashboardLayout>
	)
}
