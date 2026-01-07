import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateEmpresaSchema } from '@/features/empresas/lib/empresa-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { Empresa } from '@/features/empresas/types/empresa.types'
import { z } from 'zod'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/lib/auth/audit-logger'

/**
 * GET /api/empresas/[id]
 * Obtiene una empresa por ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const empresa = await prisma.company.findUnique({
			where: { idCompany: parseInt(id) },
		})

		if (!empresa) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Empresa no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const empresaFormatted: Empresa = {
			idCompany: empresa.idCompany,
			name: empresa.name,
			status: empresa.status,
			createdAt: empresa.createdAt.toISOString(),
			updatedAt: empresa.updatedAt.toISOString(),
		}

		const response: ApiResponse<Empresa> = {
			data: empresaFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching empresa:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PUT /api/empresas/[id]
 * Actualiza una empresa existente
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'No autorizado',
			}
			return NextResponse.json(errorResponse, { status: 401 })
		}

		const { id } = await params
		const empresaId = parseInt(id)
		const body = await request.json()
		const data = updateEmpresaSchema.parse(body)

		// Obtener empresa actual para comparar cambios
		const existingEmpresa = await prisma.company.findUnique({
			where: { idCompany: empresaId },
		})

		if (!existingEmpresa) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Empresa no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Validar unicidad de nombre si se está cambiando (case-insensitive)
		if (data.name && data.name.trim().toLowerCase() !== existingEmpresa.name.toLowerCase()) {
			const normalizedName = data.name.trim()
			const duplicateEmpresa = await prisma.company.findFirst({
				where: {
					name: {
						equals: normalizedName,
						mode: 'insensitive',
					},
					NOT: {
						idCompany: empresaId,
					},
				},
			})

			if (duplicateEmpresa) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe una empresa con este nombre',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		// Validar impacto al cambiar estado a Inactiva
		if (data.status === false && existingEmpresa.status === true) {
			// Verificar si la empresa está siendo utilizada en productos activos
			const productosActivos = await prisma.product.findFirst({
				where: {
					idCompany: empresaId,
					status: true,
				},
			})

			if (productosActivos) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error:
						'Esta empresa está siendo utilizada en configuraciones activas. No se puede desactivar.',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		// Preparar datos para actualizar
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

		// Actualizar empresa
		const empresa = await prisma.company.update({
			where: { idCompany: empresaId },
			data: updateData,
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		const changes: string[] = []

		if (data.name && data.name !== existingEmpresa.name) {
			changes.push(
				`Nombre: "${existingEmpresa.name}" → "${data.name}"`
			)
		}

		if (data.status !== undefined && data.status !== existingEmpresa.status) {
			changes.push(
				`Estado: ${existingEmpresa.status ? 'Activa' : 'Inactiva'} → ${data.status ? 'Activa' : 'Inactiva'}`
			)

			// Registrar cambio de estado específico
			await logAuditEvent({
				userId,
				action: AuditAction.COMPANY_STATUS_CHANGED,
				email: session.user.email || undefined,
				ipAddress: getClientIp(headers),
				userAgent: getUserAgent(headers),
				details: `Estado de empresa cambiado: ${empresa.name} (ID: ${empresa.idCompany}). ${changes.join(', ')}`,
			})
		}

		// Registrar actualización general
		await logAuditEvent({
			userId,
			action: AuditAction.COMPANY_UPDATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Empresa actualizada: ${empresa.name} (ID: ${empresa.idCompany}). ${changes.length > 0 ? changes.join(', ') : 'Sin cambios'}`,
		})

		const empresaFormatted: Empresa = {
			idCompany: empresa.idCompany,
			name: empresa.name,
			status: empresa.status,
			createdAt: empresa.createdAt.toISOString(),
			updatedAt: empresa.updatedAt.toISOString(),
		}

		const response: ApiResponse<Empresa> = {
			data: empresaFormatted,
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

		if (
			error &&
			typeof error === 'object' &&
			'code' in error
		) {
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

		console.error('Error updating empresa:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * DELETE /api/empresas/[id]
 * Elimina una empresa (soft delete - actualiza status a false)
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		if (!session?.user) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'No autorizado',
			}
			return NextResponse.json(errorResponse, { status: 401 })
		}

		const { id } = await params
		const empresaId = parseInt(id)

		// Verificar si la empresa existe
		const existingEmpresa = await prisma.company.findUnique({
			where: { idCompany: empresaId },
		})

		if (!existingEmpresa) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Empresa no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Verificar si la empresa está siendo utilizada en productos activos
		const productosActivos = await prisma.product.findFirst({
			where: {
				idCompany: empresaId,
				status: true,
			},
		})

		if (productosActivos) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'Esta empresa está siendo utilizada en configuraciones activas. No se puede eliminar.',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Soft delete - actualizar status a false
		const empresa = await prisma.company.update({
			where: { idCompany: empresaId },
			data: { status: false },
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.COMPANY_DELETED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Empresa eliminada: ${empresa.name} (ID: ${empresa.idCompany})`,
		})

		const empresaFormatted: Empresa = {
			idCompany: empresa.idCompany,
			name: empresa.name,
			status: empresa.status,
			createdAt: empresa.createdAt.toISOString(),
			updatedAt: empresa.updatedAt.toISOString(),
		}

		const response: ApiResponse<Empresa> = {
			data: empresaFormatted,
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

		console.error('Error deleting empresa:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al eliminar empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

