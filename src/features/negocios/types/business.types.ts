/**
 * Tipos para el feature de Negocios
 */

import { Prisma } from '@prisma/client'

export interface Business extends Record<string, unknown> {
	id: string
	identification: string
	clientName: string
	contract: string
	user: {
		avatar: string
		name: string
	}
	email: string
	termPeriod: string
	date: string
	value: number
	product: string
	companyName: string
	status: 'Emitido' | 'Venta Efectuado' | 'Comisionando' | 'Cancelado'
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

export type BusinessStatus = 'Emitido' | 'Venta Efectuado'

export type UserWithRole = Prisma.UserGetPayload<{
	include: {
		role: true
	}
}>

import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import type { AgentInfo } from '@/features/negocios/types/business-entity.types'

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
}
