import { auth } from '@/auth'
import { notFound, redirect } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditBusinessFormContainer } from '@/features/negocios/components/containers/EditBusinessFormContainer'
import { prismaBusinessToEntity } from '@/features/negocios/mappers/business-entity.mapper'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getCompanies } from '@/features/company/services/company.service'
import { getProducts } from '@/features/product/services/product.service'
import { getBusinessById } from '@/features/negocios/services/business-get-by-id.server'
import { getPeriodicities } from '@/features/admin/periodicities/services/periodicity.service'
import { getCurrencies } from '@/features/admin/currencies/services/currency.service'
import { getClientOrigins } from '@/features/origins/services/origins.service'

// Cache de opciones del formulario
const getCompaniesCached = unstable_cache(getCompanies, ['companies'], {
	revalidate: 300,
})
const getProductsCached = unstable_cache(getProducts, ['products'], {
	revalidate: 300,
})
const getPeriodicitiesCached = unstable_cache(
	getPeriodicities,
	['periodicities'],
	{ revalidate: 300 }
)
const getCurrenciesCached = unstable_cache(getCurrencies, ['currencies'], {
	revalidate: 300,
})
const getClientOriginsCached = unstable_cache(
	getClientOrigins,
	['clientOrigins'],
	{ revalidate: 300 }
)

interface PageProps {
	params: Promise<{ id: string }>
}

/**
 * Página de edición de negocio (Server Component)
 *
 * Carga el negocio desde la base de datos y renderiza el formulario de edición
 */
export default async function EditarNegocioPage({ params }: PageProps) {
	const { id } = await params
	const session = await auth()

	if (!session?.user?.email) {
		redirect('/login')
	}

	const businessId = parseInt(id, 10)

	if (isNaN(businessId)) {
		notFound()
	}

	// Cargar datos en paralelo
	const [
		currentUser,
		companies,
		products,
		periodicities,
		currencies,
		clientOrigins,
	] = await Promise.all([
		getCurrentUserByEmail(session.user.email),
		getCompaniesCached(),
		getProductsCached(),
		getPeriodicitiesCached(),
		getCurrenciesCached(),
		getClientOriginsCached(),
	])

	if (!currentUser) {
		redirect('/login')
	}

	// Obtener negocio con relaciones a través del servicio
	const prismaBusiness = await getBusinessById(businessId, currentUser)

	if (!prismaBusiness) {
		console.log(
			`[EditarNegocio] Negocio no encontrado - ID: ${businessId}, Usuario: ${currentUser.idUser}, Rol: ${currentUser.role?.code}`
		)
		notFound()
	}

	// Transformar a entidad de dominio
	const business = prismaBusinessToEntity(prismaBusiness)

	return (
		<DashboardLayout currentPage="Editar Negocio">
			<EditBusinessFormContainer
				business={business}
				currentUser={currentUser}
				companies={companies}
				products={products}
				periodicities={periodicities}
				currencies={currencies}
				clientOrigins={clientOrigins}
			/>
		</DashboardLayout>
	)
}
