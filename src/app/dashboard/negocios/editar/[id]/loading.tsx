import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditBusinessFormSkeleton } from '@/features/negocios/components/containers/EditBusinessFormContainer'

/**
 * Loading state para la página de edición de negocio
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Editar Negocio">
			<EditBusinessFormSkeleton />
		</DashboardLayout>
	)
}
