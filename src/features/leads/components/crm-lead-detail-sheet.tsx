'use client'

import { useSession } from 'next-auth/react'
import { UserRole } from '@/features/auth/lib/roles'
import { useFeatureFlag } from '@/features/shared/hooks/use-feature-flag'
import { LeadDetailSheet } from '@/features/leads/components/lead-detail-sheet'
import type { LeadDetail } from '@/features/leads/types/lead.types'

/** Lead detail sheet wired to the viewer's CRM feature flags. */
export function CrmLeadDetailSheet({
	lead,
	open,
	onOpenChange,
	onDeleted,
}: {
	lead: LeadDetail | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onDeleted?: () => void
}) {
	const { data: session } = useSession()
	const { enabled: timelineEnabled } = useFeatureFlag('crm_timeline')
	const { enabled: tasksEnabled } = useFeatureFlag('crm_tasks')
	const { enabled: conversionAuditEnabled } = useFeatureFlag('crm_conversion_audit')
	const { enabled: casesEnabled } = useFeatureFlag('crm_cases')

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
		/>
	)
}
