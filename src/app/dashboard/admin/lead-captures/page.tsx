'use client'

import { useSession } from 'next-auth/react'
import { UserRole } from '@/features/auth/lib/roles'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { LeadCapturesAdmin } from '@/features/leads/captures/lead-captures-admin'

export default function LeadCapturesPage() {
	const { data: session, status } = useSession()
	return (
		<DashboardLayout currentPage="Capturas">
			{status === 'loading' ? (
				<p role="status">Cargando…</p>
			) : session?.user?.role === UserRole.ADMIN ? (
				<LeadCapturesAdmin />
			) : (
				<p role="alert">Solo administradores pueden gestionar capturas.</p>
			)}
		</DashboardLayout>
	)
}
