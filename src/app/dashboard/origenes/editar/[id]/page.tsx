import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { OriginEditClient } from './origin-edit-client'
import { notFound } from 'next/navigation'

interface EditOriginPageProps {
	params: Promise<{ id: string }>
}

/**
 * Página de Edición de Origen de Cliente (Server Component)
 */
export default async function EditOriginPage({
	params,
}: EditOriginPageProps) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	const { id } = await params
	const originId = parseInt(id)

	if (Number.isNaN(originId)) {
		notFound()
	}

	return (
		<DashboardLayout currentPage="Editar Origen de Cliente">
			<OriginEditClient id={originId} />
		</DashboardLayout>
	)
}

