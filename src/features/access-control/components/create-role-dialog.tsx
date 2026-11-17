'use client'

import { useState } from 'react'
import { Alert, AlertDescription } from '@/features/shared/ui/alert'
import { Button } from '@/features/shared/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/features/shared/ui/dialog'
import { Input } from '@/features/shared/ui/input'
import { Label } from '@/features/shared/ui/label'
import { Textarea } from '@/features/shared/ui/textarea'
import { useRoleActions } from '../hooks/use-role-actions'

interface CreateRoleDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreated: (role: { id: number; name: string }) => void
}

export function CreateRoleDialog({ open, onOpenChange, onCreated }: CreateRoleDialogProps) {
	const { create, pending } = useRoleActions()
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [error, setError] = useState('')

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setError('')
		const outcome = await create({ name, description })
		if (!outcome.ok) {
			setError(outcome.error)
			return
		}
		setName('')
		setDescription('')
		onOpenChange(false)
		onCreated(outcome.data)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<DialogHeader>
						<DialogTitle>Crear rol</DialogTitle>
						<DialogDescription>
							El rol nace sin permisos; los configuras en el editor.
						</DialogDescription>
					</DialogHeader>
					{error && (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<div className="space-y-2">
						<Label htmlFor="role-name">Nombre</Label>
						<Input
							id="role-name"
							value={name}
							maxLength={100}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="role-description">Descripción</Label>
						<Textarea
							id="role-description"
							value={description}
							maxLength={500}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancelar
						</Button>
						<Button type="submit" disabled={pending || name.trim() === ''}>
							Crear rol
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
