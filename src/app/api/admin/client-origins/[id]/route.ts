import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateClientOriginSchema } from '@/features/admin/origins/lib/origin-schemas'
import { z } from 'zod'

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const origin = await prisma.clientOrigin.findUnique({
			where: { idClientOrigin: parseInt(id) },
		})

		if (!origin) {
			return NextResponse.json(
				{ error: 'Origen de cliente no encontrado' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ origin })
	} catch (error) {
		console.error('Error fetching client origin:', error)
		return NextResponse.json(
			{ error: 'Error al obtener origen de cliente' },
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
		const data = updateClientOriginSchema.parse(body)

		const origin = await prisma.clientOrigin.update({
			where: { idClientOrigin: parseInt(id) },
			data: {
				name: data.name,
				description: data.description ?? null,
				status: data.status ?? true,
			},
		})

		return NextResponse.json({ origin })
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
					{ error: 'Origen de cliente no encontrado' },
					{ status: 404 }
				)
			}

			if (error.code === 'P2002') {
				return NextResponse.json(
					{ error: 'Ya existe un origen de cliente con este nombre' },
					{ status: 409 }
				)
			}
		}

		console.error('Error updating client origin:', error)
		return NextResponse.json(
			{ error: 'Error al actualizar origen de cliente' },
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
		const origin = await prisma.clientOrigin.update({
			where: { idClientOrigin: parseInt(id) },
			data: { status: false },
		})

		return NextResponse.json({ origin })
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			return NextResponse.json(
				{ error: 'Origen de cliente no encontrado' },
				{ status: 404 }
			)
		}

		console.error('Error deleting client origin:', error)
		return NextResponse.json(
			{ error: 'Error al eliminar origen de cliente' },
			{ status: 500 }
		)
	}
}
