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
} from '@/features/categories/mappers/category.mapper'

/**
 * GET /api/categories
 * Lists categories with pagination and search
 */
export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const typeCategory = searchParams.get('typeCategory')
		const status = searchParams.get('status')
		const page = parseInt(searchParams.get('page') || '1')
		const pageSize = parseInt(searchParams.get('pageSize') || '10')

		const where: {
			OR?: Array<{
				code?: { contains: string; mode: 'insensitive' }
				name?: { contains: string; mode: 'insensitive' }
			}>
			typeCategory?: string
			status?: boolean
		} = {}

		if (search) {
			where.OR = [
				{ code: { contains: search, mode: 'insensitive' } },
				{ name: { contains: search, mode: 'insensitive' } },
			]
		}

		if (typeCategory) {
			where.typeCategory = typeCategory
		}

		if (status === 'active') {
			where.status = true
		} else if (status === 'inactive') {
			where.status = false
		}

		// Count total records
		const total = await prisma.category.count({ where })

		// Get categories with pagination
		const categories = await prisma.category.findMany({
			where,
			orderBy: { name: 'asc' },
			skip: (page - 1) * pageSize,
			take: pageSize,
		})

		// Transform using mapper
		const categoriesFormatted = prismaCategoryListToCategories(categories)

		const response: ApiResponse<CategoryListResponse> = {
			data: {
				categories: categoriesFormatted,
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
		const body = await request.json()
		const data = createCategorySchema.parse(body)

		// Normalize code (trim and uppercase)
		const normalizedCode = data.code.trim().toUpperCase()

		// Validate code uniqueness (case-insensitive)
		const existingCategory = await prisma.category.findFirst({
			where: {
				code: {
					equals: normalizedCode,
					mode: 'insensitive',
				},
			},
		})

		if (existingCategory) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Ya existe una categoría con este código',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Create category
		const category = await prisma.category.create({
			data: {
				code: normalizedCode,
				name: data.name.trim(),
				typeCategory: data.typeCategory,
				descripcion: data.descripcion ?? null,
				status: data.status,
			},
		})

		// Transform using mapper
		const categoryFormatted = prismaCategoryToCategory(category)

		const response: ApiResponse<Category> = {
			data: categoryFormatted,
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
				error: 'Ya existe una categoría con este código',
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		console.error('Error creating category:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al crear categoría',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
