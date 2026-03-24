import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCategorySchema } from '@/features/categories/lib/category-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { Category } from '@/features/categories/types/category.types'
import { z } from 'zod'
import { prismaCategoryToCategory } from '@/features/categories/mappers/category.mapper'

/**
 * GET /api/categories/[id]
 * Gets a category by ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const category = await prisma.category.findUnique({
			where: { idCategory: parseInt(id) },
		})

		if (!category) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Categoría no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const categoryFormatted = prismaCategoryToCategory(category)

		const response: ApiResponse<Category> = {
			data: categoryFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error fetching category:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al obtener categoría',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * PUT /api/categories/[id]
 * Updates an existing category
 */
export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const categoryId = parseInt(id)
		const body = await request.json()
		const data = updateCategorySchema.parse(body)

		// Get existing category
		const existingCategory = await prisma.category.findUnique({
			where: { idCategory: categoryId },
		})

		if (!existingCategory) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Categoría no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Validate code uniqueness if changing
		if (data.code) {
			const normalizedCode = data.code.trim().toUpperCase()

			if (
				normalizedCode.toLowerCase() !== existingCategory.code.toLowerCase()
			) {
				const duplicateCategory = await prisma.category.findFirst({
					where: {
						code: {
							equals: normalizedCode,
							mode: 'insensitive',
						},
						NOT: {
							idCategory: categoryId,
						},
					},
				})

				if (duplicateCategory) {
					const errorResponse: ApiResponse<null> = {
						data: null,
						error: 'Ya existe una categoría con este código',
					}
					return NextResponse.json(errorResponse, { status: 409 })
				}
			}
		}

		// Prepare update data
		const updateData: {
			code?: string
			name?: string
			typeCategory?: string
			idCategoryType?: number
			descripcion?: string | null
			status?: boolean
		} = {}

		if (data.code) updateData.code = data.code.trim().toUpperCase()
		if (data.name) updateData.name = data.name.trim()
		if (data.descripcion !== undefined)
			updateData.descripcion = data.descripcion
		if (data.status !== undefined) updateData.status = data.status

		if (data.typeCategory) {
			const categoryTypeRec = await prisma.categoryType.findFirst({
				where: { name: { equals: data.typeCategory, mode: 'insensitive' } },
			})

			if (!categoryTypeRec) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Tipo de categoría no válido',
				}
				return NextResponse.json(errorResponse, { status: 400 })
			}

			updateData.typeCategory = data.typeCategory
			updateData.idCategoryType = categoryTypeRec.id
		}

		// Update category
		const category = await prisma.category.update({
			where: { idCategory: categoryId },
			data: updateData,
		})

		// Transform using mapper
		const categoryFormatted = prismaCategoryToCategory(category)

		const response: ApiResponse<Category> = {
			data: categoryFormatted,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: error.issues[0]?.message || 'Datos inválidos',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Categoría no encontrada',
				}
				return NextResponse.json(errorResponse, { status: 404 })
			}

			if (error.code === 'P2002') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Ya existe una categoría con este código',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		console.error('Error updating category:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al actualizar categoría',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}

/**
 * DELETE /api/categories/[id]
 * Deletes a category
 */
export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const categoryId = parseInt(id)

		// Check if category exists
		const existingCategory = await prisma.category.findUnique({
			where: { idCategory: categoryId },
		})

		if (!existingCategory) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Categoría no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		// Check for relationships (users assigned to this category)
		const usersWithCategory = await prisma.user.count({
			where: { idCategoria: categoryId },
		})

		if (usersWithCategory > 0) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: `No se puede eliminar la categoría porque tiene ${usersWithCategory} usuario(s) asignado(s)`,
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Check for relationships (ProductConfiguration by category)
		const commissionsWithCategory = await prisma.productConfiguration.count({
			where: { idCategory: categoryId },
		})

		if (commissionsWithCategory > 0) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: `No se puede eliminar la categoría porque tiene ${commissionsWithCategory} comisión(es) de producto asignada(s)`,
			}
			return NextResponse.json(errorResponse, { status: 409 })
		}

		// Delete category
		await prisma.category.delete({
			where: { idCategory: categoryId },
		})

		const response: ApiResponse<void> = {
			data: undefined,
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'Categoría no encontrada',
				}
				return NextResponse.json(errorResponse, { status: 404 })
			}

			if (error.code === 'P2003') {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error:
						'No se puede eliminar la categoría porque tiene registros relacionados',
				}
				return NextResponse.json(errorResponse, { status: 409 })
			}
		}

		console.error('Error deleting category:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al eliminar categoría',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
