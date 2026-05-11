import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { EditLevelFormSkeleton } from '@/features/levels/components/level-form-skeleton'

/**
 * Loading state for the level edit page
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Editar Nivel (Jerarquía)">
			<EditLevelFormSkeleton />
		</DashboardLayout>
	)
}
