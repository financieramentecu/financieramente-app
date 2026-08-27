import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { isReadOnlyRole } from '@/features/auth/lib/roles'
import { canViewReport } from '@/features/report-permissions/services/report-permissions.service'
import { REPORT_CODES } from '@/features/report-permissions/types/report-permissions.types'
import { ProduccionRealShell } from '@/features/reports/produccion-real/components/produccion-real-shell'
import { PRODUCCION_REAL_UI } from '@/features/reports/produccion-real/lib/ui-copy'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'

/**
 * Producción Real report page.
 * Server auth gate via canViewReport(PRODUCCION_REAL); unauthorized → access-denied.
 */
export default async function ProduccionRealPage() {
	const session = await auth()

	if (!session?.user?.email) {
		redirect('/login')
	}

	const isEnabled = await isFeatureEnabledServer(
		'reportes_produccion_real',
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
		REPORT_CODES.PRODUCCION_REAL
	)

	if (!allowed) {
		redirect('/access-denied?reason=no_permissions')
	}

	const canExport = !isReadOnlyRole(currentUser.role?.code)

	return (
		<DashboardLayout currentPage={PRODUCCION_REAL_UI.PAGE_TITLE} disableScroll>
			<div className="flex h-full min-h-0 flex-col">
				<ProduccionRealShell canExport={canExport} />
			</div>
		</DashboardLayout>
	)
}
