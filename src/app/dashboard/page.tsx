import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { UserRole } from '@/features/auth/lib/roles'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { HierarchyTreePanel } from '@/features/production-dashboard/components/HierarchyTreePanel'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'

/**
 * Production Dashboard Shell (Server Component)
 *
 * Renders the Production Dashboard with:
 * - Left column: HierarchyTreePanel (hidden for MS Junior via empty-nodes guard)
 * - Right column: KPIs and filters placeholder (future slice)
 *
 * Auth:
 * - No session → redirects to /login
 * - DEFAULT role → redirects to /access-denied
 *
 * Feature flag:
 * - production_dashboard disabled → redirects to /access-denied?reason=feature_disabled
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
			<div className="flex flex-1 min-h-0 overflow-hidden">
				{/* Left — Hierarchy tree panel */}
				<aside className="w-72 shrink-0 overflow-hidden flex flex-col" style={{ borderRight: '1px solid rgba(0,60,69,0.15)' }}>
					<HierarchyTreePanel />
				</aside>

				{/* Right — KPIs, filters (future slice) */}
				<main className="flex-1 overflow-y-auto p-6">
					<div className="flex h-full items-center justify-center">
						<p className="text-sm text-muted-foreground">
							Selecciona usuarios en el árbol para ver su producción
						</p>
					</div>
				</main>
			</div>
		</DashboardLayout>
	)
}
