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
const isoCalendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const businessListParamsSchema = z
	.object({
		page: z.coerce.number().int().positive().optional().default(1),
		pageSize: z.coerce.number().int().positive().max(100).optional().default(10),
		search: z.string().nullish(),
		status: z
			.enum([
				'VENTA_EFECTUADA',
				'EMITIDO',
				'LIQUIDADO',
				'CANCELADO',
				'FONDEADO',
			])
			.nullish(),
		dateFrom: z.preprocess(
			(v) => (v === '' || v === null ? undefined : v),
			isoCalendarDay.optional()
		),
		dateTo: z.preprocess(
			(v) => (v === '' || v === null ? undefined : v),
			isoCalendarDay.optional()
		),
		createdFrom: z.preprocess(
			(v) => (v === '' || v === null ? undefined : v),
			isoCalendarDay.optional()
		),
		createdTo: z.preprocess(
			(v) => (v === '' || v === null ? undefined : v),
			isoCalendarDay.optional()
		),
		agentName: z.string().nullish(),
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
			])
			.nullish(),
		sortOrder: z.enum(['asc', 'desc']).nullish(),
	})
	.superRefine((data, ctx) => {
		const hasFrom = data.dateFrom !== undefined
		const hasTo = data.dateTo !== undefined
		if (hasFrom !== hasTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'dateFrom y dateTo deben enviarse juntos',
				path: ['dateTo'],
			})
		}
		const hasCreatedFrom = data.createdFrom !== undefined
		const hasCreatedTo = data.createdTo !== undefined
		if (hasCreatedFrom !== hasCreatedTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'createdFrom y createdTo deben enviarse juntos',
				path: ['createdTo'],
			})
		}
	})

export type BusinessListParamsSchema = z.infer<typeof businessListParamsSchema>

/** Body POST export Excel negocios (H5). Fechas opcionales = mismo criterio que la lista sin rango. */
export const negociosExportBodySchema = z
	.object({
		dateFrom: isoCalendarDay.optional(),
		dateTo: isoCalendarDay.optional(),
		search: z.string().optional(),
		status: z
			.enum([
				'VENTA_EFECTUADA',
				'EMITIDO',
				'LIQUIDADO',
				'CANCELADO',
				'FONDEADO',
			])
			.optional(),
	})
	.superRefine((data, ctx) => {
		const hasFrom = data.dateFrom !== undefined
		const hasTo = data.dateTo !== undefined
		if (hasFrom !== hasTo) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'dateFrom y dateTo deben enviarse juntos',
				path: ['dateTo'],
			})
		}
	})

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
