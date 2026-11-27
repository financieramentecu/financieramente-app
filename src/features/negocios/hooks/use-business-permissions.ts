import { useMemo } from 'react'
import { UserWithRole } from '@/features/negocios/types/business.types'
import { usePermissions } from '@/features/shared/hooks/use-permissions'

export type FieldPermission = {
	readonly: boolean
	disabled: boolean
	hidden: boolean
}

export type BusinessFormField =
	| 'identityNumber'
	| 'typeIdentity'
	| 'email'
	| 'name'
	| 'lastNames'
	| 'phone'
	| 'clientOrigin'
	| 'clientIsPolicyholder'
	| 'policyholderTypeIdentity'
	| 'policyholderIdentityNumber'
	| 'policyholderEmail'
	| 'policyholderName'
	| 'policyholderLastNames'
	| 'policyholderPhone'
	| 'company'
	| 'producto'
	| 'terms'
	| 'currency'
	| 'periodicity'
	| 'value'
	| 'agent'
	| 'contract'
	| 'numAportes'

interface UseBusinessPermissionsProps {
	mode: 'create' | 'edit'
	currentUser: UserWithRole | null
	businessStatus?: string | null
}

/**
 * Hook centralizado para manejar los permisos de campos del formulario de negocios.
 * Define qué campos son editables, solo lectura o están deshabilitados según:
 * - El rol del usuario actual
 * - El modo del formulario (creación vs edición)
 * - El estado actual del negocio
 */
export function useBusinessPermissions({
	mode,
	businessStatus,
}: UseBusinessPermissionsProps) {
	const isEditMode = mode === 'edit'
	const { can } = usePermissions()

	// Privileged roles can edit financial fields in advanced states: the same
	// roles that may change a contract once the business is EMITIDO.
	const isPrivileged = can('negocios.editar_contrato_emitido')

	// Valor de Negocio is exclusive to support, operations and admin in every status.
	const canEditValue = can('negocios.editar_valor')

	// Roles that can edit client data in "Información básica y general"
	const canEditClientInfo = can('clientes.editar')

	// El negocio es un borrador (Venta Efectuada)
	const isDraft = useMemo(() => {
		const status = businessStatus?.toUpperCase()
		return !status || status === 'VENTA_EFECTUADA' || status === 'VENTA EFECTUADO'
	}, [businessStatus])

	/**
	 * Retorna los permisos para un campo específico
	 */
	const getFieldPermission = (field: BusinessFormField): FieldPermission => {
		// --- REGLA DE ORO: Money Strategist (Agent) NUNCA es editable en edición ---
		if (mode === 'edit' && field === 'agent') {
			return { readonly: true, disabled: true, hidden: false }
		}

		// --- LÓGICA BASE PARA CREACIÓN ---
		if (mode !== 'edit') {
			if (field === 'numAportes') {
				return { readonly: true, disabled: true, hidden: false }
			}
			return { readonly: false, disabled: false, hidden: false }
		}

		// --- LÓGICA PARA EDICIÓN ---

		// 1. Información del Cliente — editable para Asistente Operativo de Gerencia y Admin (COM-63)
		const clientFields: BusinessFormField[] = [
			'typeIdentity',
			'identityNumber',
			'email',
			'name',
			'lastNames',
			'phone',
			'clientOrigin',
			'clientIsPolicyholder',
			'policyholderTypeIdentity',
			'policyholderIdentityNumber',
			'policyholderEmail',
			'policyholderName',
			'policyholderLastNames',
			'policyholderPhone',
		]
		if (clientFields.includes(field)) {
			if (canEditClientInfo) {
				return { readonly: false, disabled: false, hidden: false }
			}
			return { readonly: true, disabled: true, hidden: false }
		}

		// 2. Campos Financieros (Producto, Valor, Plazo, etc.)
		const financialFields: BusinessFormField[] = ['company', 'producto', 'terms', 'currency', 'periodicity', 'value']
		if (field === 'numAportes') {
			return { readonly: true, disabled: true, hidden: false }
		}
		if (financialFields.includes(field)) {
			const status = businessStatus?.toUpperCase()
			const fundedStructuralFields: BusinessFormField[] = [
				'company',
				'producto',
				'terms',
				'periodicity',
			]
			// Changing these on a funded business rebuilds installments and can
			// drop rows that already have a financial status.
			if (status === 'FONDEADO' && fundedStructuralFields.includes(field)) {
				return { readonly: true, disabled: true, hidden: false }
			}

			// Drafts stay editable for the other financial fields, but Valor de
			// Negocio is exclusive to support, operations, and admin in every status.
			if (field === 'value' && !canEditValue) {
				return { readonly: true, disabled: true, hidden: false }
			}

			if (isPrivileged) {
				return { readonly: false, disabled: false, hidden: false }
			}

			// Si es borrador (Venta Efectuada), cualquiera con acceso a edición puede editar
			if (isDraft) {
				return { readonly: false, disabled: false, hidden: false }
			}
			
			// De lo contrario, bloqueado (ej. un agente editando un negocio emitido)
			return { readonly: true, disabled: true, hidden: false }
		}

		// 3. Número de Contrato
		if (field === 'contract') {
			// Siempre editable en edición para poder pasar de Venta Efectuada a Emitido
			return { readonly: false, disabled: false, hidden: false }
		}

		// Por defecto, permitir edición (fallback seguro)
		return { readonly: false, disabled: false, hidden: false }
	}

	return {
		isEditMode,
		isPrivileged,
		canEditClientInfo,
		isDraft,
		getFieldPermission,
	}
}
