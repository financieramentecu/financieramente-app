import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createEmpresaSchema } from '@/features/empresas/lib/empresa-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	EmpresaListResponse,
	Empresa,
} from '@/features/empresas/types/empresa.types'
import { z } from 'zod'
import { auth } from '@/auth'
import {
	logAuditEvent,
	AuditAction,
	getClientIp,
	getUserAgent,
} from '@/features/auth/lib/audit-logger'

/**
 * GET /api/empresas
 * Lista empresas con paginación y búsqueda
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
		const total = await prisma.company.count({ where })

		// Obtener empresas con paginación
		const empresas = await prisma.company.findMany({
			where,
			orderBy: { name: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		// Formatear fechas a string
		const empresasFormatted: Empresa[] = empresas.map((empresa) => ({
			idCompany: empresa.idCompany,
			name: empresa.name,
			status: empresa.status,
			createdAt: empresa.createdAt.toISOString(),
			updatedAt: empresa.updatedAt.toISOString(),
		}))

		const response: ApiResponse<EmpresaListResponse> = {
			data: {
				empresas: empresasFormatted,
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
		console.error('Error fetching empresas:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener empresas',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * POST /api/empresas
 * Crea una nueva empresa
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
		const data = createEmpresaSchema.parse(body)

		// Validar unicidad de nombre (case-insensitive)
		const normalizedName = data.name.trim()
		const existingEmpresa = await prisma.company.findFirst({
			where: {
				name: {
					equals: normalizedName,
					mode: 'insensitive',
				},
			},
		})

		if (existingEmpresa) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Ya existe una empresa con este nombre',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Crear empresa (normalizar nombre)
		const empresa = await prisma.company.create({
			data: {
				name: data.name.trim(),
				status: data.status,
				idTypeCompany: 'NACIONAL', // Valor por defecto según schema
			},
		})

		// Registrar auditoría
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.COMPANY_CREATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Empresa creada: ${empresa.name} (ID: ${empresa.idCompany})`,
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
				error: 'Ya existe una empresa con este nombre',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		console.error('Error creating empresa:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al crear empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
