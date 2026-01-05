'use client'

/**
 * Hook para validación en tiempo real de contratos
 * Implementa debounce para evitar llamadas excesivas a la API
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { businessService } from '../services/business.service'

interface ContractValidationState {
	isValidating: boolean
	isValid: boolean | null
	error: string | null
	existingBusinessId: number | null
}

interface UseContractValidationReturn extends ContractValidationState {
	validateContract: (contract: string) => void
	resetValidation: () => void
}

/**
 * Hook para validación de contratos con debounce
 *
 * @param excludeBusinessId - ID de negocio a excluir (para edición)
 * @param debounceMs - Tiempo de debounce en ms (default 500)
 * @returns Estado de validación y funciones de control
 *
 * @example
 * ```typescript
 * const { isValidating, isValid, error, validateContract } = useContractValidation(businessId)
 *
 * // En el onChange del input
 * const handleContractChange = (value: string) => {
 *   setContract(value)
 *   validateContract(value)
 * }
 * ```
 */
export function useContractValidation(
	excludeBusinessId?: number,
	debounceMs: number = 500
): UseContractValidationReturn {
	const [state, setState] = useState<ContractValidationState>({
		isValidating: false,
		isValid: null,
		error: null,
		existingBusinessId: null,
	})

	const timeoutRef = useRef<NodeJS.Timeout | null>(null)
	const abortControllerRef = useRef<AbortController | null>(null)

	const resetValidation = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
		}
		setState({
			isValidating: false,
			isValid: null,
			error: null,
			existingBusinessId: null,
		})
	}, [])

	const validateContract = useCallback(
		(contract: string) => {
			// Limpiar timeout anterior
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			// Cancelar request anterior
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}

			// Si el contrato está vacío, resetear
			if (!contract || contract.trim() === '') {
				resetValidation()
				return
			}

			// Iniciar estado de validación
			setState((prev) => ({
				...prev,
				isValidating: true,
				error: null,
			}))

			// Debounce
			timeoutRef.current = setTimeout(async () => {
				abortControllerRef.current = new AbortController()

				try {
					const response = await businessService.validateContract(
						contract,
						excludeBusinessId
					)

					if ('error' in response && response.error) {
						setState({
							isValidating: false,
							isValid: false,
							error: response.error,
							existingBusinessId: null,
						})
						return
					}

					if (response.data) {
						setState({
							isValidating: false,
							isValid: response.data.available,
							error: response.data.available
								? null
								: `El número de contrato ya está asignado al negocio #${response.data.existingBusinessId}`,
							existingBusinessId: response.data.existingBusinessId || null,
						})
					}
				} catch (error) {
					// Ignorar errores de cancelación
					if (error instanceof Error && error.name === 'AbortError') {
						return
					}

					setState({
						isValidating: false,
						isValid: false,
						error: 'Error al validar el contrato',
						existingBusinessId: null,
					})
				}
			}, debounceMs)
		},
		[excludeBusinessId, debounceMs, resetValidation]
	)

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [])

	return {
		...state,
		validateContract,
		resetValidation,
	}
}
