import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCategorySchema } from '@/features/categories/lib/category-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
	CategoryListResponse,
	Category,
} from '@/features/categories/types/category.types'
import { z } from 'zod'
import {
	prismaCategoryToCategory,
	prismaCategoryListToCategories,
	type PrismaCategoryWithRelations,
} from '@/features/categories/mappers/category.mapper'
import { Prisma } from '@prisma/client'
import { auth } from '@/auth'
import { logAuditEvent, AuditAction, getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'

/**
 * GET /api/categories
 * Lists categories with pagination and optional filters
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const status = searchParams.get('status')
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')

		const where: Prisma.CategoryWhereInput = {}

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			]
		}

		if (status === 'active') {
			where.status = true
		} else if (status === 'inactive') {
			where.status = false
		}

		const total = await prisma.category.count({ where })

		const rawCategories = await prisma.category.findMany({
			where,
			include: {
				categoryType: {
					select: { name: true },
				},
			},
			orderBy: { name: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		const categories = prismaCategoryListToCategories(
			rawCategories as unknown as PrismaCategoryWithRelations[]
		)

		const response: ApiResponse<CategoryListResponse> = {
			data: {
				categories,
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
		console.error('Error fetching categories:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener categorías',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * POST /api/categories
 * Creates a new category
 */
export async function POST(request: Request) {
	try {
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json(
				{ data: null, error: 'Unauthorized' },
				{ status: 401 }
			)
		}

		const headers = request.headers
		const body = await request.json()
		const data = createCategorySchema.parse(body)

		const categoryRaw = await prisma.category.create({
			data: {
				name: data.name.trim(),
				idCategoryType: data.idCategoryType,
				description: data.description ?? null,
				status: data.status ?? true,
			},
			include: {
				categoryType: {
					select: { name: true },
				},
			},
		})

		await logAuditEvent({
			userId: session.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.CATEGORY_CREATED,
			email: session.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Categoría creada: ${categoryRaw.name}`,
		})

		const response: ApiResponse<Category> = {
			data: prismaCategoryToCategory(categoryRaw as unknown as PrismaCategoryWithRelations),
		}

		return NextResponse.json(response, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ data: null, error: error.issues[0]?.message || 'Datos inválidos' },
				{ status: 400 }
			)
		}
		console.error('Error creating category:', error)
		return NextResponse.json(
			{ data: null, error: 'Error al crear categoría' },
			{ status: 500 }
		)
	}
}
