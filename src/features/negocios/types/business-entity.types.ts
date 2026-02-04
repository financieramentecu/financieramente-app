/**
 * Tipos de dominio para BusinessEntity
 * Independientes de Prisma, optimizados para la UI
 */

import { Prisma } from '@prisma/client'

// ============================================
// ESTADOS Y MODOS
// ============================================

/**
 * Estados posibles del negocio
 */
export const BUSINESS_STATUS = {
	VENTA_EFECTUADA: 'VENTA_EFECTUADA',
	EMITIDO: 'EMITIDO',
	CANCELADO: 'CANCELADO',
} as const

export type BusinessStatus =
	(typeof BUSINESS_STATUS)[keyof typeof BUSINESS_STATUS]

/**
 * Modos del formulario de negocio
 */
export type BusinessFormMode = 'create' | 'edit' | 'view' | 'cancel'

// ============================================
// SUB-ENTIDADES (Información aplanada para UI)
// ============================================

/**
 * Información del cliente aplanada
 */
export interface ClientInfo {
	readonly id: number
	fullName: string
	identityNumber: string
	email: string | null
	phone: string | null
}

/**
 * Información del agente aplanada
 */
export interface AgentInfo {
	readonly id: number
	fullName: string
	roleName: string | null
	email: string
	phone: string | null
}

/**
 * Información del producto aplanada
 */
export interface ProductInfo {
	readonly id: number
	name: string
	readonly companyId: number
	companyName: string
}

/**
 * Información de moneda
 */
export interface CurrencyInfo {
	readonly id: number
	name: string
}

/**
 * Información de periodicidad
 */
export interface PeriodicityInfo {
	readonly id: number
	name: string
}

/**
 * Información de origen de cliente
 */
export interface ClientOriginInfo {
	readonly id: number
	name: string
}

// ============================================
// ENTIDAD PRINCIPAL
// ============================================

/**
 * Entidad de negocio para la UI
 * Datos aplanados y serializables (JSON-safe)
 */
export interface BusinessEntity {
	readonly id: number
	contract: string | null
	term: number | null
	value: number
	status: BusinessStatus
	readonly createdAt: string // ISO string para serialización
	client: ClientInfo
	agent: AgentInfo
	product: ProductInfo
	currency: CurrencyInfo
	periodicity: PeriodicityInfo | null
	clientOrigin: ClientOriginInfo
}

// ============================================
// SELECTOR DE PRISMA
// ============================================

/**
 * Selector de Prisma para incluir todas las relaciones necesarias
 * Se usa en las queries de la API
 */
export const businessWithRelations = {
	client: true,
	user: {
		include: {
			role: true,
		},
	},
	productPercentajeCommision: {
		include: {
			productConfiguration: {
				include: {
					product: {
						include: {
							company: true,
						},
					},
				},
			},
		},
	},
	currency: true,
	buyPeriodicity: true,
	clientOrigin: true,
} satisfies Prisma.BusinessInclude

/**
 * Tipo derivado de Prisma con todas las relaciones
 */
export type PrismaBusinessWithRelations = Prisma.BusinessGetPayload<{
	include: typeof businessWithRelations
}>
