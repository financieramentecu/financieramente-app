import { prisma } from '@/lib/prisma'

/**
 * Acciones de auditoría
 */
export enum AuditAction {
	LOGIN = 'LOGIN',
	LOGOUT = 'LOGOUT',
	ACCESS_DENIED = 'ACCESS_DENIED',
	ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
	INVALID_DOMAIN = 'INVALID_DOMAIN',
	USER_CREATED = 'USER_CREATED',
	USER_ACTIVATED = 'USER_ACTIVATED',
	USER_DEACTIVATED = 'USER_DEACTIVATED',
	ROLE_CHANGED = 'ROLE_CHANGED',
	USER_CREATION_ERROR = 'USER_CREATION_ERROR',
	BUSINESS_UPDATED = 'BUSINESS_UPDATED',
	BUSINESS_CANCELLED = 'BUSINESS_CANCELLED',
	COMPANY_CREATED = 'COMPANY_CREATED',
	COMPANY_UPDATED = 'COMPANY_UPDATED',
	COMPANY_DELETED = 'COMPANY_DELETED',
	COMPANY_STATUS_CHANGED = 'COMPANY_STATUS_CHANGED',
	PRODUCT_CREATED = 'PRODUCT_CREATED',
	PRODUCT_UPDATED = 'PRODUCT_UPDATED',
	PRODUCT_DELETED = 'PRODUCT_DELETED',
	CLIENT_ORIGIN_CREATED = 'CLIENT_ORIGIN_CREATED',
	CLIENT_ORIGIN_UPDATED = 'CLIENT_ORIGIN_UPDATED',
	CLIENT_ORIGIN_DELETED = 'CLIENT_ORIGIN_DELETED',
	IMPORT_ERROR = 'IMPORT_ERROR',
	DISCOUNT_CREATED = 'DISCOUNT_CREATED',
	DISCOUNT_INACTIVATED = 'DISCOUNT_INACTIVATED',
	COMMISSION_SETTLED = 'COMMISSION_SETTLED',
	COMMISSION_LAGGED = 'COMMISSION_LAGGED',
}

/**
 * Parámetros para registrar un log de auditoría
 */
export interface AuditLogParams {
	userId?: number
	roleId?: number
	action: AuditAction
	email?: string
	ipAddress?: string
	userAgent?: string
	details?: string
}

/**
 * Registra un evento en el log de auditoría
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
	try {
		await prisma.auditLog.create({
			data: {
				idUser: params.userId,
				idRole: params.roleId,
				action: params.action,
				email: params.email,
				ipAddress: params.ipAddress,
				userAgent: params.userAgent,
				details: params.details,
			},
		})
	} catch (error) {
		// No lanzar error para no interrumpir el flujo de autenticación
		// Solo registrar en consola para debugging
		console.error('Error logging audit event:', error)
	}
}

/**
 * Obtiene la IP del cliente desde headers
 */
export function getClientIp(headers: Headers): string | undefined {
	// Intentar obtener IP de headers comunes
	const forwarded = headers.get('x-forwarded-for')
	if (forwarded) {
		return forwarded.split(',')[0].trim()
	}

	const realIp = headers.get('x-real-ip')
	if (realIp) {
		return realIp
	}

	return undefined
}

/**
 * Obtiene el User-Agent desde headers
 */
export function getUserAgent(headers: Headers): string | undefined {
	return headers.get('user-agent') || undefined
}
