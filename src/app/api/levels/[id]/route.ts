import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateLevelSchema } from '@/features/levels/lib/level-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { Level } from '@/features/levels/types/level.types'
import { z } from 'zod'
import {
	prismaLevelToLevel,
	type PrismaLevelWithRelations as MapperPrismaLevelWithRelations
} from '@/features/levels/mappers/level.mapper'
import { auth } from '@/auth'
import { logAuditEvent, AuditAction, getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'

/**
 * GET /api/levels/[id]
 * Gets a level by ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const levelRaw = await prisma.level.findUnique({
			where: { idLevel: parseInt(id) },
			include: {
				fixedBeneficiaryUser: {
					select: { idUser: true, name: true, lastName: true, email: true },
				},
			},
		})
		const level = levelRaw as unknown as MapperPrismaLevelWithRelations

		if (!level) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Nivel no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const levelFormatted = prismaLevelToLevel(level)

		const response: ApiResponse<Level> = {
			data: levelFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching level:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener nivel',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PUT /api/levels/[id]
 * Updates an existing level
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		const headers = request.headers
		const { id } = await params
		const levelId = parseInt(id)
		const body = await request.json()
		const data = updateLevelSchema.parse(body)

		// Get existing level
		const existingLevel = await prisma.level.findUnique({
			where: { idLevel: levelId },
		})

		if (!existingLevel) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Nivel no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Validate code uniqueness if changing
		if (data.code) {
			const normalizedCode = data.code.trim().toUpperCase()

			if (
				normalizedCode.toLowerCase() !== existingLevel.code.toLowerCase()
			) {
				const duplicateLevel = await prisma.level.findFirst({
					where: {
						code: {
							equals: normalizedCode,
							mode: 'insensitive',
						},
						NOT: {
							idLevel: levelId,
						},
					},
				})

				if (duplicateLevel) {
					const errorResponse: ApiResponse<null> = {
						data: null,
						error: 'Ya existe un nivel con este código',
					}
					return NextResponse.json(errorResponse, { status: 409 })
				}
			}
		}

		// Validate beneficiary constraint before persisting
		if (
			data.beneficiaryMode === 'BENEFICIARIO_GENERAL' &&
			(data.idFixedBeneficiaryUser === null ||
				data.idFixedBeneficiaryUser === undefined)
		) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'El usuario beneficiario fijo es requerido cuando el modo es BENEFICIARIO_GENERAL',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Verify fixed beneficiary user exists and is active
		if (
			data.beneficiaryMode === 'BENEFICIARIO_GENERAL' &&
			data.idFixedBeneficiaryUser != null
		) {
			const beneficiaryUser = await prisma.user.findFirst({
				where: { idUser: data.idFixedBeneficiaryUser, active: true },
			})
			if (!beneficiaryUser) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'El usuario beneficiario fijo no existe o está inactivo',
				}
				return NextResponse.json(errorResponse, { status: 400 })
			}
		}

		// Prepare update data
		const updateData: {
			code?: string
			name?: string
			idLevelType?: number
			descripcion?: string | null
			color?: string
			status?: boolean
			beneficiaryMode?: 'OVERRIDE' | 'BENEFICIARIO_GENERAL'
			idFixedBeneficiaryUser?: number | null
			idNextLevel?: number | null
		} = {}

		if (data.code) updateData.code = data.code.trim().toUpperCase()
		if (data.name) updateData.name = data.name.trim()
		if (data.descripcion !== undefined)
			updateData.descripcion = data.descripcion
		if (data.color !== undefined) updateData.color = data.color
		if (data.status !== undefined) updateData.status = data.status
		if (data.beneficiaryMode !== undefined)
			updateData.beneficiaryMode = data.beneficiaryMode
		if ('idFixedBeneficiaryUser' in data)
			updateData.idFixedBeneficiaryUser =
				data.beneficiaryMode === 'OVERRIDE'
					? null
					: (data.idFixedBeneficiaryUser ?? null)
		if ('idNextLevel' in data)
			updateData.idNextLevel = data.idNextLevel ?? null

		if (data.typeLevel) {
			const levelTypeRec = await prisma.categoryType.findFirst({
				where: { name: { equals: data.typeLevel, mode: 'insensitive' } },
			})

			if (!levelTypeRec) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Tipo de nivel no válido',
				}
				return NextResponse.json(errorResponse, { status: 400 })
			}

			updateData.idLevelType = levelTypeRec.id
		}

		const levelRaw = await prisma.level.update({
			where: { idLevel: levelId },
			data: updateData,
			include: {
				fixedBeneficiaryUser: {
					select: { idUser: true, name: true, lastName: true, email: true },
				},
			},
		})
		const level = levelRaw as unknown as MapperPrismaLevelWithRelations

		await logAuditEvent({
			userId: session?.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.LEVEL_UPDATED,
			email: session?.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Nivel actualizado: ${levelRaw.code} - ${levelRaw.name}`,
		})

		// Transform using mapper
		const levelFormatted = prismaLevelToLevel(level)

		const response: ApiResponse<Level> = {
			data: levelFormatted,
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
					error: 'Nivel no encontrado',
				}
				return NextResponse.json(errorResponse, { status: 404 })
			}

			if (error.code === 'P2002') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe un nivel con este código',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		console.error('Error updating level:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar nivel',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * DELETE /api/levels/[id]
 * Soft-deletes a level (sets status to false)
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()
		const headers = request.headers
		const { id } = await params
		const levelId = parseInt(id)

		// Check if level exists
		const existingLevel = await prisma.level.findUnique({
			where: { idLevel: levelId },
		})

		if (!existingLevel) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Nivel no encontrado',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		await prisma.level.update({
			where: { idLevel: levelId },
			data: { status: false },
		})

		await logAuditEvent({
			userId: session?.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.LEVEL_DEACTIVATED,
			email: session?.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Nivel desactivado: ${existingLevel.code} - ${existingLevel.name}`,
		})

		const response: ApiResponse<{ success: boolean }> = {
			data: { success: true },
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error deleting level:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al eliminar nivel',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
