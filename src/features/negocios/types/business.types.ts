/**
 * Tipos para el feature de Negocios
 */

import { Prisma } from '@prisma/client'

export interface Business extends Record<string, unknown> {
	id: string
	identification: string
	user: {
		avatar: string
		name: string
	}
	email: string
	termPeriod: string
	date: string
	value: number
	product: string
	status: 'Emitido' | 'Venta Efectuado'
	actions?: unknown
}

export interface StatsData {
	title: string
	value: string | number
	change: number
	trend: 'up' | 'down' | 'neutral'
	description?: string
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

// Tipo para compatibilidad con código existente
export type CurrentUser = UserWithRole

export interface BusinessFormProps {
	onSubmit?: (data: BusinessFormData) => void | Promise<void>
	onCancel?: () => void
	defaultValues?: Partial<BusinessFormData>
	currentUser: UserWithRole | null
	companiesOptions: { value: string; label: string }[]
	productsOptions: { value: string; label: string; companyId: string }[]
	periodicitiesOptions: { value: string; label: string }[]
	currenciesOptions: { value: string; label: string }[]
	clientOriginsOptions: { value: string; label: string }[]
}
