'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LevelForm } from '@/features/levels/components/level-form'
import { EditLevelFormSkeleton } from '@/features/levels/components/level-form-skeleton'
import { useLevel } from '@/features/levels/hooks/use-level'
import { useLevels } from '@/features/levels/hooks/use-levels'
import { useLevelMutations } from '@/features/levels/hooks/use-level-mutations'
import type { UpdateLevelFormData } from '@/features/levels/lib/level-schemas'
import { toast } from 'sonner'

interface LevelEditClientProps {
	id: number
}

/**
 * Client Component for Edit Level Page
 */
export function LevelEditClient({ id }: LevelEditClientProps) {
	const router = useRouter()
	const { state: levelState } = useLevel(id)
	const { updateLevel, updateState } = useLevelMutations()
	const { state: levelsState } = useLevels({ pageSize: 100 })
	const allLevels =
		levelsState.status === 'success'
			? levelsState.data.levels.map((l) => ({
					idLevel: l.idLevel,
					name: l.name,
				}))
			: []

	const handleSubmit = useCallback(
		async (data: UpdateLevelFormData) => {
			await updateLevel(id, data)
		},
		[updateLevel, id]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/niveles')
	}, [router])

	// Handle update response
	useEffect(() => {
		if (updateState.status === 'success') {
			toast.success('Nivel actualizado exitosamente')
			router.push('/dashboard/niveles')
		} else if (updateState.status === 'error') {
			toast.error(updateState.error || 'Error al actualizar nivel')
		}
	}, [updateState.status, updateState.error, router])

	// Render based on state
	if (levelState.status === 'loading') {
		return <EditLevelFormSkeleton />
	}

	if (levelState.status === 'error') {
		return (
			<div className="flex flex-col items-center justify-center h-64 space-y-4">
				<div className="text-destructive">{levelState.error}</div>
				<button
					onClick={() => router.push('/dashboard/niveles')}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
				>
					Volver a la lista
				</button>
			</div>
		)
	}

	if (levelState.status === 'success') {
		return (
			<div className="max-w-2xl mx-auto">
				<div className="space-y-6">
					<div>
						<h1 className="text-3xl font-bold">Editar Nivel (Jerarquía)</h1>
						<p className="text-muted-foreground mt-2">
							Modifique los datos del nivel
						</p>
					</div>

					<LevelForm
						mode="edit"
						initialData={levelState.data}
						levels={allLevels}
						onSubmit={handleSubmit}
						onCancel={handleCancel}
						isLoading={updateState.status === 'loading'}
					/>
				</div>
			</div>
		)
	}

	return null
}
