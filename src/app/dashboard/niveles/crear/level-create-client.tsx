'use client'

import React, { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LevelForm } from '@/features/levels/components/level-form'
import { useLevelMutations } from '@/features/levels/hooks/use-level-mutations'
import { useLevels } from '@/features/levels/hooks/use-levels'
import type {
	CreateLevelFormData,
	UpdateLevelFormData,
} from '@/features/levels/lib/level-schemas'
import { toast } from 'sonner'

/**
 * Client Component for Create Level Page
 */
export function LevelCreateClient() {
	const router = useRouter()
	const { createLevel, createState } = useLevelMutations()
	const { state: levelsState } = useLevels({ pageSize: 100 })
	const allLevels =
		levelsState.status === 'success'
			? levelsState.data.levels.map((l) => ({
					idLevel: l.idLevel,
					name: l.name,
				}))
			: []

	const handleSubmit = useCallback(
		async (data: CreateLevelFormData | UpdateLevelFormData) => {
			// In create mode, we always receive CreateLevelFormData
			await createLevel(data as CreateLevelFormData)
		},
		[createLevel]
	)

	const handleCancel = useCallback(() => {
		router.push('/dashboard/niveles')
	}, [router])

	// Handle create response
	useEffect(() => {
		if (createState.status === 'success') {
			toast.success('Nivel creado exitosamente')
			router.push('/dashboard/niveles')
		} else if (createState.status === 'error') {
			toast.error(createState.error || 'Error al crear nivel')
		}
	}, [createState.status, createState.error, router])

	return (
		<div className="max-w-2xl mx-auto">
			<div className="space-y-6">
				<div>
					<h1 className="text-3xl font-bold">Nuevo Nivel (Jerarquía)</h1>
					<p className="text-muted-foreground mt-2">
						Complete el formulario para crear un nuevo nivel de jerarquía
					</p>
				</div>

				<LevelForm
					mode="create"
					levels={allLevels}
					onSubmit={handleSubmit}
					onCancel={handleCancel}
					isLoading={createState.status === 'loading'}
				/>
			</div>
		</div>
	)
}
