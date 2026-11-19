'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AsyncState } from '@/features/shared/types/async-state.types'
import type { HierarchyTreeData } from '@/features/production-dashboard/types/hierarchy.types'

type UseHierarchyTreeResult = {
	state: AsyncState<HierarchyTreeData>
	refetch: () => Promise<void>
}

export function useHierarchyTree(): UseHierarchyTreeResult {
	const [state, setState] = useState<AsyncState<HierarchyTreeData>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const fetchTree = useCallback(async () => {
		setState({ status: 'loading', data: undefined, error: '' })

		try {
			const res = await fetch('/api/production-dashboard/hierarchy-tree')

			if (!res.ok) {
				const json: unknown = await res.json()
				const errorMessage =
					typeof json === 'object' &&
					json !== null &&
					'error' in json &&
					typeof (json as { error: unknown }).error === 'string'
						? (json as { error: string }).error
						: 'Error al cargar la jerarquía'

				setState({ status: 'error', data: undefined, error: errorMessage })
				return
			}

			const json: { data: HierarchyTreeData } = await res.json()
			setState({ status: 'success', data: json.data, error: '' })
		} catch {
			setState({
				status: 'error',
				data: undefined,
				error: 'Error al cargar la jerarquía',
			})
		}
	}, [])

	useEffect(() => {
		fetchTree()
	}, [fetchTree])

	return { state, refetch: fetchTree }
}
