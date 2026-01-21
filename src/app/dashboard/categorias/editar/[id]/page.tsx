import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CategoryEditClient } from './category-edit-client'
import { notFound } from 'next/navigation'

interface EditCategoryPageProps {
	params: Promise<{ id: string }>
}

/**
 * Edit Category Page (Server Component)
 */
export default async function EditCategoryPage({
	params,
}: EditCategoryPageProps) {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	const { id } = await params
	const categoryId = parseInt(id)

	if (Number.isNaN(categoryId)) {
		notFound()
	}

	return (
		<DashboardLayout currentPage="Editar Categoría">
			<CategoryEditClient id={categoryId} />
		</DashboardLayout>
	)
}
