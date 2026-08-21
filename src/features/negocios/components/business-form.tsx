'use client'

import * as React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Header } from './header'
import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import { ClientInfoSection } from '@/features/negocios/components/sections/client-info-section'
import { BusinessInfoSection } from '@/features/negocios/components/sections/business-info-section'
import { CoachInfoSection } from '@/features/negocios/components/sections/coach-info-section'
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
			clientId,
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
			businessStatus,
			leadId,
		},
		ref
	) => {
		const {
			form,
			isBlocked,
			isContractBlocked,
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
			isPrivilegedRole,
			isLeadOwnerLocked,
			getFieldPermission,
			identityConflict,
			resolveIdentityConflict,
		} = useBusinessForm({
			mode,
			businessId,
			clientId,
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
			businessStatus,
			leadId,
		})

		return (
			<div className="max-w-4xl mx-auto p-6 bg-card">
				<Header />

				<form ref={ref} onSubmit={handleFormSubmit} className="space-y-8">
					<CoachInfoSection
						form={form as unknown as UseFormReturn<BusinessFormData>}
						agentsList={agentsList}
						onSearchAgents={canSearchAgents ? handleAgentSearch : undefined}
						isBlocked={isBlocked}
						isAgentUser={isAgentUser}
						isEditMode={isEditMode}
						isAgentLocked={isLeadOwnerLocked}
					/>

					<ClientInfoSection
						form={form as unknown as UseFormReturn<BusinessFormData>}
						clientOriginsOptions={clientOriginsOptions}
						clientResults={clientResults}
						onSearchClient={handleSearchClient}
						onClientSelected={handleClientSelected}
						isEditMode={isEditMode}
						isBlocked={isBlocked}
						isLeadConversion={Boolean(leadId)}
						getFieldPermission={getFieldPermission}
						identityConflict={identityConflict}
						onResolveIdentityConflict={resolveIdentityConflict}
						canUpdateDocument={isPrivilegedRole}
						isSubmitting={isSubmitting}
					/>

					<BusinessInfoSection
						form={form as unknown as UseFormReturn<BusinessFormData>}
						currenciesOptions={currenciesOptions}
						periodicitiesOptions={periodicitiesOptions}
						companiesOptions={companiesOptions}
						filteredProducts={filteredProducts}
						onSelectLag={setIdSettlementCommission}
						isBlocked={isBlocked}
						isEditMode={isEditMode}
						contractDisabled={isContractBlocked}
						isPrivilegedRole={isPrivilegedRole}
						getFieldPermission={getFieldPermission}
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
