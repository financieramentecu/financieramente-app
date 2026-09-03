import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import { AbaMfundShell } from '@/features/reports/aba-mfund/components/aba-mfund-shell'
import { ABA_MFUND_UI } from '@/features/reports/aba-mfund/lib/ui-copy'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'

/**
 * ABA-MFUND report page.
 * Server auth gate via canViewReport(ABA_MFUND); unauthorized → access-denied.
 */
export default async function AbaMfundPage() {
	const session = await auth()

	if (!session?.user?.email) {
		redirect('/login')
	}

	const isEnabled = await isFeatureEnabledServer(
		'reportes_aba_mfund',
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
		REPORT_CODES.ABA_MFUND
	)

	if (!allowed) {
		redirect('/access-denied?reason=no_permissions')
	}

	return (
		<DashboardLayout currentPage={ABA_MFUND_UI.PAGE_TITLE} disableScroll>
			<div className="flex h-full min-h-0 flex-col">
				<AbaMfundShell />
			</div>
		</DashboardLayout>
	)
}
