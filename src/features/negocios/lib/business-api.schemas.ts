/**
 * Schemas Zod para validación de requests/responses de API de negocios
 */

import { z } from 'zod'
import { BUSINESS_STATUS } from '../types/business-entity.types'

// ============================================
// SCHEMAS DE REQUEST
// ============================================

const isoCalendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const preprocessDate = (v: unknown) => (v === '' || v === null ? undefined : v)

const BUSINESS_STATUS_VALUES = [
	'VENTA_EFECTUADA',
	'EMITIDO',
	'LIQUIDADO',
	'CANCELADO',
	'FONDEADO',
	'CARTERA',
] as const

/**
 * Paired date-range check: both fields must be sent together.
 */
function pairedRangeCheck(
	data: Record<string, unknown>,
	ctx: z.RefinementCtx
) {
	const pairs: Array<[string, string, string]> = [
		['dateFrom', 'dateTo', 'dateFrom y dateTo deben enviarse juntos'],
		['createdFrom', 'createdTo', 'createdFrom y createdTo deben enviarse juntos'],
		[
			'dateIssuedFrom',
			'dateIssuedTo',
			'dateIssuedFrom y dateIssuedTo deben enviarse juntos',
		],
	]
	for (const [fromKey, toKey, msg] of pairs) {
		const hasFrom = data[fromKey] !== undefined
		const hasTo = data[toKey] !== undefined
		if (hasFrom !== hasTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: msg,
				path: [toKey],
			})
		}
	}
}

/**
 * Core filter params shared by both GET /api/negocios and POST /api/negocios/export.
 * This is the single source of truth for all list/export filter fields.
 */
export const businessFilterParamsSchema = z
	.object({
		search: z.string().nullish(),
		// Back-compat single status
		status: z.enum(BUSINESS_STATUS_VALUES).nullish(),
		// New multiselect statuses
		statuses: z.array(z.enum(BUSINESS_STATUS_VALUES)).optional(),
		// Fund date range (dateAnchored)
		dateFrom: z.preprocess(preprocessDate, isoCalendarDay.optional()),
		dateTo: z.preprocess(preprocessDate, isoCalendarDay.optional()),
		// Created date range
		createdFrom: z.preprocess(preprocessDate, isoCalendarDay.optional()),
		createdTo: z.preprocess(preprocessDate, isoCalendarDay.optional()),
		// Issued date range (nullable column — NOT NULL guard applied in WHERE)
		dateIssuedFrom: z.preprocess(preprocessDate, isoCalendarDay.optional()),
		dateIssuedTo: z.preprocess(preprocessDate, isoCalendarDay.optional()),
		agentName: z.string().nullish(),
		// Boolean filter for comprobantes/supports
		// null/undefined/'' → undefined; 'true' → true; 'false' → false
		hasSupports: z.preprocess(
			(v) => (v === 'true' ? true : v === 'false' ? false : v === null || v === '' ? undefined : v),
			z.boolean().optional()
		),
		// Array filters
		companyIds: z.array(z.number()).optional(),
		productIds: z.array(z.number()).optional(),
		originIds: z.array(z.number()).optional(),
		terms: z.array(z.number().int()).optional(),
		periodicityIds: z.array(z.number()).optional(),
		/** IDs de categoría del Money Strategist (User.idCategory) */
		agentCategoryIds: z.array(z.number()).optional(),
		/** IDs de Money Strategist (User.idUser) — multiselect */
		agentIds: z.array(z.number()).optional(),
	})
	.superRefine((data, ctx) => {
		pairedRangeCheck(data as Record<string, unknown>, ctx)
	})

export type BusinessFilterParams = z.infer<typeof businessFilterParamsSchema>

/**
 * Schema para parámetros de lista de negocios (filtros + paginación/ordenamiento).
 * Búsqueda unificada por identityNumber, nombres, apellidos, email del cliente,
 * ID del negocio y número de contrato.
 */
export const businessListParamsSchema = businessFilterParamsSchema.extend({
	page: z.coerce.number().int().positive().optional().default(1),
	pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
	sortBy: z
		.enum([
			'agentName',
			'createdAt',
			'status',
			'value',
			'clientName',
			'identification',
			'contract',
			'companyName',
			'product',
			'term',
			'periodicityName',
			'dateIssued',
			'dateAnchored',
			'clientOriginName',
		])
		.nullish(),
	sortOrder: z.enum(['asc', 'desc']).nullish(),
})

export type BusinessListParamsSchema = z.infer<typeof businessListParamsSchema>

/**
 * Body POST export Excel negocios.
 * Identical to businessFilterParamsSchema — single source of truth.
 */
export const negociosExportBodySchema = businessFilterParamsSchema

export type NegociosExportBodySchema = z.infer<typeof negociosExportBodySchema>

/**
 * Schema para actualización de negocio (contrato y/o origen del cliente)
 */
export const updateBusinessSchema = z.object({
	contract: z
		.string()
		.min(1, 'El número de contrato no puede estar vacío')
		.regex(
			/^[A-Za-z0-9-]+$/,
			'El contrato solo puede contener letras, números y guiones'
		)
		.optional(),
	idClientOrigin: z.number({ message: 'El origen del cliente debe ser un número válido' }).int('El origen del cliente debe ser un número entero').positive('El origen del cliente debe ser un ID válido mayor a 0').optional(),
	idSettlementCommission: z.number({ message: 'La liquidación debe ser un número válido' }).int('La liquidación debe ser un número entero').positive('La liquidación debe ser un ID válido mayor a 0').optional(),
	idProduct: z.number({ message: 'El producto debe ser un número válido' }).int('El producto debe ser un número entero').positive('El producto debe ser un ID válido mayor a 0').optional(),
	term: z.number({ message: 'El plazo debe ser un número válido' }).int('El plazo debe ser un número entero').min(0, 'El plazo no puede ser negativo').optional(),
	value: z.number({ message: 'El valor debe ser un número válido' }).min(0, 'El valor no puede ser negativo').optional(),
	idBuyPeriodicity: z.number({ message: 'La periodicidad debe ser un número válido' }).int('La periodicidad debe ser un número entero').positive('La periodicidad debe ser un ID válido mayor a 0').optional(),
	idCurrency: z.number({ message: 'La moneda debe ser un número válido' }).int('La moneda debe ser un número entero').positive('La moneda debe ser un ID válido mayor a 0').optional(),
	idUser: z.number({ message: 'El agente debe ser un número válido' }).int('El agente debe ser un número entero').positive('El agente debe ser un ID válido mayor a 0').optional(),
	numAportes: z.number({ message: 'El número de aportes debe ser un número válido' }).int('El número de aportes debe ser un número entero').min(0, 'El número de aportes no puede ser negativo').optional(),
	dateIssued: z
		.preprocess(
			(val) => (val === '' || val === null ? undefined : val),
			z.string().datetime().or(z.date())
		)
		.optional(),
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
	categoryName: z.string().nullable(),
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
		BUSINESS_STATUS.LIQUIDADO,
		BUSINESS_STATUS.CANCELADO,
		BUSINESS_STATUS.FONDEADO,
	]),
	createdAt: z.string(),
	dateIssued: z.string().nullable(),
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
