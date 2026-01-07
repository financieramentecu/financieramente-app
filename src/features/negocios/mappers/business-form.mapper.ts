/**
 * Mapper para transformar BusinessEntity a BusinessFormData
 * Usado para pre-poblar el formulario en modo edición
 */

import type { BusinessEntity } from '../types/business-entity.types'
import type { BusinessFormData } from '../lib/business-form-schemas'
import type { UpdateBusinessRequest } from '../types/business-api.types'

/**
 * Transforma una entidad de negocio a datos del formulario
 *
 * @param business - Entidad de negocio desde la API
 * @returns Datos formateados para el formulario
 *
 * @example
 * ```typescript
 * const formData = businessEntityToFormData(business)
 * <BusinessForm defaultValues={formData} mode="edit" />
 * ```
 */
export function businessEntityToFormData(
	business: BusinessEntity
): Partial<BusinessFormData> {
	// Separar nombre y apellidos del fullName del cliente
	const nameParts = business.client.fullName.split(' ')
	const firstName = nameParts[0] || ''
	const lastNames = nameParts.slice(1).join(' ') || ''

	return {
		// Información del cliente
		identityNumber: business.client.identityNumber,
		email: business.client.email || '',
		name: firstName,
		lastNames: lastNames,
		phone: business.client.phone || '',
		clientOrigin: String(business.clientOrigin.id),

		// Información del producto
		company: String(business.product.companyId),
		producto: String(business.product.id),
		terms: business.term ?? undefined,

		// Información del negocio
		currency: String(business.currency.id),
		periodicity: business.periodicity ? String(business.periodicity.id) : '',
		value: business.value,
		agent: String(business.agent.id),
		contract: business.contract || '',
	}
}

/**
 * Transforma datos del formulario a request de actualización
 * Solo extrae los campos editables (contract)
 *
 * @param formData - Datos del formulario
 * @returns Request para actualizar el negocio
 */
export function formDataToUpdateRequest(
	formData: Partial<BusinessFormData>
): UpdateBusinessRequest {
	return {
		contract: formData.contract || undefined,
	}
}

/**
 * Compara si hay cambios entre los datos actuales y los originales
 *
 * @param current - Datos actuales del formulario
 * @param original - Datos originales del formulario
 * @returns true si hay cambios
 */
export function hasFormChanges(
	current: Partial<BusinessFormData>,
	original: Partial<BusinessFormData>
): boolean {
	return current.contract !== original.contract
}
