import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCompanySchema } from '@/features/company/lib/company-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	CompanyListResponse,
	Company,
} from '@/features/company/types/company.types'
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
 * GET /api/admin/companies
 * Lists companies with pagination and search
 */
export async function GET(request: Request) {
	const guard = await requireAuth()
	if (!guard.ok) {
		return guard.response
	}

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

		const total = await prisma.company.count({ where })

		const companies = await prisma.company.findMany({
			where,
			orderBy: { name: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		const response: ApiResponse<CompanyListResponse> = {
			data: {
				companies: companies.map(prismaCompanyToCompany),
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
		console.error('Error fetching companies:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener empresas',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * POST /api/admin/companies
 * Creates a new company
 */
export async function POST(request: Request) {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}
	const { session } = guard

	try {
		const body = await request.json()
		const data = createCompanySchema.parse(body)

		// Validate unique name (case-insensitive)
		const normalizedName = data.name.trim()
		const existingCompany = await prisma.company.findFirst({
			where: {
				name: {
					equals: normalizedName,
					mode: 'insensitive',
				},
			},
		})

		if (existingCompany) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Ya existe una empresa con este nombre',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		const company = await prisma.company.create({
			data: {
				name: data.name.trim(),
				status: data.status,
				idTypeCompany: 'NACIONAL',
			},
		})

		// Audit logging
		const userId = session.user.id ? parseInt(session.user.id) : undefined
		const headers = request.headers
		await logAuditEvent({
			userId,
			action: AuditAction.COMPANY_CREATED,
			email: session.user.email || undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Empresa creada: ${company.name} (ID: ${company.idCompany})`,
		})

		const response: ApiResponse<Company> = {
			data: prismaCompanyToCompany(company),
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

		console.error('Error creating company:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al crear empresa',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
