import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardSessionGuard } from '@/features/auth/components/dashboard-session-guard'

/**
 * Server session gate for every /dashboard page (D2, SEC-01).
 *
 * The Edge middleware cannot hit the database, so a deactivated user's JWT is
 * still accepted there. `auth()` runs the Node `jwt` callback, which
 * revalidates the user and returns null for inactive or missing users, so this
 * gate ends the page session on the next hard navigation.
 *
 * It is an async child of a Suspense boundary in the dashboard layout, so the
 * layout can stream a skeleton while `auth()` runs. The children are only
 * rendered after the check resolves: they are returned from this component,
 * never before it.
 */
export async function DashboardSessionGate({
	children,
}: Readonly<{ children: ReactNode }>) {
	const session = await auth()

	if (!session?.user) {
		redirect('/login')
	}

	return <DashboardSessionGuard>{children}</DashboardSessionGuard>
}
