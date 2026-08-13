'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { BusinessViewModal } from '@/features/negocios/components/modals/BusinessViewModal'
import { useBusinessDetail } from '@/features/negocios/hooks/use-business-detail'
import { useClientOrigins } from '@/features/origins/hooks/use-client-origins'
import { businessService } from '@/features/negocios/services/business.service'

interface ModalVerNegocioProps {
	idBusiness: number | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * Wrapper that loads business by id and renders BusinessViewModal.
 * When business is EMITIDO, shows inline select to change client origin and save from the modal.
 */
export function ModalVerNegocio({
	idBusiness,
	open,
	onOpenChange,
}: ModalVerNegocioProps) {
	const { business, isLoading, refetch } = useBusinessDetail(idBusiness)
	const { state: originsState } = useClientOrigins({
		page: 1,
		pageSize: 100,
		status: 'active',
	})

	const clientOriginsOptions = useMemo(() => {
		if (originsState.status !== 'success' || !originsState.data?.origins) {
			return []
		}
		return originsState.data.origins.map((o) => ({
			value: String(o.idClientOrigin),
			label: o.name,
		}))
	}, [originsState])

	async function handleSaveOrigin(businessId: number, idClientOrigin: number) {
		const response = await businessService.update(businessId, { idClientOrigin })
		if ('error' in response && response.error) {
			throw new Error(response.error)
		}
		toast.success('Origen actualizado')
		await refetch()
	}

	return (
		<BusinessViewModal
			open={open}
			onOpenChange={onOpenChange}
			business={business}
			isLoading={isLoading}
			allowEditOrigin
			clientOriginsOptions={clientOriginsOptions}
			onSaveOrigin={handleSaveOrigin}
			onNovedadChange={() => {
				void refetch()
			}}
		/>
	)
}
