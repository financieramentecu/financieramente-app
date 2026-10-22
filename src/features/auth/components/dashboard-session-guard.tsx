'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface DashboardSessionGuardProps {
	children: ReactNode
}

/**
 * Client-side complement of the server dashboard layout guard (D2).
 *
 * When the session ends while a dashboard page is open (user deactivated,
 * session revoked by the per-request revalidation), the next session refetch
 * turns `unauthenticated` and the user is sent to the login page. Renders the
 * children untouched: it adds no UI.
 */
export function DashboardSessionGuard({
	children,
}: DashboardSessionGuardProps) {
	const { status } = useSession()
	const router = useRouter()

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.replace('/login')
		}
	}, [status, router])

	return <>{children}</>
}
