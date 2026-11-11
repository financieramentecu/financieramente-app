import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Mail, Phone, IdCard, Tag, Trash2 } from 'lucide-react'
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
	SheetFooter,
} from '@/features/shared/ui/sheet'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { Separator } from '@/features/shared/ui/separator'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/features/shared/ui/alert-dialog'
import {
	LEAD_OUTCOME_STATUS_LABELS,
	LEAD_OUTCOME_STATUS_BADGE_VARIANTS,
} from '@/features/leads/lib/lead-outcome-status'
import { LeadOwnerAvatar } from '@/features/leads/components/lead-owner-avatar'
import { canDeleteLead } from '@/features/leads/lib/can-delete-lead'
import { useDeleteLead } from '@/features/leads/hooks/use-delete-lead'
import { LeadActivityTimeline } from '@/features/leads/activities/lead-activity-timeline'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@/features/shared/ui/tabs'
import { InactivityBadge } from '@/features/leads/components/inactivity-badge'
import { LeadTaskList } from '@/features/leads/tasks/lead-task-list'
import { LeadCrmFieldsSection } from '@/features/leads/custom-fields/lead-crm-fields-section'
import { LeadSupportCaseList } from '@/features/leads/cases/lead-support-case-list'
import type { LeadDetail } from '@/features/leads/types/lead.types'

const LEAD_SHEET_PANEL = {
	DETAIL: 'detail',
	HISTORY: 'history',
} as const

type LeadSheetPanel = (typeof LEAD_SHEET_PANEL)[keyof typeof LEAD_SHEET_PANEL]

const WORK_TAB = {
	TASKS: 'tasks',
	CASES: 'cases',
} as const

type WorkTab = (typeof WORK_TAB)[keyof typeof WORK_TAB]

const SHEET_TAB_CLASS = 'h-8 min-w-0 whitespace-normal px-2 text-xs'

function isLeadSheetPanel(value: string): value is LeadSheetPanel {
	return value === LEAD_SHEET_PANEL.DETAIL || value === LEAD_SHEET_PANEL.HISTORY
}

function isWorkTab(value: string): value is WorkTab {
	return value === WORK_TAB.TASKS || value === WORK_TAB.CASES
}

interface LeadDetailSheetProps {
	lead: LeadDetail | null
	open: boolean
	onOpenChange: (open: boolean) => void
	isAdmin?: boolean
	onDeleted?: () => void
	timelineEnabled?: boolean
	tasksEnabled?: boolean
	/** `crm_lead_fields`: value, probability, tags and custom fields. */
	crmFieldsEnabled?: boolean
	/** CRM mutation right (`canManageCrm`); read-only otherwise. */
	canManageCrm?: boolean
	conversionAuditEnabled?: boolean
	casesEnabled?: boolean
}

/**
 * Read-only lead detail. "Ver en CRM" only renders when `externalUrl` is
 * present and non-empty. "Convertir a negocio" links to the existing
 * business-creation form (`?leadId=`); it becomes "Ver negocio" once the
 * lead is already linked to a `Business` (`idBusiness != null`). A lead
 * with no owner (`idUser == null`) cannot be converted — the button is
 * disabled with an explanatory caption instead of navigating.
 */
export function LeadDetailSheet({
	lead,
	open,
	onOpenChange,
	isAdmin = false,
	onDeleted,
	timelineEnabled = false,
	tasksEnabled = false,
	crmFieldsEnabled = false,
	canManageCrm = false,
	conversionAuditEnabled = false,
	casesEnabled = false,
}: LeadDetailSheetProps) {
	const { state: deleteState, deleteLead } = useDeleteLead()
	const [panel, setPanel] = useState<LeadSheetPanel>(LEAD_SHEET_PANEL.DETAIL)

	useEffect(() => {
		setPanel(LEAD_SHEET_PANEL.DETAIL)
	}, [lead?.idLead])

	useEffect(() => {
		if (deleteState.status === 'success') {
			onDeleted?.()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [deleteState.status])

	if (!lead) return null

	const fullName =
		[lead.name, lead.lastName].filter(Boolean).join(' ') || 'Sin nombre'
	const hasExternalUrl = Boolean(
		lead.externalUrl && lead.externalUrl.trim() !== ''
	)
	// GHL stays the source of truth during the CRM migration: synced fields are read-only here
	const isGhlManaged = Boolean(
		lead.externalCrmId && lead.externalCrmId.trim() !== ''
	)
	const isConverted = lead.idBusiness != null
	const hasOwner = lead.idUser != null
	const canDelete = isAdmin && canDeleteLead(lead)

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="gap-0 overflow-hidden sm:max-w-md">
				<SheetHeader className="pb-3">
					<div className="flex items-start justify-between gap-2">
						<SheetTitle className="flex min-w-0 flex-wrap items-center gap-2 text-lg">
							{fullName}
							<Badge
								variant={LEAD_OUTCOME_STATUS_BADGE_VARIANTS[lead.outcomeStatus]}
							>
								{LEAD_OUTCOME_STATUS_LABELS[lead.outcomeStatus]}
							</Badge>
							{isGhlManaged && (
								<Badge
									variant="outline"
									title="Los datos de este lead se gestionan en GoHighLevel y no se pueden editar aquí"
								>
									Gestionado en GHL
								</Badge>
							)}
							<InactivityBadge days={lead.inactiveDays} />
						</SheetTitle>
						{lead.ownerName && (
							<div className="mr-8 flex shrink-0 flex-col items-end gap-1">
								<LeadOwnerAvatar name={lead.ownerName} size="md" />
								<span className="text-xs text-slate-600 dark:text-slate-300">
									{lead.ownerName}
								</span>
							</div>
						)}
					</div>
					<SheetDescription>Detalle del lead</SheetDescription>
				</SheetHeader>
				<Separator />
				<Tabs
					value={panel}
					onValueChange={(value) => {
						if (isLeadSheetPanel(value)) setPanel(value)
					}}
					className="flex min-h-0 flex-1 flex-col"
				>
					<div className="min-w-0 px-4 pt-3">
						<TabsList className="grid h-auto w-full max-w-full grid-cols-2">
							<TabsTrigger value={LEAD_SHEET_PANEL.DETAIL} className={SHEET_TAB_CLASS}>
								Detalle
							</TabsTrigger>
							<TabsTrigger value={LEAD_SHEET_PANEL.HISTORY} className={SHEET_TAB_CLASS}>
								Historial
							</TabsTrigger>
						</TabsList>
					</div>
					<TabsContent
						value={LEAD_SHEET_PANEL.DETAIL}
						className="mt-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
					>
						{lead.email && (
							<div className="flex items-center gap-2 text-sm text-foreground">
								<Mail
									className="size-4 shrink-0 text-slate-500 dark:text-slate-400"
									aria-hidden
								/>
								<span className="truncate">{lead.email}</span>
							</div>
						)}
						{lead.phone && (
							<div className="flex items-center gap-2 text-sm text-foreground">
								<Phone
									className="size-4 shrink-0 text-slate-500 dark:text-slate-400"
									aria-hidden
								/>
								<span>{lead.phone}</span>
							</div>
						)}
						{lead.identityNumber && (
							<div className="flex items-center gap-2 text-sm text-foreground">
								<IdCard
									className="size-4 shrink-0 text-slate-500 dark:text-slate-400"
									aria-hidden
								/>
								<span>{lead.identityNumber}</span>
							</div>
						)}
						{lead.originTag && (
							<div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
								<Tag
									className="size-4 shrink-0 text-slate-500 dark:text-slate-400"
									aria-hidden
								/>
								<span className="truncate">{lead.originTag}</span>
							</div>
						)}
						{conversionAuditEnabled && isConverted && (
							<div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
								<p className="font-medium">Conversión auditada</p>
								<Link
									href={`/dashboard/negocios/${lead.idBusiness}?crmAudit=1`}
									className="text-primary underline-offset-4 hover:underline"
								>
									Ver auditoría de conversión
								</Link>
							</div>
						)}
						{crmFieldsEnabled && (
							<>
								<Separator />
								<LeadCrmFieldsSection
									key={lead.idLead}
									idLead={lead.idLead}
									initialTags={lead.tags}
									canEdit={canManageCrm}
								/>
							</>
						)}
						{(tasksEnabled || casesEnabled) && (
							<LeadWorkTabs
								leadId={lead.idLead}
								assigneeId={lead.idUser}
								open={open}
								tasksEnabled={tasksEnabled}
								casesEnabled={casesEnabled}
							/>
						)}
						{!lead.email &&
							!lead.phone &&
							!lead.identityNumber &&
							!lead.originTag && (
								<p className="text-sm text-slate-500 dark:text-slate-400">
									Este lead no tiene datos de contacto adicionales.
								</p>
							)}
					</TabsContent>
					<TabsContent
						value={LEAD_SHEET_PANEL.HISTORY}
						className="mt-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
					>
						{timelineEnabled ? (
							<LeadActivityTimeline
								leadId={lead.idLead}
								enabled={open && panel === LEAD_SHEET_PANEL.HISTORY}
							/>
						) : (
							<p className="text-sm text-muted-foreground">
								La línea de tiempo de este lead no está disponible.
							</p>
						)}
					</TabsContent>
				</Tabs>
				<SheetFooter className="flex-col gap-2 border-t border-border pt-4">
					{isConverted ? (
						<Button asChild className="w-full">
							<Link href={`/dashboard/negocios/${lead.idBusiness}`}>
								Ver negocio
							</Link>
						</Button>
					) : hasOwner ? (
						<Button asChild className="w-full">
							<Link href={`/dashboard/negocios/crear?leadId=${lead.idLead}`}>
								Convertir a negocio
							</Link>
						</Button>
					) : (
						<div className="space-y-1">
							<Button disabled className="w-full">
								Convertir a negocio
							</Button>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Asigna un owner al lead antes de convertirlo a negocio.
							</p>
						</div>
					)}
					{hasExternalUrl && (
						<Button asChild variant="outline" className="w-full">
							<a href={lead.externalUrl!} target="_blank" rel="noreferrer">
								Ver en CRM
								<ExternalLink className="size-3.5" aria-hidden />
							</a>
						</Button>
					)}
					{canDelete && (
						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" className="w-full">
									<Trash2 className="size-3.5" aria-hidden />
									Eliminar lead
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>¿Eliminar este lead?</AlertDialogTitle>
									<AlertDialogDescription>
										Esta acción oculta el lead del tablero. Un futuro resync del
										CRM puede restaurarlo.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancelar</AlertDialogCancel>
									<AlertDialogAction onClick={() => deleteLead(lead.idLead)}>
										Confirmar
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
				</SheetFooter>
			</SheetContent>
		</Sheet>
	)
}

/** Tasks and cases live inside Detalle, after the CRM fields. */
function LeadWorkTabs({
	leadId,
	assigneeId,
	open,
	tasksEnabled,
	casesEnabled,
}: {
	leadId: number
	assigneeId: number | null
	open: boolean
	tasksEnabled: boolean
	casesEnabled: boolean
}) {
	const defaultTab = tasksEnabled ? WORK_TAB.TASKS : WORK_TAB.CASES
	const [workTab, setWorkTab] = useState<WorkTab>(defaultTab)

	useEffect(() => {
		setWorkTab(defaultTab)
	}, [leadId, defaultTab])

	const active = workTab === WORK_TAB.CASES && casesEnabled ? WORK_TAB.CASES : defaultTab
	const columns = tasksEnabled && casesEnabled ? 'grid-cols-2' : 'grid-cols-1'

	return (
		<div className="space-y-3">
			<Separator />
			<Tabs
				value={active}
				onValueChange={(value) => {
					if (isWorkTab(value)) setWorkTab(value)
				}}
			>
				<TabsList className={`grid h-auto w-full ${columns}`}>
					{tasksEnabled && (
						<TabsTrigger value={WORK_TAB.TASKS} className={SHEET_TAB_CLASS}>
							Tareas
						</TabsTrigger>
					)}
					{casesEnabled && (
						<TabsTrigger value={WORK_TAB.CASES} className={SHEET_TAB_CLASS}>
							Casos
						</TabsTrigger>
					)}
				</TabsList>
				{tasksEnabled && (
					<TabsContent value={WORK_TAB.TASKS} forceMount hidden={active !== WORK_TAB.TASKS} className="mt-3">
						<LeadTaskList leadId={leadId} assigneeId={assigneeId} enabled={open} />
					</TabsContent>
				)}
				{casesEnabled && (
					<TabsContent value={WORK_TAB.CASES} forceMount hidden={active !== WORK_TAB.CASES} className="mt-3">
						<LeadSupportCaseList leadId={leadId} enabled={open} />
					</TabsContent>
				)}
			</Tabs>
		</div>
	)
}
