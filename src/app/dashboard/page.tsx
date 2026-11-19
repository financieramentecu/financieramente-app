import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { DashboardShell } from '@/features/production-dashboard/components/DashboardShell'

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

	return (
		<DashboardLayout currentPage="Dashboard de Producción" disableScroll>
			<DashboardShell />
		</DashboardLayout>
	)
}
