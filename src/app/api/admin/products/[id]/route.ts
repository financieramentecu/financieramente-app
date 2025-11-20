import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/admin/schemas'

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const product = await prisma.product.findUnique({
			where: { idProduct: Number(id) },
			include: {
				company: true,
				typeProduct: true,
			},
		})

		if (!product) {
			return NextResponse.json(
				{ error: 'Producto no encontrado' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ product })
	} catch (error) {
		console.error('Error fetching product:', error)
		return NextResponse.json(
			{ error: 'Error al obtener producto' },
			{ status: 500 }
		)
	}
}

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const body = await request.json()
		const data = productSchema.parse(body)

		const product = await prisma.product.update({
			where: { idProduct: Number(id) },
			data: {
				name: data.name,
				description: data.description ?? null,
				idCompany: data.idCompany,
				idTypeProduct: data.idTypeProduct ?? null,
				status: data.status ?? true,
			},
			include: {
				company: true,
				typeProduct: true,
			},
		})

		return NextResponse.json({ product })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Datos inválidos', details: error.issues },
				{ status: 400 }
			)
		}

		if (error && typeof error === 'object' && 'code' in error) {
			if (error.code === 'P2025') {
				return NextResponse.json(
					{ error: 'Producto no encontrado' },
					{ status: 404 }
				)
			}

			if (error.code === 'P2002') {
				return NextResponse.json(
					{
						error:
							'Ya existe un producto con este nombre para la compañía seleccionada',
					},
					{ status: 409 }
				)
			}
		}

		console.error('Error updating product:', error)
		return NextResponse.json(
			{ error: 'Error al actualizar producto' },
			{ status: 500 }
		)
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const product = await prisma.product.update({
			where: { idProduct: Number(id) },
			data: { status: false },
		})

		return NextResponse.json({ product })
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			return NextResponse.json(
				{ error: 'Producto no encontrado' },
				{ status: 404 }
			)
		}

		console.error('Error deleting product:', error)
		return NextResponse.json(
			{ error: 'Error al desactivar producto' },
			{ status: 500 }
		)
	}
}
