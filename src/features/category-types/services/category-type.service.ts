import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
    CreateCategoryTypeFormData,
    UpdateCategoryTypeFormData,
} from '../lib/category-type-schemas'
import { CategoryTypeFilters } from '../types/category-type.types'

/**
 * Find all category types with pagination and optional filters
 */
export async function findCategoryTypes(
    filters: CategoryTypeFilters,
    page: number,
    pageSize: number
) {
    const skip = (page - 1) * pageSize

    // Build where clause based on filters
    const whereClause: Prisma.CategoryTypeWhereInput = {}

    if (filters.search) {
        whereClause.name = {
            contains: filters.search,
            mode: 'insensitive',
        }
    }

    if (filters.status !== undefined && filters.status !== '') {
        whereClause.status = filters.status === 'true'
    }

    // Execute queries in parallel
    const [total, categoryTypes] = await Promise.all([
        prisma.categoryType.count({ where: whereClause }),
        prisma.categoryType.findMany({
            where: whereClause,
            skip,
            take: pageSize,
            orderBy: { createdAt: 'desc' },
        }),
    ])

    return {
        categoryTypes,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    }
}

/**
 * Find active category types only, no pagination
 */
export async function findActiveCategoryTypes() {
    return prisma.categoryType.findMany({
        where: { status: true },
        orderBy: { name: 'asc' },
    })
}

/**
 * Find a single category type by ID
 */
export async function findCategoryTypeById(id: number) {
    return prisma.categoryType.findUnique({
        where: { id },
    })
}

/**
 * Count references to a category type from categories
 */
export async function countCategoryTypeReferences(id: number) {
    return prisma.category.count({
        where: { idCategoryType: id },
    })
}

/**
 * Check if a name is taken by another category type
 */
export async function isNameAvailable(name: string, excludeId?: number) {
    const existing = await prisma.categoryType.findUnique({
        where: { name },
    })

    if (!existing) return true
    return existing.id === excludeId
}

/**
 * Create a new category type
 */
export async function createCategoryType(data: CreateCategoryTypeFormData) {
    const isAvailable = await isNameAvailable(data.name)

    if (!isAvailable) {
        throw new Error('Ya existe un tipo de categoría con ese nombre')
    }

    return prisma.categoryType.create({
        data: {
            name: data.name,
            description: data.description,
            status: data.status,
        },
    })
}

/**
 * Update an existing category type
 */
export async function updateCategoryType(
    id: number,
    data: UpdateCategoryTypeFormData
) {
    const existing = await findCategoryTypeById(id)

    if (!existing) {
        throw new Error('Tipo de categoría no encontrado')
    }

    // Check name availability if name is being changed
    if (data.name && data.name !== existing.name) {
        const isAvailable = await isNameAvailable(data.name, id)
        if (!isAvailable) {
            throw new Error('Ya existe un tipo de categoría con ese nombre')
        }
    }

    let hasReferences = false

    // If deactivating, check for references
    if (data.status === false && existing.status === true) {
        const refs = await countCategoryTypeReferences(id)
        hasReferences = refs > 0
    }

    const updated = await prisma.categoryType.update({
        where: { id },
        data,
    })

    return {
        categoryType: updated,
        hasReferences,
    }
}
/**
 * Delete a category type (Logical Elimination)
 */
export async function deleteCategoryType(id: number) {
    const existing = await findCategoryTypeById(id)

    if (!existing) {
        throw new Error('Tipo de categoría no encontrado')
    }

    // Perform logical delete by setting status to false
    return prisma.categoryType.update({
        where: { id },
        data: { status: false },
    })
}
