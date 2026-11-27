'use client'

import { useSession } from 'next-auth/react'
import { usePermissions } from '@/features/shared/hooks/use-permissions'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { LeadCapturesAdmin } from '@/features/leads/captures/lead-captures-admin'

export default function LeadCapturesPage() {
	const { status } = useSession()
	const { can } = usePermissions()
	return (
		<DashboardLayout currentPage="Capturas">
			{status === 'loading' ? (
				<p role="status">Cargando…</p>
			) : can('leads.gestionar_capturas') ? (
				<LeadCapturesAdmin />
			) : (
				<p role="alert">Solo administradores pueden gestionar capturas.</p>
			)}
		</DashboardLayout>
	)
}
