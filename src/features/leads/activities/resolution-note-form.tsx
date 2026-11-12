'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Paperclip } from 'lucide-react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Textarea } from '@/features/shared/ui/textarea'

export function ResolutionNoteForm({
	id,
	submitLabel,
	pendingLabel,
	saving,
	includeCloseDate = false,
	onSubmit,
	onCancel,
}: {
	id: string
	submitLabel: string
	pendingLabel: string
	saving: boolean
	includeCloseDate?: boolean
	onSubmit: (comment: string, files: File[], closeOn?: string) => void
	onCancel: () => void
}) {
	const [comment, setComment] = useState('')
	const [files, setFiles] = useState<File[]>([])
	const [closeOn, setCloseOn] = useState('')
	const fileInput = useRef<HTMLInputElement>(null)

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		onSubmit(comment.trim(), files, includeCloseDate ? closeOn : undefined)
	}

	return (
		<form onSubmit={submit} className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
			<label htmlFor={`${id}-comment`} className="text-sm font-medium">
				Qué pasó
			</label>
			<Textarea
				id={`${id}-comment`}
				value={comment}
				onChange={(event) => setComment(event.target.value)}
				maxLength={2000}
				placeholder="Cuenta el resultado. Puedes dejarlo vacío."
				disabled={saving}
			/>
			{includeCloseDate && (
				<div className="space-y-1">
					<label htmlFor={`${id}-close`} className="text-sm font-medium">
						Fecha de cierre
					</label>
					<Input
						id={`${id}-close`}
						type="date"
						value={closeOn}
						onChange={(event) => setCloseOn(event.target.value)}
						disabled={saving}
					/>
					<p className="text-xs text-muted-foreground">
						Si la dejas vacía, el caso se cierra hoy.
					</p>
				</div>
			)}
			<div className="space-y-1">
				<label htmlFor={`${id}-files`} className="sr-only">
					Adjuntar archivos
				</label>
				<input
					ref={fileInput}
					id={`${id}-files`}
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx"
					disabled={saving}
					className="sr-only"
					onChange={(event) => {
						const selected = Array.from(event.target.files ?? [])
						setFiles((current) => [...current, ...selected].slice(0, 3))
						event.target.value = ''
					}}
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={saving}
					onClick={() => fileInput.current?.click()}
				>
					<Paperclip className="size-4" aria-hidden />
					Adjuntar archivo
				</Button>
				<p className="text-xs text-muted-foreground">Hasta 3 archivos, de 4 MB cada uno.</p>
				{files.length > 0 && (
					<ul className="space-y-1 text-sm">
						{files.map((file) => (
							<li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2">
								<span className="truncate">{file.name}</span>
								<button
									type="button"
									className="text-xs text-muted-foreground underline"
									onClick={() => setFiles((current) => current.filter((item) => item !== file))}
								>
									Quitar
								</button>
							</li>
						))}
					</ul>
				)}
			</div>
			<div className="flex gap-2">
				<Button type="submit" size="sm" disabled={saving}>
					{saving ? pendingLabel : submitLabel}
				</Button>
				<Button type="button" size="sm" variant="outline" disabled={saving} onClick={onCancel}>
					Cancelar
				</Button>
			</div>
		</form>
	)
}
