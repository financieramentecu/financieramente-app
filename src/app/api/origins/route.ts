import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClientOriginSchema } from '@/features/origin-client/lib/client-origin-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	ClientOriginListResponse,
	ClientOrigin,
} from '@/features/origin-client/types/client-origin.types'
import { z } from 'zod'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'
import {
	prismaClientOriginToClientOrigin,
	prismaClientOriginListToClientOrigins,
} from '@/features/origin-client/mappers/prisma.mapper'

/**
 * GET /api/origins
 * Lista orígenes de cliente con paginación y búsqueda
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const status = searchParams.get('status')
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')

		const where: {
			name?: { contains: string; mode: 'insensitive' }
			status?: boolean
		} = {}

		if (search) {
			where.name = { contains: search, mode: 'insensitive' }
		}

		if (status === 'active') {
			where.status = true
		} else if (status === 'inactive') {
			where.status = false
		}

		// Contar total de registros
		const total = await prisma.clientOrigin.count({ where })

		// Obtener orígenes con paginación
		const origins = await prisma.clientOrigin.findMany({
			where,
			orderBy: { name: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		// Transformar usando mapper
		const originsFormatted = prismaClientOriginListToClientOrigins(origins)

		const response: ApiResponse<ClientOriginListResponse> = {
			data: {
				origins: originsFormatted,
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
		console.error('Error fetching client origins:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener orígenes de cliente',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * POST /api/origins
 * Crea un nuevo origen de cliente
 */
export async function POST(request: Request) {
	try {
		const session = await auth()
		if (!session?.user) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'No autorizado',
			}
			return NextResponse.json(errorResponse, { status: 401 })
		}

		const body = await request.json()
		const data = createClientOriginSchema.parse(body)

		// Normalizar nombre (trim y capitalizar primera letra)
		const normalizedName = data.name.trim()
		const capitalizedName =
			normalizedName.charAt(0).toUpperCase() + normalizedName.slice(1)

		// Validar unicidad de nombre (case-insensitive)
		const existingOrigin = await prisma.clientOrigin.findFirst({
			where: {
				name: {
					equals: normalizedName,
					mode: 'insensitive',
				},
			},
		})

		if (existingOrigin) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Ya existe un origen con este nombre',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Crear origen
		const origin = await prisma.clientOrigin.create({
			data: {
				name: capitalizedName,
				description: data.description ?? null,
				status: data.status ?? true,
			},
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.CLIENT_ORIGIN_CREATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Origen de cliente creado: ${origin.name} (ID: ${origin.idClientOrigin})`,
		})

		// Transformar usando mapper
		const originFormatted = prismaClientOriginToClientOrigin(origin)

		const response: ApiResponse<ClientOrigin> = {
			data: originFormatted,
		}

		return NextResponse.json(response, { status: 201 })
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
			'code' in error &&
			error.code === 'P2002'
		) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Ya existe un origen con este nombre',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		console.error('Error creating client origin:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al crear origen de cliente',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
