'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Header } from './header'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import { ClientInfoSection } from '@/features/negocios/components/sections/client-info-section'
import { ProductInfoSection } from '@/features/negocios/components/sections/product-info-section'
import { BusinessInfoSection } from '@/features/negocios/components/sections/business-info-section'
import { FormActions } from '@/features/negocios/components/form-actions'
import { useBusinessForm } from '@/features/negocios/hooks/use-business-form'
import type { BusinessFormProps } from '@/features/negocios/types/business.types'

export const BusinessForm = React.forwardRef<
	HTMLFormElement,
	BusinessFormProps
>(
	(
		{
			mode = 'create',
			businessId,
			onSubmit,
			onCancel,
			defaultValues,
			currentUser,
			companiesOptions,
			productsOptions,
			periodicitiesOptions,
			currenciesOptions,
			clientOriginsOptions,
			businessAgent,
		},
		ref
	) => {
		const {
			form,
			isBlocked,
			isSubmitting,
			isEditMode,
			handleFormSubmit,
			handleClientSelected,
			handleSearchClient,
			clientResults,
			filteredProducts,
			agentsList,
			isAgentUser,
			canSearchAgents,
			handleAgentSearch,
			setIdSettlementCommission,
		} = useBusinessForm({
			mode,
			businessId,
			onSubmit,
			onCancel,
			defaultValues,
			currentUser,
			companiesOptions,
			productsOptions,
			periodicitiesOptions,
			currenciesOptions,
			clientOriginsOptions,
			businessAgent,
		})

		return (
			<div className="max-w-4xl mx-auto p-6 bg-card">
				<Header />

				<form ref={ref} onSubmit={handleFormSubmit} className="space-y-8">
					<ClientInfoSection
						form={form as unknown as UseFormReturn<BusinessFormData>}
						clientOriginsOptions={clientOriginsOptions}
						clientResults={clientResults}
						onSearchClient={handleSearchClient}
						onClientSelected={handleClientSelected}
						isEditMode={isEditMode}
						onSelectLag={setIdSettlementCommission}
					/>

					<ProductInfoSection
						form={form as unknown as UseFormReturn<BusinessFormData>}
						companiesOptions={companiesOptions}
						productsOptions={productsOptions}
						filteredProducts={filteredProducts}
						isBlocked={isBlocked}
						isEditMode={isEditMode}
					/>

					<BusinessInfoSection
						form={form as unknown as UseFormReturn<BusinessFormData>}
						currenciesOptions={currenciesOptions}
						periodicitiesOptions={periodicitiesOptions}
						agentsList={agentsList}
						onSearchAgents={canSearchAgents ? handleAgentSearch : undefined}
						isBlocked={isBlocked}
						isAgentUser={isAgentUser}
						isEditMode={isEditMode}
					/>

					<FormActions
						onCancel={onCancel}
						isSubmitting={isSubmitting}
						isBlocked={isBlocked}
						isEditMode={isEditMode}
					/>
				</form>
			</div>
		)
	}
)

BusinessForm.displayName = 'BusinessForm'

// Exportar tipo para compatibilidad con código existente
export type { UserWithRole as CurrentUser } from '@/features/negocios/types/business.types'
