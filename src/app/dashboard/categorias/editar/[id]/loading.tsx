import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditCategoryFormSkeleton } from '@/features/categories/components/category-form-skeleton'

/**
 * Loading state for the category edit page
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Editar Categoría">
			<EditCategoryFormSkeleton />
		</DashboardLayout>
	)
}
