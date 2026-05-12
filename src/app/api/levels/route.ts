import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createLevelSchema } from '@/features/levels/lib/level-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	LevelListResponse,
	Level,
} from '@/features/levels/types/level.types'
import { z } from 'zod'
import {
	prismaLevelToLevel,
	prismaLevelListToLevels,
	type PrismaLevelWithRelations as MapperPrismaLevelWithRelations
} from '@/features/levels/mappers/level.mapper'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { logAuditEvent, AuditAction, getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'



/**
 * GET /api/levels
 * Lists levels with pagination and search
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const typeLevel = searchParams.get('typeLevel')
		const status = searchParams.get('status')
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')

		const where: Prisma.LevelWhereInput = {}

		if (search) {
			where.OR = [
				{ code: { contains: search, mode: 'insensitive' } },
				{ name: { contains: search, mode: 'insensitive' } },
			]
		}

		if (typeLevel) {
			// Level model does not have a levelType relation; typeLevel filter is a no-op
		}

		if (status === 'active') {
			where.status = true
		} else if (status === 'inactive') {
			where.status = false
		}

		// Count total records
		const total = await prisma.level.count({ where })

		// Get levels with pagination
		const rawLevels = await prisma.level.findMany({
			where,
			include: {
				fixedBeneficiaryUser: {
					select: { idUser: true, name: true, lastName: true, email: true },
				},
				nextLevel: {
					select: { idLevel: true, name: true },
				},
			},
			orderBy: { name: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})
		const levels = rawLevels as unknown as MapperPrismaLevelWithRelations[]

		// Transform using mapper
		const levelsFormatted = prismaLevelListToLevels(levels)

		const response: ApiResponse<LevelListResponse> = {
			data: {
				levels: levelsFormatted,
				pagination: {
					page,
					pageSize,
					total,
					totalPages: Math.ceil(total / pageSize),
				},
			},
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching levels:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener niveles',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * POST /api/levels
 * Creates a new level
 */
export async function POST(request: Request) {
	try {
		const session = await auth()
		const headers = request.headers
		const body = await request.json()
		const data = createLevelSchema.parse(body)

		// Normalize code
		const normalizedCode = data.code.trim().toUpperCase()

		// Validate code uniqueness
		const existingLevel = await prisma.level.findFirst({
			where: {
				code: { equals: normalizedCode, mode: 'insensitive' },
			},
		})

		if (existingLevel) {
			return NextResponse.json(
				{ data: null, error: 'Ya existe un nivel con este código' },
				{ status: 409 }
			)
		}

		// Validate beneficiary constraint before persisting
		if (
			data.beneficiaryMode === 'BENEFICIARIO_GENERAL' &&
			(data.idFixedBeneficiaryUser === null ||
				data.idFixedBeneficiaryUser === undefined)
		) {
			return NextResponse.json(
				{
					data: null,
					error: 'El usuario beneficiario fijo es requerido cuando el modo es BENEFICIARIO_GENERAL',
				},
				{ status: 400 }
			)
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
				return NextResponse.json(
					{
						data: null,
						error: 'El usuario beneficiario fijo no existe o está inactivo',
					},
					{ status: 400 }
				)
			}
		}

		const levelRaw = await prisma.level.create({
			data: {
				code: normalizedCode,
				name: data.name.trim(),
				descripcion: data.descripcion ?? null,
				color: data.color,
				status: data.status,
				beneficiaryMode: data.beneficiaryMode ?? 'OVERRIDE',
				idFixedBeneficiaryUser:
					data.beneficiaryMode === 'BENEFICIARIO_GENERAL'
						? (data.idFixedBeneficiaryUser ?? null)
						: null,
			},
			include: {
				fixedBeneficiaryUser: {
					select: { idUser: true, name: true, lastName: true, email: true },
				},
			},
		})
		const level = levelRaw as unknown as MapperPrismaLevelWithRelations

		await logAuditEvent({
			userId: session?.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.LEVEL_CREATED,
			email: session?.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Nivel creado: ${levelRaw.code} - ${levelRaw.name}`,
		})

		const response: ApiResponse<Level> = {
			data: prismaLevelToLevel(level),
		}

		return NextResponse.json(response, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ data: null, error: error.issues[0]?.message || 'Datos inválidos' },
				{ status: 400 }
			)
		}
		return NextResponse.json(
			{ data: null, error: 'Error al crear nivel' },
			{ status: 500 }
		)
	}
}
