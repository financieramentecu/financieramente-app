'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { GripVertical } from 'lucide-react'
import type { LeadFunnelColumn } from '@prisma/client'
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from '@dnd-kit/core'
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/features/shared/ui/card'
import { ConfirmActionDialog } from '@/features/shared/ui/confirm-action-dialog'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/features/shared/ui/dialog'
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from '@/features/shared/ui/table'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { reorderFunnelColumns } from '@/features/leads/lib/reorder-funnel-columns'

interface FunnelColumnsAdminTableProps {
	initialColumns: LeadFunnelColumn[]
}

const EXTERNAL_STATUS_KEY_LABEL = 'Clave de estado (contrato del webhook)'
const EXTERNAL_STATUS_KEY_HELP_TEXT =
	'Vos decidís el valor libremente. Compartíselo a quien configure el webhook del CRM/n8n para que lo use exactamente así en el campo statusKey del payload que nos envían.'
const EXTERNAL_STATUS_KEY_IMMUTABLE_NOTE =
	'No se puede modificar después de creada. Si necesitás otro valor, creá una columna nueva.'

/**
 * Live keystroke-time transform: uppercase + spaces→underscore, no trim.
 * Trimming live would eat a trailing space the instant it's typed, making it
 * impossible to type a second word — the full `normalizeFunnelStatusKey`
 * (which does trim) is applied server-side as the canonical stored value.
 */
function liveUppercaseStatusKey(value: string): string {
	return value.toUpperCase().replace(/\s+/g, '_')
}

async function patchColumn(
	idLeadFunnelColumn: number,
	patch: Record<string, unknown>
): Promise<{ data: LeadFunnelColumn | null; error?: string }> {
	const response = await fetch(`/api/leads/funnel-columns/${idLeadFunnelColumn}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(patch),
	})
	const body: ApiResponse<LeadFunnelColumn> = await response.json()
	if ('error' in body && body.error) {
		return { data: null, error: body.error }
	}
	return { data: body.data }
}

interface FunnelColumnRowProps {
	column: LeadFunnelColumn
	onEdit: () => void
	onDelete: () => void
}

function FunnelColumnRow({ column, onEdit, onDelete }: FunnelColumnRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: column.idLeadFunnelColumn })

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	return (
		<TableRow
			ref={setNodeRef}
			style={style}
			className={isDragging ? 'bg-muted/50' : undefined}
		>
			<TableCell className="w-9 align-top">
				<button
					type="button"
					aria-label="Reordenar columna"
					className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md border border-input bg-background text-slate-600 transition-colors duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:cursor-grabbing dark:text-slate-300"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-4" aria-hidden />
				</button>
			</TableCell>
			<TableCell className="align-top">
				<span className="font-medium text-foreground">{column.name}</span>
			</TableCell>
			<TableCell className="align-top">
				<code className="rounded bg-muted px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-200">
					{column.externalStatusKey}
				</code>
			</TableCell>
			<TableCell className="align-top text-slate-600 dark:text-slate-300">
				{column.position}
			</TableCell>
			<TableCell className="align-top">
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="sm" onClick={onEdit}>
						Editar
					</Button>
					{!column.isFallback && (
						<Button variant="destructive" size="sm" onClick={onDelete}>
							Eliminar
						</Button>
					)}
				</div>
			</TableCell>
		</TableRow>
	)
}

/**
 * Admin CRUD table for `LeadFunnelColumn` (Administración/Configuración).
 * Create is an inline form (name + externalStatusKey). Reorder is drag &
 * drop via `@dnd-kit` (pointer + keyboard sensors, accessible), persisted
 * with a `PATCH /api/leads/funnel-columns/[id]` per changed row, optimistic
 * update with rollback on error. Edit opens a modal where only `name` is
 * editable — `externalStatusKey` is immutable after creation (changing it
 * would silently break future webhook routing for CRM events already
 * configured against the old value, without moving leads already assigned
 * to the column). Delete requires confirmation and is blocked server-side
 * for the fallback column or columns with active leads.
 */
export function FunnelColumnsAdminTable({
	initialColumns,
}: FunnelColumnsAdminTableProps) {
	const [columns, setColumns] = React.useState(
		[...initialColumns].sort((a, b) => a.position - b.position)
	)
	const [name, setName] = React.useState('')
	const [externalStatusKey, setExternalStatusKey] = React.useState('')
	const [isCreating, setIsCreating] = React.useState(false)
	const [editingColumn, setEditingColumn] = React.useState<LeadFunnelColumn | null>(null)
	const [editName, setEditName] = React.useState('')
	const [isSavingEdit, setIsSavingEdit] = React.useState(false)
	const [columnPendingDelete, setColumnPendingDelete] = React.useState<LeadFunnelColumn | null>(
		null
	)

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
	)

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event
		if (!over || active.id === over.id) return

		const previousColumns = columns
		const { columns: reordered, changed } = reorderFunnelColumns(
			columns,
			Number(active.id),
			Number(over.id)
		)
		if (changed.length === 0) return

		setColumns(reordered)

		const results = await Promise.all(
			changed.map((column) => patchColumn(column.idLeadFunnelColumn, { position: column.position }))
		)

		const failed = results.find((result) => result.error)
		if (failed) {
			setColumns(previousColumns)
			toast.error('No se pudo reordenar', { description: failed.error })
		}
	}

	const handleCreate = async () => {
		if (!name.trim() || !externalStatusKey.trim()) {
			toast.error('Nombre y clave de estado son obligatorios')
			return
		}

		setIsCreating(true)
		try {
			const response = await fetch('/api/leads/funnel-columns', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name,
					externalStatusKey,
					position: columns.length,
				}),
			})
			const body: ApiResponse<LeadFunnelColumn> = await response.json()

			if ('error' in body) {
				toast.error('Error al crear columna', { description: body.error })
				return
			}

			setColumns((prev) => [...prev, body.data])
			setName('')
			setExternalStatusKey('')
			toast.success('Columna creada')
		} finally {
			setIsCreating(false)
		}
	}

	const handleConfirmDelete = async () => {
		if (!columnPendingDelete) return
		const idLeadFunnelColumn = columnPendingDelete.idLeadFunnelColumn

		const response = await fetch(
			`/api/leads/funnel-columns/${idLeadFunnelColumn}`,
			{ method: 'DELETE' }
		)
		const body: ApiResponse<{ idLeadFunnelColumn: number }> =
			await response.json()

		setColumnPendingDelete(null)

		if ('error' in body) {
			toast.error('No se pudo eliminar', { description: body.error })
			return
		}

		setColumns((prev) =>
			prev.filter((c) => c.idLeadFunnelColumn !== idLeadFunnelColumn)
		)
		toast.success('Columna eliminada')
	}

	const handleStartEdit = (column: LeadFunnelColumn) => {
		setEditingColumn(column)
		setEditName(column.name)
	}

	const handleCancelEdit = () => {
		setEditingColumn(null)
		setEditName('')
	}

	const handleSaveEdit = async () => {
		if (!editingColumn) return
		if (!editName.trim()) {
			toast.error('El nombre es obligatorio')
			return
		}

		if (editName === editingColumn.name) {
			handleCancelEdit()
			return
		}

		setIsSavingEdit(true)
		try {
			const result = await patchColumn(editingColumn.idLeadFunnelColumn, { name: editName })

			if (result.error || !result.data) {
				toast.error('No se pudo actualizar la columna', { description: result.error })
				return
			}

			const updated = result.data
			setColumns((prev) =>
				prev.map((c) => (c.idLeadFunnelColumn === updated.idLeadFunnelColumn ? updated : c))
			)
			toast.success('Columna actualizada')
			handleCancelEdit()
		} finally {
			setIsSavingEdit(false)
		}
	}

	return (
		<div className="space-y-6">
			<Card data-testid="funnel-column-create-form">
				<CardHeader>
					<CardTitle className="text-base">Nueva columna</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
						<div className="flex flex-1 flex-col gap-1.5">
							<Label htmlFor="new-funnel-column-name">Nombre</Label>
							<Input
								id="new-funnel-column-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Ej. Contactado"
							/>
						</div>
						<div className="flex flex-1 flex-col gap-1.5">
							<Label htmlFor="new-funnel-column-external-status-key">
								{EXTERNAL_STATUS_KEY_LABEL}
							</Label>
							<Input
								id="new-funnel-column-external-status-key"
								value={externalStatusKey}
								onChange={(e) => setExternalStatusKey(liveUppercaseStatusKey(e.target.value))}
								placeholder="Ej. CONTACTADO"
							/>
						</div>
						<Button onClick={handleCreate} disabled={isCreating}>
							{isCreating ? 'Creando…' : 'Crear columna'}
						</Button>
					</div>
					<p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
						{EXTERNAL_STATUS_KEY_HELP_TEXT}
					</p>
				</CardContent>
			</Card>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<div className="rounded-lg border border-border">
					<Table containerClassName="h-auto min-h-0 max-h-none overflow-visible">
						<TableHeader>
							<TableRow>
								<TableHead className="w-9">
									<span className="sr-only">Reordenar</span>
								</TableHead>
								<TableHead>Nombre</TableHead>
								<TableHead>{EXTERNAL_STATUS_KEY_LABEL}</TableHead>
								<TableHead>Posición</TableHead>
								<TableHead>Acciones</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							<SortableContext
								items={columns.map((c) => c.idLeadFunnelColumn)}
								strategy={verticalListSortingStrategy}
							>
								{columns.map((column) => (
									<FunnelColumnRow
										key={column.idLeadFunnelColumn}
										column={column}
										onEdit={() => handleStartEdit(column)}
										onDelete={() => setColumnPendingDelete(column)}
									/>
								))}
							</SortableContext>
						</TableBody>
					</Table>
				</div>
			</DndContext>

			<Dialog open={editingColumn !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Editar columna</DialogTitle>
						<DialogDescription>
							Actualizá el nombre visible de la columna. La clave de estado no se puede
							modificar una vez creada.
						</DialogDescription>
					</DialogHeader>
					{editingColumn && (
						<div className="space-y-4">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-funnel-column-name">Nombre</Label>
								<Input
									id="edit-funnel-column-name"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									disabled={isSavingEdit}
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="edit-funnel-column-external-status-key">
									{EXTERNAL_STATUS_KEY_LABEL}
								</Label>
								<Input
									id="edit-funnel-column-external-status-key"
									value={editingColumn.externalStatusKey}
									disabled
									readOnly
								/>
								<p className="text-xs text-slate-600 dark:text-slate-300">
									{EXTERNAL_STATUS_KEY_IMMUTABLE_NOTE}
								</p>
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={handleCancelEdit} disabled={isSavingEdit}>
							Cancelar
						</Button>
						<Button onClick={handleSaveEdit} disabled={isSavingEdit}>
							{isSavingEdit ? 'Guardando…' : 'Guardar'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ConfirmActionDialog
				open={columnPendingDelete !== null}
				title="Eliminar columna"
				description={
					columnPendingDelete
						? `¿Seguro que querés eliminar la columna "${columnPendingDelete.name}"? Si tiene leads activos asignados, no se va a poder eliminar hasta que se muevan a otra columna.`
						: ''
				}
				confirmLabel="Eliminar"
				cancelLabel="Cancelar"
				onConfirm={handleConfirmDelete}
				onCancel={() => setColumnPendingDelete(null)}
			/>
		</div>
	)
}
