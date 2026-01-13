import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditProductFormSkeleton } from '@/features/product/components/product-form-skeleton'

/**
 * Loading state para la página de edición de producto
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Editar Producto">
			<EditProductFormSkeleton />
		</DashboardLayout>
	)
}
