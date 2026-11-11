import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { NegociosPageSkeleton } from '@/features/negocios/components/NegociosPageSkeleton'

/**
 * Loading state for the negocios page: covers the session and user lookups
 * that run before the page can render its own Suspense boundary.
 */
export default function Loading() {
	return (
		<DashboardLayout currentPage="Negocio">
			<NegociosPageSkeleton />
		</DashboardLayout>
	)
}
