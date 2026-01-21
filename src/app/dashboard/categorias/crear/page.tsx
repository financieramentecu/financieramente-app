import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CategoryCreateClient } from './category-create-client'

/**
 * Create Category Page (Server Component)
 */
export default async function CreateCategoryPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Nueva Categoría">
			<CategoryCreateClient />
		</DashboardLayout>
	)
}
