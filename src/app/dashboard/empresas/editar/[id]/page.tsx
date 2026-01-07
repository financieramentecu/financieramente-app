import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EmpresaEditClient } from './empresa-edit-client'
import { notFound } from 'next/navigation'

interface EditEmpresaPageProps {
	params: Promise<{ id: string }>
}

/**
 * Página de Edición de Empresa (Server Component)
 */
export default async function EditEmpresaPage({
	params,
}: EditEmpresaPageProps) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	const { id } = await params
	const empresaId = parseInt(id)

	if (Number.isNaN(empresaId)) {
		notFound()
	}

	return (
		<DashboardLayout currentPage="Editar Empresa">
			<EmpresaEditClient id={empresaId} />
		</DashboardLayout>
	)
}
