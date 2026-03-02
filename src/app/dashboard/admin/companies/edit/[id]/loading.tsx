import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditCompanyFormSkeleton } from '@/features/company/components/company-form-skeleton'

/**
 * Loading state for the edit company page
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Editar Empresa">
			<EditCompanyFormSkeleton />
		</DashboardLayout>
	)
}
