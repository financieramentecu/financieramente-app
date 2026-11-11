'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Textarea } from '@/features/shared/ui/textarea'

export function ResolutionNoteForm({
	id,
	submitLabel,
	pendingLabel,
	saving,
	onSubmit,
	onCancel,
}: {
	id: string
	submitLabel: string
	pendingLabel: string
	saving: boolean
	onSubmit: (comment: string, files: File[]) => void
	onCancel: () => void
}) {
	const [comment, setComment] = useState('')
	const [files, setFiles] = useState<File[]>([])

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		onSubmit(comment.trim(), files)
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
			<div className="space-y-1">
				<label htmlFor={`${id}-files`} className="text-xs text-muted-foreground">
					Adjuntar archivos
				</label>
				<input
					id={`${id}-files`}
					type="file"
					multiple
					accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx"
					disabled={saving}
					className="block w-full text-sm"
					onChange={(event) => {
						const selected = Array.from(event.target.files ?? [])
						setFiles((current) => [...current, ...selected].slice(0, 3))
						event.target.value = ''
					}}
				/>
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
