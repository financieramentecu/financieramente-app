import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditEmpresaFormSkeleton } from '@/features/empresas/components/empresa-form-skeleton'

/**
 * Loading state para la página de edición de empresa
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Editar Empresa">
			<EditEmpresaFormSkeleton />
		</DashboardLayout>
	)
}

