'use client'

/**
 * Hook para manejar mutaciones de negocios (actualizar, cancelar)
 * Encapsula la lógica de submisión y manejo de errores
 */

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { businessService } from '../services/business.service'
import type { BusinessEntity } from '../types/business-entity.types'
import type {
	UpdateBusinessRequest,
	CancelBusinessRequest,
	FondearAnualidadesRequest,
} from '../types/business-api.types'

interface UseBusinessMutationReturn {
	isUpdating: boolean
	isCancelling: boolean
	isFondeando: boolean
	isFondeandoAnualidades: boolean
	updateBusiness: (
		id: number,
		data: UpdateBusinessRequest
	) => Promise<BusinessEntity | null>
	cancelBusiness: (
		id: number,
		data: CancelBusinessRequest
	) => Promise<BusinessEntity | null>
	fondearBusiness: (id: number) => Promise<BusinessEntity | null>
	fondearAnualidadesBusiness: (
		id: number,
		body: FondearAnualidadesRequest
	) => Promise<BusinessEntity | null>
}

/**
 * Hook para mutaciones de negocios
 *
 * @returns Funciones y estado para actualizar y cancelar negocios
 *
 * @example
 * ```typescript
 * const { updateBusiness, isUpdating } = useBusinessMutation()
 *
 * const handleSave = async () => {
 *   const result = await updateBusiness(businessId, { contract: 'PN0005678' })
 *   if (result) {
 *     router.push('/dashboard/negocios')
 *   }
 * }
 * ```
 */
export function useBusinessMutation(): UseBusinessMutationReturn {
	const [isUpdating, setIsUpdating] = useState(false)
	const [isCancelling, setIsCancelling] = useState(false)
	const [isFondeando, setIsFondeando] = useState(false)
	const [isFondeandoAnualidades, setIsFondeandoAnualidades] =
		useState(false)

	const updateBusiness = useCallback(
		async (
			id: number,
			data: UpdateBusinessRequest
		): Promise<BusinessEntity | null> => {
			setIsUpdating(true)

			try {
				const response = await businessService.update(id, data)

				if ('error' in response && response.error) {
					toast.error('Error al actualizar', {
						description: response.error,
					})
					return null
				}

				if (response.data) {
					toast.success('Negocio actualizado exitosamente', {
						description: `El negocio #${id} ha sido actualizado.`,
					})
					return response.data
				}

				return null
			} catch (error) {
				console.error('Error al actualizar negocio:', error)
				toast.error('Error inesperado', {
					description: 'No se pudo actualizar el negocio.',
				})
				return null
			} finally {
				setIsUpdating(false)
			}
		},
		[]
	)

	const cancelBusiness = useCallback(
		async (
			id: number,
			data: CancelBusinessRequest
		): Promise<BusinessEntity | null> => {
			setIsCancelling(true)

			try {
				const response = await businessService.cancel(id, data)

				if ('error' in response && response.error) {
					toast.error('Error al cancelar', {
						description: response.error,
					})
					return null
				}

				if (response.data) {
					toast.success(`Negocio #${id} cancelado exitosamente`, {
						description: 'El negocio ha sido cancelado.',
					})
					return response.data
				}

				return null
			} catch (error) {
				console.error('Error al cancelar negocio:', error)
				toast.error('Error inesperado', {
					description: 'No se pudo cancelar el negocio.',
				})
				return null
			} finally {
				setIsCancelling(false)
			}
		},
		[]
	)

	const fondearBusiness = useCallback(
		async (id: number): Promise<BusinessEntity | null> => {
			setIsFondeando(true)

			try {
				const response = await businessService.fondear(id)

				if ('error' in response && response.error) {
					toast.error('Error al fondear', {
						description: response.error,
					})
					return null
				}

				if (response.data) {
					toast.success(`Negocio #${id} fondeado exitosamente`, {
						description: 'El negocio ha sido fondeado.',
					})
					return response.data
				}

				return null
			} catch (error) {
				console.error('Error al fondear negocio:', error)
				toast.error('Error inesperado', {
					description: 'No se pudo fondear el negocio.',
				})
				return null
			} finally {
				setIsFondeando(false)
			}
		},
		[]
	)

	const fondearAnualidadesBusiness = useCallback(
		async (
			id: number,
			body: FondearAnualidadesRequest
		): Promise<BusinessEntity | null> => {
			setIsFondeandoAnualidades(true)

			try {
				const response = await businessService.fondearAnualidades(id, body)

				if ('error' in response && response.error) {
					toast.error('Error al fondear anualidades', {
						description: response.error,
					})
					return null
				}

				if (response.data) {
					toast.success(`Negocio #${id} — anualidades actualizadas`, {
						description: 'El fondeo de cuotas se registró correctamente.',
					})
					return response.data
				}

				return null
			} catch (error) {
				console.error('Error al fondear anualidades:', error)
				toast.error('Error inesperado', {
					description: 'No se pudo registrar el fondeo de anualidades.',
				})
				return null
			} finally {
				setIsFondeandoAnualidades(false)
			}
		},
		[]
	)

	return {
		isUpdating,
		isCancelling,
		isFondeando,
		isFondeandoAnualidades,
		updateBusiness,
		cancelBusiness,
		fondearBusiness,
		fondearAnualidadesBusiness,
	}
}
