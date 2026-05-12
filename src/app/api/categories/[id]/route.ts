import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateCategorySchema } from '@/features/categories/lib/category-schemas'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { Category } from '@/features/categories/types/category.types'
import { z } from 'zod'
import {
	prismaCategoryToCategory,
	type PrismaCategoryWithRelations,
} from '@/features/categories/mappers/category.mapper'
import { auth } from '@/auth'
import { logAuditEvent, AuditAction, getClientIp, getUserAgent } from '@/features/auth/lib/audit-logger'

/**
 * GET /api/categories/[id]
 * Gets a category by ID
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const categoryRaw = await prisma.category.findUnique({
			where: { id: parseInt(id) },
			include: {
				categoryType: {
					select: { name: true },
				},
			},
		})

		if (!categoryRaw) {
			const errorResponse: ApiResponse<null> = {
				data: null,
				error: 'Categoría no encontrada',
			}
			return NextResponse.json(errorResponse, { status: 404 })
		}

		const response: ApiResponse<Category> = {
			data: prismaCategoryToCategory(categoryRaw as unknown as PrismaCategoryWithRelations),
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
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json(
				{ data: null, error: 'Unauthorized' },
				{ status: 401 }
			)
		}

		const headers = request.headers
		const { id } = await params
		const categoryId = parseInt(id)
		const body = await request.json()
		const data = updateCategorySchema.parse(body)

		const existingCategory = await prisma.category.findUnique({
			where: { id: categoryId },
		})

		if (!existingCategory) {
			return NextResponse.json(
				{ data: null, error: 'Categoría no encontrada' },
				{ status: 404 }
			)
		}

		const updateData: {
			name?: string
			idCategoryType?: number
			description?: string | null
			status?: boolean
		} = {}

		if (data.name !== undefined) updateData.name = data.name.trim()
		if (data.idCategoryType !== undefined) updateData.idCategoryType = data.idCategoryType
		if (data.description !== undefined) updateData.description = data.description
		if (data.status !== undefined) updateData.status = data.status

		const categoryRaw = await prisma.category.update({
			where: { id: categoryId },
			data: updateData,
			include: {
				categoryType: {
					select: { name: true },
				},
			},
		})

		await logAuditEvent({
			userId: session.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.CATEGORY_UPDATED,
			email: session.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Categoría actualizada: ${categoryRaw.name}`,
		})

		const response: ApiResponse<Category> = {
			data: prismaCategoryToCategory(categoryRaw as unknown as PrismaCategoryWithRelations),
		}

		return NextResponse.json(response)
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ data: null, error: error.issues[0]?.message || 'Datos inválidos' },
				{ status: 400 }
			)
		}

		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				return NextResponse.json(
					{ data: null, error: 'Categoría no encontrada' },
					{ status: 404 }
				)
			}
		}

		console.error('Error updating category:', error)
		return NextResponse.json(
			{ data: null, error: 'Error al actualizar categoría' },
			{ status: 500 }
		)
	}
}

/**
 * PATCH /api/categories/[id]
 * Soft-deactivates a category (sets status = false)
 */
export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const session = await auth()

		if (!session?.user) {
			return NextResponse.json(
				{ data: null, error: 'Unauthorized' },
				{ status: 401 }
			)
		}

		const headers = request.headers
		const { id } = await params
		const categoryId = parseInt(id)

		const existingCategory = await prisma.category.findUnique({
			where: { id: categoryId },
		})

		if (!existingCategory) {
			return NextResponse.json(
				{ data: null, error: 'Categoría no encontrada' },
				{ status: 404 }
			)
		}

		const categoryRaw = await prisma.category.update({
			where: { id: categoryId },
			data: { status: false },
			include: {
				categoryType: {
					select: { name: true },
				},
			},
		})

		await logAuditEvent({
			userId: session.user?.id ? parseInt(session.user.id) : undefined,
			action: AuditAction.CATEGORY_DEACTIVATED,
			email: session.user?.email ?? undefined,
			ipAddress: getClientIp(headers),
			userAgent: getUserAgent(headers),
			details: `Categoría desactivada: ${existingCategory.name}`,
		})

		const response: ApiResponse<Category> = {
			data: prismaCategoryToCategory(categoryRaw as unknown as PrismaCategoryWithRelations),
		}

		return NextResponse.json(response)
	} catch (error) {
		console.error('Error deactivating category:', error)
		return NextResponse.json(
			{ data: null, error: 'Error al desactivar categoría' },
			{ status: 500 }
		)
	}
}
