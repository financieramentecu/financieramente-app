import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
    findCategoryTypeById,
    updateCategoryType,
    deleteCategoryType,
} from '@/features/category-types/services/category-type.service'
import { updateCategoryTypeSchema } from '@/features/category-types/lib/category-type-schemas'
import { prismaCategoryTypeToCategoryType } from '@/features/category-types/mappers/category-type.mapper'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { CategoryType } from '@/features/category-types/types/category-type.types'

/**
 * GET /api/category-types/[id]
 * Gets a specific category type by ID
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
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

        // Retrieve parameter ID safely in App Router next 15+
        const { id } = await params
        const categoryTypeId = parseInt(id)

        if (isNaN(categoryTypeId)) {
            return NextResponse.json(
                { data: null, error: 'ID de tipo categoría inválido' },
                { status: 400 }
            )
        }

        // Fetch the category type
        const categoryType = await findCategoryTypeById(categoryTypeId)

        if (!categoryType) {
            return NextResponse.json(
                { data: null, error: 'Tipo de categoría no encontrado' },
                { status: 404 }
            )
        }

        // Format output to Domain Type
        const formattedCategoryType = prismaCategoryTypeToCategoryType(categoryType)

        return NextResponse.json({ data: formattedCategoryType })
    } catch (error) {
        console.error('Error fetching category type:', error)
        return NextResponse.json(
            { data: null, error: 'Error al obtener el tipo de categoría' },
            { status: 500 }
        )
    }
}

/**
 * PUT /api/category-types/[id]
 * Updates an existing category type
 */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<
    NextResponse<
        ApiResponse<CategoryType> & {
            metadata?: { hasReferences: boolean }
        }
    >
> {
    try {
        // Check authentication
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { data: null, error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Retrieve parameter ID safely
        const { id } = await params
        const categoryTypeId = parseInt(id)

        if (isNaN(categoryTypeId)) {
            return NextResponse.json(
                { data: null, error: 'ID de tipo de categoría inválido' },
                { status: 400 }
            )
        }

        // Parse and validate body
        const body = await request.json()
        const validationResult = updateCategoryTypeSchema.safeParse(body)

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

        // Perform the update natively via Prisma through the Service
        // The service already handles reference checking when deactivating
        const updateResult = await updateCategoryType(
            categoryTypeId,
            validationResult.data
        )

        const formattedCategoryType = prismaCategoryTypeToCategoryType(
            updateResult.categoryType
        )

        // Include reference check warning if applicable
        return NextResponse.json({
            data: formattedCategoryType,
            ...(updateResult.hasReferences && {
                metadata: { hasReferences: updateResult.hasReferences },
            }),
        })
    } catch (error) {
        console.error('Error updating category type:', error)

        if (
            error instanceof Error &&
            error.message === 'Tipo de categoría no encontrado'
        ) {
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 404 }
            )
        }

        if (error instanceof Error && error.message.includes('Ya existe')) {
            return NextResponse.json(
                { data: null, error: error.message },
                { status: 409 }
            )
        }

        return NextResponse.json(
            { data: null, error: 'Error al actualizar el tipo de categoría' },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/category-types/[id]
 * Toggles active status of a category type
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<CategoryType>>> {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { data: null, error: 'No autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params
        const categoryTypeId = parseInt(id)

        if (isNaN(categoryTypeId)) {
            return NextResponse.json(
                { data: null, error: 'ID de tipo categoría inválido' },
                { status: 400 }
            )
        }

        const categoryType = await findCategoryTypeById(categoryTypeId)
        if (!categoryType) {
            return NextResponse.json(
                { data: null, error: 'Tipo de categoría no encontrado' },
                { status: 404 }
            )
        }

        const updateResult = await updateCategoryType(categoryTypeId, {
            status: !categoryType.status,
        })

        const formattedCategoryType = prismaCategoryTypeToCategoryType(
            updateResult.categoryType
        )

        return NextResponse.json({ data: formattedCategoryType })
    } catch (error) {
        console.error('Error toggling category type status:', error)
        return NextResponse.json(
            { data: null, error: 'Error al cambiar el estado' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/category-types/[id]
 * Deletes a category type
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ApiResponse<null>>> {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { data: null, error: 'No autorizado' },
                { status: 401 }
            )
        }

        const { id } = await params
        const categoryTypeId = parseInt(id)

        if (isNaN(categoryTypeId)) {
            return NextResponse.json(
                { data: null, error: 'ID de tipo categoría inválido' },
                { status: 400 }
            )
        }

        await deleteCategoryType(categoryTypeId)

        return NextResponse.json({ data: null })
    } catch (error) {
        console.error('Error deleting category type:', error)
        if (error instanceof Error && error.message.includes('No se puede eliminar')) {
             return NextResponse.json(
                 { data: null, error: error.message },
                 { status: 409 }
             )
        }
        return NextResponse.json(
            { data: null, error: 'Error al eliminar el tipo de categoría' },
            { status: 500 }
        )
    }
}

