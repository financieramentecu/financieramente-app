import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import { LeadsAnalyticsShell } from '@/features/reports/leads-analytics/components/leads-analytics-shell'
import { LEADS_ANALYTICS_UI } from '@/features/reports/leads-analytics/lib/ui-copy'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'

/**
 * Leads Analytics report page.
 * Server auth gate via canViewReport(LEADS_ANALYTICS); unauthorized → access-denied.
 */
export default async function LeadsAnalyticsPage() {
	const session = await auth()

	if (!session?.user?.email) {
		redirect('/login')
	}

	const isEnabled = await isFeatureEnabledServer(
		'reportes_leads_analytics',
		session.user.email
	)
	if (!isEnabled) {
		redirect('/access-denied?reason=feature_disabled')
	}

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (!currentUser) {
		redirect('/login')
	}

	const allowed = await canViewReport(
		{
			roleCode: currentUser.role?.code ?? session.user.role,
			idCategory: currentUser.idCategory,
		},
		REPORT_CODES.LEADS_ANALYTICS
	)

	if (!allowed) {
		redirect('/access-denied?reason=no_permissions')
	}

	return (
		<DashboardLayout currentPage={LEADS_ANALYTICS_UI.PAGE_TITLE} disableScroll>
			<div className="flex h-full min-h-0 flex-col">
				<LeadsAnalyticsShell />
			</div>
		</DashboardLayout>
	)
}
