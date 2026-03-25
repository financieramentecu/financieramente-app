import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
    findCategoryTypes,
    createCategoryType,
} from '@/features/category-types/services/category-type.service'
import { createCategoryTypeSchema } from '@/features/category-types/lib/category-type-schemas'
import {
    prismaCategoryTypeListToCategoryTypes,
    prismaCategoryTypeToCategoryType,
} from '@/features/category-types/mappers/category-type.mapper'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type {
    CategoryType,
    CategoryTypeListResponse,
    CategoryTypeFilters,
} from '@/features/category-types/types/category-type.types'

/**
 * GET /api/category-types
 * Lists category types with pagination and search
 */
export async function GET(
    request: Request
): Promise<NextResponse<ApiResponse<CategoryTypeListResponse>>> {
    try {
        // Check authentication
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { data: null, error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Parse search params
        const { searchParams } = new URL(request.url)

        const page = Number(searchParams.get('page')) || 1
        const pageSize = Number(searchParams.get('pageSize')) || 10

        const filters: CategoryTypeFilters = {
            search: searchParams.get('search') || undefined,
            status: searchParams.get('status') || undefined,
        }

        // Get category types with pagination
        const result = await findCategoryTypes(filters, page, pageSize)

        // Format response
        const categoryTypesFormatted = prismaCategoryTypeListToCategoryTypes(
            result.categoryTypes
        )

        return NextResponse.json({
            data: {
                categoryTypes: categoryTypesFormatted,
                pagination: {
                    page: result.page,
                    pageSize: result.pageSize,
                    total: result.total,
                    totalPages: result.totalPages,
                },
            },
        })
    } catch (error) {
        console.error('Error fetching category types:', error)
        return NextResponse.json(
            { data: null, error: 'Error al obtener los tipos de categorías' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/category-types
 * Creates a new category type
 */
export async function POST(
    request: Request
): Promise<NextResponse<ApiResponse<CategoryType>>> {
    try {
        // Check authentication
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { data: null, error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Parse and validate body
        const body = await request.json()
        const validationResult = createCategoryTypeSchema.safeParse(body)

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    data: null,
                    error: 'Datos inválidos',
                    details: validationResult.error.format(),
                },
                { status: 400 }
            )
        }

        // Create category type
        const newCategoryType = await createCategoryType(validationResult.data)

        // Format response
        const formattedCategoryType =
            prismaCategoryTypeToCategoryType(newCategoryType)

        return NextResponse.json(
            { data: formattedCategoryType },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating category type:', error)

        // Check for specific known errors (like duplicate name)
        if (error instanceof Error && error.message.includes('Ya existe')) {
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { data: null, error: 'Error al crear el tipo de categoría' },
            { status: 500 }
        )
    }
}
