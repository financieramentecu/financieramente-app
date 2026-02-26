import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditClientOriginFormSkeleton } from '@/features/origins/components/client-origin-form-skeleton'

/**
 * Loading state para la página de edición de origen de cliente
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Editar Origen de Cliente">
			<EditClientOriginFormSkeleton />
		</DashboardLayout>
	)
}
