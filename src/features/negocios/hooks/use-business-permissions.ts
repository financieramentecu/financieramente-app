import { useMemo } from 'react'
import { UserWithRole } from '@/features/negocios/types/business.types'

export type FieldPermission = {
	readonly: boolean
	disabled: boolean
	hidden: boolean
}

export type BusinessFormField =
	| 'identityNumber'
	| 'email'
	| 'name'
	| 'lastNames'
	| 'phone'
	| 'clientOrigin'
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
	currentUser,
	businessStatus,
}: UseBusinessPermissionsProps) {
	const isEditMode = mode === 'edit'
	const roleCode = currentUser?.role?.code

	// Roles privilegiados (pueden editar campos financieros en estados avanzados)
	const isPrivileged = useMemo(() => {
		const code = roleCode?.toUpperCase()
		return (
			code === 'ADMIN' ||
			code === 'ASISTENTE_GERENCIA_OPERATIVA' ||
			code === 'ANALISTA_SOPORTE'
		)
	}, [roleCode])

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
		
		// 1. Información del Cliente - Solo lectura en edición (según especificación)
		const clientFields: BusinessFormField[] = ['identityNumber', 'email', 'name', 'lastNames', 'phone', 'clientOrigin']
		if (clientFields.includes(field)) {
			return { readonly: true, disabled: true, hidden: false }
		}

		// 2. Campos Financieros (Producto, Valor, Plazo, etc.)
		const financialFields: BusinessFormField[] = ['company', 'producto', 'terms', 'currency', 'periodicity', 'value']
		if (field === 'numAportes') {
			return { readonly: true, disabled: true, hidden: false }
		}
		if (financialFields.includes(field)) {
			const status = businessStatus?.toUpperCase()
			
			// Si el negocio ya está fondeado, nadie debería editar los campos financieros
			if (status === 'FONDEADO') {
				return { readonly: true, disabled: true, hidden: false }
			}

			// Si es un rol privilegiado (ADMIN, etc.), puede editar siempre que no esté fondeado
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
		isDraft,
		getFieldPermission,
	}
}
