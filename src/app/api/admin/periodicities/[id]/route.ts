import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buyPeriodicitySchema } from '@/lib/admin/schemas'
import { z } from 'zod'

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const periodicity = await prisma.buyPeriodicity.findUnique({
			where: { idBuyPeriodicity: parseInt(id) },
		})

		if (!periodicity) {
			return NextResponse.json(
				{ error: 'Periodicidad no encontrada' },
				{ status: 404 }
			)
		}

		return NextResponse.json({ periodicity })
	} catch (error) {
		console.error('Error fetching periodicity:', error)
		return NextResponse.json(
			{ error: 'Error al obtener periodicidad' },
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
		const data = buyPeriodicitySchema.parse(body)

		const periodicity = await prisma.buyPeriodicity.update({
			where: { idBuyPeriodicity: parseInt(id) },
			data: {
				name: data.name,
				active: data.active ?? true,
			},
		})

		return NextResponse.json({ periodicity })
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
					{ error: 'Periodicidad no encontrada' },
					{ status: 404 }
				)
			}

			if (error.code === 'P2002') {
				return NextResponse.json(
					{ error: 'Ya existe una periodicidad con este nombre' },
					{ status: 409 }
				)
			}
		}

		console.error('Error updating periodicity:', error)
		return NextResponse.json(
			{ error: 'Error al actualizar periodicidad' },
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
		const periodicity = await prisma.buyPeriodicity.update({
			where: { idBuyPeriodicity: parseInt(id) },
			data: { active: false },
		})

		return NextResponse.json({ periodicity })
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2025'
		) {
			return NextResponse.json(
				{ error: 'Periodicidad no encontrada' },
				{ status: 404 }
			)
		}

		console.error('Error deleting periodicity:', error)
		return NextResponse.json(
			{ error: 'Error al eliminar periodicidad' },
			{ status: 500 }
		)
	}
}
