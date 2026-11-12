'use client'

import { useSession } from 'next-auth/react'
import { UserRole } from '@/features/auth/lib/roles'
import { canManageCrm } from '@/features/leads/crm/crm-policy'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import type { ActivityFocus } from '@/features/leads/agenda/agenda.types'
import type { LeadDetail } from '@/features/leads/types/lead.types'

/** Lead detail sheet wired to the viewer's CRM feature flags. */
export function CrmLeadDetailSheet({
	lead,
	open,
	onOpenChange,
	onDeleted,
	activityFocus = null,
	onActivityChanged,
	previewName = null,
	loadError = null,
}: {
	lead: LeadDetail | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onDeleted?: () => void
	activityFocus?: ActivityFocus | null
	onActivityChanged?: () => void
	previewName?: string | null
	loadError?: string | null
}) {
	const { data: session } = useSession()
	const { enabled: timelineEnabled } = useFeatureFlag('crm_timeline')
	const { enabled: tasksEnabled } = useFeatureFlag('crm_tasks')
	const { enabled: conversionAuditEnabled } = useFeatureFlag('crm_conversion_audit')
	const { enabled: casesEnabled } = useFeatureFlag('crm_cases')
	const { enabled: crmFieldsEnabled } = useFeatureFlag('crm_lead_fields')

	return (
		<LeadDetailSheet
			lead={lead}
			open={open}
			onOpenChange={onOpenChange}
			isAdmin={session?.user?.role === UserRole.ADMIN}
			onDeleted={onDeleted}
			timelineEnabled={timelineEnabled}
			tasksEnabled={tasksEnabled}
			conversionAuditEnabled={conversionAuditEnabled}
			casesEnabled={casesEnabled}
			crmFieldsEnabled={crmFieldsEnabled}
			canManageCrm={canManageCrm(session?.user?.role)}
			activityFocus={activityFocus}
			onActivityChanged={onActivityChanged}
			previewName={previewName}
			loadError={loadError}
		/>
	)
}
