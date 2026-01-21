import { auth } from '@/auth'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { CategoriesPageClient } from './categories-page-client'

/**
 * Categories List Page (Server Component)
 */
export default async function CategoriesPage() {
	const session = await auth()

	if (!session?.user) {
		return null
	}

	return (
		<DashboardLayout currentPage="Categorías">
			<CategoriesPageClient />
		</DashboardLayout>
	)
}
