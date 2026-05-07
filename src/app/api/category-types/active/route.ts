import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { findActiveCategoryTypes } from '@/features/category-types/services/category-type.service'
import { prismaCategoryTypeToCategoryType } from '@/features/category-types/mappers/category-type.mapper'
import type { CategoryType } from '@/features/category-types/types/category-type.types'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse<ApiResponse<CategoryType[]>>> {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { data: null, error: 'No autorizado' },
                { status: 401 }
            )
        }

        const activeCategoryTypes = await findActiveCategoryTypes()

        const formattedTypes = activeCategoryTypes.map(prismaCategoryTypeToCategoryType)

        return NextResponse.json({ data: formattedTypes })
    } catch (error) {
        console.error('Error fetching active category types:', error)
        return NextResponse.json(
            { data: null, error: 'Error al obtener los tipos de categoría activos' },
            { status: 500 }
        )
    }
}
