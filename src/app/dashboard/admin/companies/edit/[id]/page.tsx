import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CompanyEditClient } from './company-edit-client'
import { notFound } from 'next/navigation'

interface EditCompanyPageProps {
	params: Promise<{ id: string }>
}

/**
 * Edit Company Page (Server Component)
 */
export default async function EditCompanyPage({
	params,
}: EditCompanyPageProps) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	const { id } = await params
	const companyId = parseInt(id)

	if (Number.isNaN(companyId)) {
		notFound()
	}

	return (
		<DashboardLayout currentPage="Editar Empresa">
			<CompanyEditClient id={companyId} />
		</DashboardLayout>
	)
}
