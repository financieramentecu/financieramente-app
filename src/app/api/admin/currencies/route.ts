import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currencySchema } from '@/lib/admin/schemas'
import { z } from 'zod'

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const status = searchParams.get('status')

		const where: {
			name?: { contains: string; mode: 'insensitive' }
			active?: boolean
		} = {}

		if (search) {
			where.name = { contains: search, mode: 'insensitive' }
		}

		if (status === 'active') {
			where.active = true
		}

		const currencies = await prisma.currency.findMany({
			where,
			orderBy: { name: 'asc' },
		})

		return NextResponse.json({ currencies })
	} catch (error) {
		console.error('Error fetching currencies:', error)
		return NextResponse.json(
			{ error: 'Error al obtener monedas' },
			{ status: 500 }
		)
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const data = currencySchema.parse(body)

		const currency = await prisma.currency.create({
			data: {
				name: data.name,
				symbol: data.symbol ?? null,
				active: data.active ?? true,
			},
		})

		return NextResponse.json({ currency }, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Datos inválidos', details: error.issues },
				{ status: 400 }
			)
		}

		if (
			error &&
			typeof error === 'object' &&
			'code' in error &&
			error.code === 'P2002'
		) {
			return NextResponse.json(
				{ error: 'Ya existe una moneda con este nombre' },
				{ status: 409 }
			)
		}

		console.error('Error creating currency:', error)
		return NextResponse.json(
			{
				error: 'Error al crear moneda',
				details: error instanceof Error ? error.message : undefined,
			},
			{ status: 500 }
		)
	}
}
