import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { DashboardSessionGuard } from '@/features/auth/components/dashboard-session-guard'

/**
 * Server session guard for every /dashboard page (D2, SEC-01).
 *
 * The Edge middleware cannot hit the database, so a deactivated user's JWT is
 * still accepted there. `auth()` runs the Node `jwt` callback, which
 * revalidates the user and returns null for inactive or missing users, so this
 * layout ends the page session on the next hard navigation.
 *
 * This layout renders NO UI: each page keeps wrapping itself in
 * `DashboardLayout`, so nothing is double-wrapped.
 */
export default async function DashboardRootLayout({
	children,
}: Readonly<{ children: ReactNode }>) {
	const session = await auth()

	if (!session?.user) {
		redirect('/login')
	}

	return <DashboardSessionGuard>{children}</DashboardSessionGuard>
}
