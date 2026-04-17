import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCompanySchema } from '@/features/company/lib/company-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { Company } from '@/features/company/types/company.types'
import { prismaCompanyToCompany } from '@/features/company/mappers/company.mapper'
import { z } from 'zod'
import { requireAuth, requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'

/**
 * GET /api/admin/companies/[id]
 * Gets a company by ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const guard = await requireAuth()
	if (!guard.ok) {
		return guard.response
	}

	try {
		const { id } = await params
		const company = await prisma.company.findUnique({
			where: { idCompany: parseInt(id) },
		})

		if (!company) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Empresa no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const response: ApiResponse<Company> = {
			data: prismaCompanyToCompany(company),
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching company:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PUT /api/admin/companies/[id]
 * Updates an existing company
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}
	const { session } = guard

	try {
		const { id } = await params
		const companyId = parseInt(id)
		const body = await request.json()
		const data = updateCompanySchema.parse(body)

		// Get existing company for comparison
		const existingCompany = await prisma.company.findUnique({
			where: { idCompany: companyId },
		})

		if (!existingCompany) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Empresa no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Validate unique name if changing (case-insensitive)
		if (
			data.name &&
			data.name.trim().toLowerCase() !== existingCompany.name.toLowerCase()
		) {
			const normalizedName = data.name.trim()
			const duplicateCompany = await prisma.company.findFirst({
				where: {
					name: {
						equals: normalizedName,
						mode: 'insensitive',
					},
					NOT: {
						idCompany: companyId,
					},
				},
			})

			if (duplicateCompany) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe una empresa con este nombre',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		// Validate impact when deactivating
		if (data.status === false && existingCompany.status === true) {
			const activeProducts = await prisma.product.findFirst({
				where: {
					idCompany: companyId,
					status: true,
				},
			})

			if (activeProducts) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error:
						'Esta empresa está siendo utilizada en configuraciones activas. No se puede desactivar.',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		// Prepare update data
		const updateData: {
			name?: string
			status?: boolean
		} = {}

		if (data.name !== undefined) {
			updateData.name = data.name.trim()
		}

		if (data.status !== undefined) {
			updateData.status = data.status
		}

		const company = await prisma.company.update({
			where: { idCompany: companyId },
			data: updateData,
		})

		// Audit logging
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		const changes: string[] = []

		if (data.name && data.name !== existingCompany.name) {
			changes.push(`Nombre: "${existingCompany.name}" → "${data.name}"`)
		}

		if (data.status !== undefined && data.status !== existingCompany.status) {
			changes.push(
				`Estado: ${existingCompany.status ? 'Activa' : 'Inactiva'} → ${data.status ? 'Activa' : 'Inactiva'}`
			)

			await logAuditEvent({
				userId,
				action: AuditAction.COMPANY_STATUS_CHANGED,
				email: session.user.email || undefined,
				ipAddress: getClientIp(headers),
				userAgent: getUserAgent(headers),
				details: `Estado de empresa cambiado: ${company.name} (ID: ${company.idCompany}). ${changes.join(', ')}`,
			})
		}

		await logAuditEvent({
			userId,
			action: AuditAction.COMPANY_UPDATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Empresa actualizada: ${company.name} (ID: ${company.idCompany}). ${changes.length > 0 ? changes.join(', ') : 'Sin cambios'}`,
		})

		const response: ApiResponse<Company> = {
			data: prismaCompanyToCompany(company),
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Empresa no encontrada',
				}
				return NextResponse.json(errorResponse, { status: 404 })
			}

			if (error.code === 'P2002') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe una empresa con este nombre',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		console.error('Error updating company:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * DELETE /api/admin/companies/[id]
 * Deletes a company (soft delete - sets status to false)
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}
	const { session } = guard

	try {
		const { id } = await params
		const companyId = parseInt(id)

		const existingCompany = await prisma.company.findUnique({
			where: { idCompany: companyId },
		})

		if (!existingCompany) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Empresa no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Check for active products
		const activeProducts = await prisma.product.findFirst({
			where: {
				idCompany: companyId,
				status: true,
			},
		})

		if (activeProducts) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'Esta empresa está siendo utilizada en configuraciones activas. No se puede eliminar.',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Soft delete
		const company = await prisma.company.update({
			where: { idCompany: companyId },
			data: { status: false },
		})

		// Audit logging
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.COMPANY_DELETED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Empresa eliminada: ${company.name} (ID: ${company.idCompany})`,
		})

		const response: ApiResponse<Company> = {
			data: prismaCompanyToCompany(company),
		}

		return NextResponse.json(response)
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Empresa no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		console.error('Error deleting company:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al eliminar empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
