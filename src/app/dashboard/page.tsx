import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { DashboardShell } from '@/features/production-dashboard/components/DashboardShell'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'

/**
 * Production Dashboard Shell (Server Component)
 *
 * Renders the Production Dashboard with:
 * - Left column: HierarchyTreePanel (hidden for MS Junior via empty-nodes guard)
 * - Right column: DashboardFilterPanel + KPIs (future slice)
 *
 * Auth:
 * - No session → redirects to /login
 * - DEFAULT role → redirects to /access-denied
 *
 * Feature flag:
 * - production_dashboard disabled → redirects to /access-denied?reason=feature_disabled
 *
 * Context hierarchy (client-side, in DashboardShell):
 *   HierarchySelectionProvider > DashboardFilterProvider > children
 */
export default async function DashboardPage() {
	const session = await auth()

	if (!session?.user) {
		redirect('/login')
	}

	if (session.user.role === UserRole.DEFAULT) {
		redirect('/access-denied?reason=default_role')
	}

	const isDashboardEnabled = await isFeatureEnabledServer(
		'production_dashboard',
		session.user.email
	)
	if (!isDashboardEnabled) {
		redirect('/dashboard/negocios')
	}

	return (
		<DashboardLayout currentPage="Dashboard de Producción" disableScroll>
			<DashboardShell />
		</DashboardLayout>
	)
}
