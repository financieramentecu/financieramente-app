'use client'

import * as React from 'react'
import { Header } from './header'
import { ClientInfoSection } from '@/features/negocios/components/client-info-section'
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
			onSubmit,
			onCancel,
			defaultValues,
			currentUser,
			companiesOptions,
			productsOptions,
			periodicitiesOptions,
			currenciesOptions,
			clientOriginsOptions,
		},
		ref
	) => {
		const {
			form,
			isBlocked,
			isSubmitting,
			handleFormSubmit,
			handleClientSelected,
			handleCreateNew,
			handleSearchClient,
			clientResults,
			filteredProducts,
			agentsList,
			isAgentUser,
			canSearchAgents,
			handleAgentSearch,
		} = useBusinessForm({
			onSubmit,
			onCancel,
			defaultValues,
			currentUser,
			companiesOptions,
			productsOptions,
			periodicitiesOptions,
			currenciesOptions,
			clientOriginsOptions,
		})

		return (
			<div className="max-w-4xl mx-auto p-6 bg-white">
				<Header />

				<form ref={ref} onSubmit={handleFormSubmit} className="space-y-8">
					<ClientInfoSection
						form={form}
						clientOriginsOptions={clientOriginsOptions}
						clientResults={clientResults}
						onSearchClient={handleSearchClient}
						onClientSelected={handleClientSelected}
						onCreateNew={handleCreateNew}
					/>

					<ProductInfoSection
						form={form}
						companiesOptions={companiesOptions}
						productsOptions={productsOptions}
						filteredProducts={filteredProducts}
						isBlocked={isBlocked}
					/>

					<BusinessInfoSection
						form={form}
						currenciesOptions={currenciesOptions}
						periodicitiesOptions={periodicitiesOptions}
						agentsList={agentsList}
						onSearchAgents={canSearchAgents ? handleAgentSearch : undefined}
						isBlocked={isBlocked}
						isAgentUser={isAgentUser}
					/>

					<FormActions
						onCancel={onCancel}
						isSubmitting={isSubmitting}
						isBlocked={isBlocked}
					/>
				</form>
			</div>
		)
	}
)

BusinessForm.displayName = 'BusinessForm'

// Exportar tipo para compatibilidad con código existente
export type { UserWithRole as CurrentUser } from '@/features/negocios/types/business.types'
