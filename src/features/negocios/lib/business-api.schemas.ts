/**
 * Schemas Zod para validación de requests/responses de API de negocios
 */

import { z } from 'zod'
import { BUSINESS_STATUS } from '../types/business-entity.types'

// ============================================
// SCHEMAS DE REQUEST
// ============================================

/**
 * Schema para parámetros de lista de negocios
 * Usa nullish() para aceptar null de searchParams.get()
 * Búsqueda unificada por identityNumber, nombres, apellidos, email del cliente,
 * ID del negocio y número de contrato
 */
export const businessListParamsSchema = z.object({
	page: z.coerce.number().int().positive().optional().default(1),
	pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
	search: z.string().nullish(),
	status: z
		.enum(['VENTA_EFECTUADA', 'EMITIDO', 'COMISIONANDO', 'CANCELADO'])
		.nullish(),
})

export type BusinessListParamsSchema = z.infer<typeof businessListParamsSchema>

/**
 * Schema para actualización de negocio (contrato y/o origen del cliente)
 */
export const updateBusinessSchema = z.object({
	contract: z
		.string()
		.min(1, 'El número de contrato es obligatorio')
		.regex(
			/^[A-Za-z0-9-]+$/,
			'El contrato solo puede contener letras, números y guiones'
		)
		.optional(),
	idClientOrigin: z.number().int().positive().optional(),
	idSettlementCommission: z.number().int().positive().optional(),
})

export type UpdateBusinessSchema = z.infer<typeof updateBusinessSchema>

/**
 * Schema para cancelación de negocio
 */
export const cancelBusinessSchema = z.object({
	reason: z
		.string()
		.min(20, 'El motivo debe tener al menos 20 caracteres')
		.max(500, 'El motivo no puede exceder 500 caracteres'),
})

export type CancelBusinessSchema = z.infer<typeof cancelBusinessSchema>

/**
 * Schema para validación de contrato
 */
export const validateContractSchema = z.object({
	contract: z.string().min(1, 'El número de contrato es obligatorio'),
	excludeBusinessId: z.coerce.number().int().positive().optional(),
})

export type ValidateContractSchema = z.infer<typeof validateContractSchema>

// ============================================
// SCHEMAS DE RESPONSE
// ============================================

/**
 * Schema para información de cliente
 */
export const clientInfoSchema = z.object({
	id: z.number(),
	fullName: z.string(),
	identityNumber: z.string(),
	email: z.string().nullable(),
	phone: z.string().nullable(),
})

/**
 * Schema para información de agente
 */
export const agentInfoSchema = z.object({
	id: z.number(),
	fullName: z.string(),
	roleName: z.string().nullable(),
	email: z.string(),
	phone: z.string().nullable(),
})

/**
 * Schema para información de producto
 */
export const productInfoSchema = z.object({
	id: z.number(),
	name: z.string(),
	companyId: z.number(),
	companyName: z.string(),
})

/**
 * Schema para BusinessEntity
 */
export const businessEntitySchema = z.object({
	id: z.number(),
	contract: z.string().nullable(),
	term: z.number().nullable(),
	value: z.number(),
	status: z.enum([
		BUSINESS_STATUS.VENTA_EFECTUADA,
		BUSINESS_STATUS.EMITIDO,
		BUSINESS_STATUS.COMISIONANDO,
		BUSINESS_STATUS.CANCELADO,
	]),
	createdAt: z.string(),
	client: clientInfoSchema,
	agent: agentInfoSchema,
	product: productInfoSchema,
	currency: z.object({ id: z.number(), name: z.string() }),
	periodicity: z.object({ id: z.number(), name: z.string() }).nullable(),
	clientOrigin: z.object({ id: z.number(), name: z.string() }),
})

export type BusinessEntitySchema = z.infer<typeof businessEntitySchema>

/**
 * Schema para metadatos de paginación
 */
export const paginationMetaSchema = z.object({
	page: z.number(),
	pageSize: z.number(),
	total: z.number(),
	totalPages: z.number(),
})

/**
 * Schema para respuesta de lista de negocios
 */
export const businessListResponseSchema = z.object({
	businesses: z.array(businessEntitySchema),
	pagination: paginationMetaSchema,
})

/**
 * Schema para respuesta de validación de contrato
 */
export const contractValidationResponseSchema = z.object({
	available: z.boolean(),
	existingBusinessId: z.number().optional(),
})

/**
 * Schema para datos mensuales de estadísticas
 */
export const monthlyDataSchema = z.object({
	month: z.string(),
	totalValue: z.number(),
})

/**
 * Schema para estadísticas por estado
 */
export const statusStatsSchema = z.object({
	totalValue: z.number(),
	monthlyData: z.array(monthlyDataSchema),
	growthPercentage: z.number(),
})

/**
 * Schema para respuesta de estadísticas
 */
export const businessStatsResponseSchema = z.object({
	efectuados: statusStatsSchema,
	emitidos: statusStatsSchema,
})

export type BusinessStatsResponseSchema = z.infer<
	typeof businessStatsResponseSchema
>
