import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateClientOriginSchema } from '@/features/origins/lib/client-origin-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { ClientOrigin } from '@/features/origins/types/client-origin.types'
import { z } from 'zod'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import { prismaClientOriginToClientOrigin } from '@/features/origins/mappers/prisma.mapper'

/**
 * GET /api/origins/[id]
 * Obtiene un origen de cliente por ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const origin = await prisma.clientOrigin.findUnique({
			where: { idClientOrigin: parseInt(id) },
		})

		if (!origin) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Origen de cliente no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const originFormatted = prismaClientOriginToClientOrigin(origin)

		const response: ApiResponse<ClientOrigin> = {
			data: originFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching client origin:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener origen de cliente',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PUT /api/origins/[id]
 * Actualiza un origen de cliente existente
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
		const originId = parseInt(id)
		const body = await request.json()
		const data = updateClientOriginSchema.parse(body)

		// Obtener origen actual para comparar cambios
		const existingOrigin = await prisma.clientOrigin.findUnique({
			where: { idClientOrigin: originId },
		})

		if (!existingOrigin) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Origen de cliente no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Validar unicidad de nombre si se está cambiando
		const normalizedName = data.name?.trim()

		if (
			normalizedName &&
			normalizedName.toLowerCase() !== existingOrigin.name.toLowerCase()
		) {


			const duplicateOrigin = await prisma.clientOrigin.findFirst({
				where: {
					name: {
						equals: normalizedName,
						mode: 'insensitive',
					},
					NOT: {
						idClientOrigin: originId,
					},
				},
			})

			if (duplicateOrigin) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe un origen con este nombre',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		// Validar impacto al cambiar estado a Inactivo
		if (data.status === false && existingOrigin.status === true) {
			// Verificar si el origen está siendo utilizado en Business
			const businessesCount = await prisma.business.count({
				where: {
					idClientOrigin: originId,
				},
			})

			if (businessesCount > 0) {
				// Permitir desactivar pero registrar advertencia en auditoría
				const userId = session.user.id ? parseInt(session.user.id) : undefined
				const headers = request.headers
				await logAuditEvent({
					userId,
					action: AuditAction.CLIENT_ORIGIN_UPDATED,
					email: session.user.email || undefined,
					ipAddress: getClientIp(headers),
					userAgent: getUserAgent(headers),
					details: `Advertencia: Origen desactivado con ${businessesCount} negocio(s) asociado(s). Origen: ${existingOrigin.name} (ID: ${originId})`,
				})
			}
		}

		// Preparar datos para actualizar
		const updateData: {
			name?: string
			description?: string | null
			status?: boolean
		} = {}

		if (data.name !== undefined) {
			const capitalizedName =
				data.name.trim().charAt(0).toUpperCase() + data.name.trim().slice(1)
			updateData.name = capitalizedName
		}

		if (data.description !== undefined) {
			updateData.description = data.description || null
		}

		if (data.status !== undefined) {
			updateData.status = data.status
		}

		// Actualizar origen
		const origin = await prisma.clientOrigin.update({
			where: { idClientOrigin: originId },
			data: updateData,
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		const changes: string[] = []

		if (data.name && data.name !== existingOrigin.name) {
			changes.push(`Nombre: "${existingOrigin.name}" → "${data.name}"`)
		}

		if (
			data.description !== undefined &&
			data.description !== existingOrigin.description
		) {
			changes.push(
				`Descripción: "${existingOrigin.description || 'Sin descripción'}" → "${data.description || 'Sin descripción'}"`
			)
		}

		if (data.status !== undefined && data.status !== existingOrigin.status) {
			changes.push(
				`Estado: ${existingOrigin.status ? 'Activo' : 'Inactivo'} → ${data.status ? 'Activo' : 'Inactivo'}`
			)
		}

		await logAuditEvent({
			userId,
			action: AuditAction.CLIENT_ORIGIN_UPDATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Origen de cliente actualizado: ${origin.name} (ID: ${origin.idClientOrigin}). ${changes.length > 0 ? changes.join(', ') : 'Sin cambios'}`,
		})

		const originFormatted = prismaClientOriginToClientOrigin(origin)

		const response: ApiResponse<ClientOrigin> = {
			data: originFormatted,
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
					error: 'Origen de cliente no encontrado',
				}
				return NextResponse.json(errorResponse, { status: 404 })
			}

			if (error.code === 'P2002') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe un origen con este nombre',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		console.error('Error updating client origin:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar origen de cliente',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * DELETE /api/origins/[id]
 * Elimina un origen de cliente
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
		const originId = parseInt(id)

		// Verificar si el origen existe
		const existingOrigin = await prisma.clientOrigin.findUnique({
			where: { idClientOrigin: originId },
		})

		if (!existingOrigin) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Origen de cliente no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Verificar si el origen está siendo utilizado en Business
		const businessesCount = await prisma.business.count({
			where: {
				idClientOrigin: originId,
			},
		})

		if (businessesCount > 0) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: `Este origen tiene ${businessesCount} negocio(s) asociado(s). No se puede eliminar.`,
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Eliminar origen
		await prisma.clientOrigin.delete({
			where: { idClientOrigin: originId },
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.CLIENT_ORIGIN_DELETED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Origen de cliente eliminado: ${existingOrigin.name} (ID: ${existingOrigin.idClientOrigin})`,
		})

		const response: ApiResponse<void> = {
			data: undefined,
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
				error: 'Origen de cliente no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		console.error('Error deleting client origin:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al eliminar origen de cliente',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
