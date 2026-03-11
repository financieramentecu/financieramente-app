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
import { Prisma } from '@prisma/client'

// Temporary mapping for legacy compatibility
const TYPE_NAME_TO_ID: Record<string, number> = {
	MMS: 1,
	ALIADO: 2,
	TRINITY: 3,
}

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

		const where: Prisma.CategoryWhereInput = {}

		if (search) {
			where.OR = [
				{ code: { contains: search, mode: 'insensitive' } },
				{ name: { contains: search, mode: 'insensitive' } },
			]
		}

		if (typeCategory) {
			const typeId = TYPE_NAME_TO_ID[typeCategory]
			if (typeId) {
				where.idCategoryType = typeId
			}
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
			include: { categoryType: true },
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

		// Create category mapping typeCategory string to ID
		const typeId = TYPE_NAME_TO_ID[data.typeCategory] || 1

		// Normalize code
		const normalizedCode = data.code.trim().toUpperCase()

		// Validate code uniqueness
		const existingCategory = await prisma.category.findFirst({
			where: {
				code: { equals: normalizedCode, mode: 'insensitive' },
			},
		})

		if (existingCategory) {
			return NextResponse.json(
				{ data: null, error: 'Ya existe una categoría con este código' },
				{ status: 409 }
			)
		}

		const category = await prisma.category.create({
			data: {
				code: normalizedCode,
				name: data.name.trim(),
				idCategoryType: typeId,
				descripcion: data.descripcion ?? null,
				status: data.status,
			},
			include: { categoryType: true },
		})

		const response: ApiResponse<Category> = {
			data: prismaCategoryToCategory(category),
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
			{ data: null, error: 'Error al crear categoría' },
			{ status: 500 }
		)
	}
}
