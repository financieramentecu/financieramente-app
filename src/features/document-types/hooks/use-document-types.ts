'use client'

import { useEffect, useState } from 'react'
import { documentTypeApi } from '@/features/document-types/lib/document-type-api'
import type { DocumentTypeDto } from '@/features/document-types/types/document-type.types'
import type { AsyncState } from '@/features/shared/types/async-state.types'

export function useDocumentTypes() {
	const [state, setState] = useState<AsyncState<DocumentTypeDto[]>>({
		status: 'idle',
		data: undefined,
		error: '',
	})

	const refresh = async () => {
		setState({ status: 'loading', data: undefined, error: '' })
		try {
			const data = await documentTypeApi.list()
			setState({ status: 'success', data, error: '' })
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Error al cargar los tipos de documento'
			setState({ status: 'error', data: undefined, error: message })
		}
	}

	useEffect(() => {
		void refresh()
	}, [])

	return {
		state,
		documentTypes: state.status === 'success' ? state.data : [],
		isLoading: state.status === 'idle' || state.status === 'loading',
		refresh,
	}
}
