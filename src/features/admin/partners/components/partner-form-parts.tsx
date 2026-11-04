'use client'

import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { SelectLoading } from '@/features/shared/ui/select-loading'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/features/shared/ui/select'
import { cn } from '@/lib/utils'
import type { useLeaderPicker } from '../hooks/use-leader-picker'
import { PARTNER_CATEGORY_NAME } from '../lib/partner-reference'

/** Pieces shared by the create and edit partner dialogs. */

export const IDENTITY_OPTIONS = [
	{ value: 'CC', label: 'Cédula de ciudadanía (CC)' },
	{ value: 'CE', label: 'Cédula de extranjería (CE)' },
	{ value: 'NIT', label: 'NIT' },
	{ value: 'PA', label: 'Pasaporte (PA)' },
] as const

export function FieldError({ message }: { message?: string }) {
	if (!message) return null
	return <p className="text-sm text-destructive">{message}</p>
}

/** Locked category: assigned by the server, never editable. */
export function LockedCategoryField({ hint }: { hint: string }) {
	return (
		<div className="space-y-2 md:col-span-2">
			<Label htmlFor="partner-category">Categoría</Label>
			<Input
				id="partner-category"
				value={PARTNER_CATEGORY_NAME}
				disabled
				readOnly
			/>
			<p className="text-xs text-muted-foreground">{hint}</p>
		</div>
	)
}

interface LeaderPickerFieldsProps {
	picker: ReturnType<typeof useLeaderPicker>
	/** Currently selected leader id (undefined until one is picked). */
	leaderId: number | undefined
	errorMessage?: string
	onLevelChange: (levelCode: string) => void
	onLeaderChange: (leaderId: number) => void
}

/** Two-step leader picker: level (LEVEL_1..LEVEL_5) first, then the leader. */
export function LeaderPickerFields({
	picker,
	leaderId,
	errorMessage,
	onLevelChange,
	onLeaderChange,
}: LeaderPickerFieldsProps) {
	const levelOptions =
		picker.levels.status === 'success' ? picker.levels.data : []
	const leaderOptions =
		picker.leaders.status === 'success' ? picker.leaders.data : []

	return (
		<>
			<div className="space-y-2">
				<Label htmlFor="partner-leader-level">Nivel del líder</Label>
				<Select
					value={picker.levelCode ?? ''}
					onValueChange={onLevelChange}
					disabled={picker.levels.status !== 'success'}
				>
					<SelectTrigger id="partner-leader-level">
						<SelectValue placeholder="Seleccionar nivel" />
					</SelectTrigger>
					<SelectContent>
						{levelOptions.map((level) => (
							<SelectItem key={level.code} value={level.code}>
								{level.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{picker.levels.status === 'error' && (
					<FieldError message={picker.levels.error} />
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="partner-leader">
					Líder<span className="text-destructive ml-1">*</span>
				</Label>
				<Select
					value={leaderId ? String(leaderId) : ''}
					onValueChange={(value) => onLeaderChange(Number(value))}
					disabled={
						picker.levelCode === null || picker.leaders.status !== 'success'
					}
				>
					<SelectTrigger
						id="partner-leader"
						className={cn(errorMessage && 'border-destructive')}
					>
						{picker.leaders.status === 'loading' ? (
							<SelectLoading />
						) : (
							<SelectValue placeholder="Seleccionar líder" />
						)}
					</SelectTrigger>
					<SelectContent>
						{leaderOptions.map((leader) => (
							<SelectItem key={leader.id} value={String(leader.id)}>
								{`${leader.name} ${leader.lastName ?? ''}`.trim()}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<FieldError message={errorMessage} />
			</div>
		</>
	)
}
