import { Suspense, type ReactNode } from 'react'
import { DashboardSessionGate } from '@/features/auth/components/dashboard-session-gate'
import { DashboardLoadingSkeleton } from '@/features/shared/layout/DashboardLoadingSkeleton'

/**
 * Server session guard for every /dashboard page (D2, SEC-01), see
 * `DashboardSessionGate`.
 *
 * This layout renders NO UI of its own besides the loading skeleton: each
 * page keeps wrapping itself in `DashboardLayout`, so nothing is
 * double-wrapped.
 */
export default function DashboardRootLayout({
	children,
}: Readonly<{ children: ReactNode }>) {
	return (
		<Suspense fallback={<DashboardLoadingSkeleton />}>
			<DashboardSessionGate>{children}</DashboardSessionGate>
		</Suspense>
	)
}
