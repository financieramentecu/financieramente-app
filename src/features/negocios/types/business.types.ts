/**
 * Tipos para el feature de Negocios
 * 100% Libres de dependencias de Prisma para uso en el Cliente
 */

export interface Business extends Record<string, unknown> {
	id: string
	identification: string
	clientName: string
	contract: string
	user: {
		avatar: string
		name: string
		categoryName?: string | null
	}
	email: string
	termPeriod: string
	/** Plazo numérico (p. ej. meses u horizonte del producto); null si no aplica */
	term: number | null
	/** Nombre de periodicidad de compra; null si no hay */
	periodicityName: string | null
	/** ISO — fecha de primera emisión del contrato */
	dateIssued: string | null
	/** ISO — fecha de fondeo del negocio */
	dateAnchored: string | null
	date: string
	value: number
	product: string
	companyName: string
	/** Origen del cliente (canal) */
	clientOriginName: string
	status:
		| 'Emitido'
		| 'Venta Efectuado'
		| 'Liquidado'
		| 'Cancelado'
		| 'Fondeado'
	statusCode: BusinessStatusCode
	hasPayments: boolean
	/** Aún hay aportes SIN_FONDEAR (mostrar Fondear aunque el padre sea Fondeado) */
	hasPendingPaymentFunding: boolean
	currency: {
		id: number
		name: string
	}
	actions?: unknown
}

export interface StatsData {
	title: string
	value: string | number
	change: number
	trend: 'up' | 'down' | 'neutral'
	description?: string
	monthlyData?: number[]
	currencies?: Array<{ symbol: string; name: string }>
	selectedCurrency?: string
	onCurrencyChange?: (currency: string) => void
}

export interface BusinessSearchParams {
	searchType: 'agent' | 'client' | 'id'
	searchCriteria: string
}

export type BusinessStatus =
	| 'Emitido'
	| 'Venta Efectuado'
	| 'Liquidado'
	| 'Cancelado'
	| 'Fondeado'

/**
 * Interface de usuario con rol simplificada para el cliente
 */
export interface UserWithRole {
	id?: number // Opcional para compatibilidad con objetos de Prisma (idUser)
	idUser: number // Alias para compatibilidad con código existente
	name: string
	lastName: string | null
	email: string
	typeIdentity?: string | null
	identityNumber?: string | null
	phone?: string | null
	active?: boolean
	idRole?: number | null // Opcional para compatibilidad
	idUserLeader?: number | null
	entryDate?: Date | string
	retirementDate?: Date | string | null
	password?: string | null
	ssoOnly?: boolean
	createdAt?: Date | string
	updatedAt?: Date | string
	role: {
		id?: number // Opcional para compatibilidad con código que solo usa idRole
		idRole: number // Alias para compatibilidad con código existente
		name: string
		code: string
		description?: string | null
		active?: boolean
		createdAt?: Date | string
		updatedAt?: Date | string
	} | null
	category?: { name: string } | null
}

import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import type {
	AgentInfo,
	BusinessStatus as BusinessStatusCode,
} from '@/features/negocios/types/business-entity.types'

// Tipo para compatibilidad con código existente
export type CurrentUser = UserWithRole

export interface BusinessFormProps {
	mode?: 'create' | 'edit'
	businessId?: number
	onSubmit?: (data: BusinessFormData) => void | Promise<void>
	onCancel?: () => void
	defaultValues?: Partial<BusinessFormData>
	currentUser: UserWithRole | null
	companiesOptions: { value: string; label: string }[]
	productsOptions: { value: string; label: string; companyId: string }[]
	periodicitiesOptions: { value: string; label: string }[]
	currenciesOptions: { value: string; label: string }[]
	clientOriginsOptions: { value: string; label: string }[]
	businessAgent?: AgentInfo
	businessStatus?: string | null
}
