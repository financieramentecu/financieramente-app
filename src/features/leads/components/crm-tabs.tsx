'use client'

import { LeadsBoard } from '@/features/leads/components/leads-board'
import { CRM_TABS, DEFAULT_CRM_TAB } from '@/features/leads/lib/crm-tabs'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/features/shared/ui/tabs'

export function CrmTabs() {
	return (
		<Tabs defaultValue={DEFAULT_CRM_TAB} className="space-y-4">
			<TabsList>
				{CRM_TABS.map((tab) => (
					<TabsTrigger key={tab.id} value={tab.id} disabled={!tab.enabled}>
						{tab.label}
						{!tab.enabled && (
							<span className="ml-1 text-xs text-muted-foreground">
								Próximamente
							</span>
						)}
					</TabsTrigger>
				))}
			</TabsList>
			<TabsContent value="pipeline">
				<LeadsBoard />
			</TabsContent>
		</Tabs>
	)
}
