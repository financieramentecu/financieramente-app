import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCategorySchema } from '@/features/categories/lib/category-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { Category } from '@/features/categories/types/category.types'
import { z } from 'zod'
import { 
	prismaCategoryToCategory,
	type PrismaCategoryWithRelations as MapperPrismaCategoryWithRelations 
} from '@/features/categories/mappers/category.mapper'

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
		const categoryRaw = await prisma.category.findUnique({
			where: { idCategory: parseInt(id) },
			include: {
				fixedBeneficiaryUser: {
					select: { idUser: true, name: true, lastName: true, email: true },
				},
			},
		})
		const category = categoryRaw as unknown as MapperPrismaCategoryWithRelations

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

		// Validate beneficiary constraint before persisting
		if (
			data.beneficiaryMode === 'FIXED_BENEFICIARY' &&
			(data.idFixedBeneficiaryUser === null ||
				data.idFixedBeneficiaryUser === undefined)
		) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error:
					'El usuario beneficiario fijo es requerido cuando el modo es FIXED_BENEFICIARY',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		// Verify fixed beneficiary user exists and is active
		if (
			data.beneficiaryMode === 'FIXED_BENEFICIARY' &&
			data.idFixedBeneficiaryUser != null
		) {
			const beneficiaryUser = await prisma.user.findFirst({
				where: { idUser: data.idFixedBeneficiaryUser, active: true },
			})
			if (!beneficiaryUser) {
				const errorResponse: ApiResponse<null> = {
					data: null,
					error: 'El usuario beneficiario fijo no existe o está inactivo',
				}
				return NextResponse.json(errorResponse, { status: 400 })
			}
		}

		// Prepare update data
		const updateData: {
			code?: string
			name?: string
			idCategoryType?: number
			descripcion?: string | null
			status?: boolean
			beneficiaryMode?: 'UPLINE_CHAIN' | 'FIXED_BENEFICIARY'
			idFixedBeneficiaryUser?: number | null
		} = {}

		if (data.code) updateData.code = data.code.trim().toUpperCase()
		if (data.name) updateData.name = data.name.trim()
		if (data.descripcion !== undefined)
			updateData.descripcion = data.descripcion
		if (data.status !== undefined) updateData.status = data.status
		if (data.beneficiaryMode !== undefined)
			updateData.beneficiaryMode = data.beneficiaryMode
		if ('idFixedBeneficiaryUser' in data)
			updateData.idFixedBeneficiaryUser =
				data.beneficiaryMode === 'UPLINE_CHAIN'
					? null
					: (data.idFixedBeneficiaryUser ?? null)

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

			updateData.idCategoryType = categoryTypeRec.id
		}

		const categoryRaw = await prisma.category.update({
			where: { idCategory: categoryId },
			data: updateData,
			include: {
				fixedBeneficiaryUser: {
					select: { idUser: true, name: true, lastName: true, email: true },
				},
			},
		})
		const category = categoryRaw as unknown as MapperPrismaCategoryWithRelations

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
				error: 'No se puede eliminar la categoría porque tiene usuarios asociados',
			}
			return NextResponse.json(errorResponse, { status: 400 })
		}

		await prisma.category.delete({
			where: { idCategory: categoryId },
		})

		const response: ApiResponse<{ success: boolean }> = {
			data: { success: true },
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error deleting category:', error)
		const errorResponse: ApiResponse<null> = {
			data: null,
			error: 'Error al eliminar categoría',
		}
		return NextResponse.json(errorResponse, { status: 500 })
	}
}
