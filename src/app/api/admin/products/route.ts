import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/admin/schemas'

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const status = searchParams.get('status')
		const companyId = searchParams.get('companyId')

		const where: {
			OR?: {
				name?: { contains: string; mode: 'insensitive' }
				description?: { contains: string; mode: 'insensitive' }
			}[]
			status?: boolean
			idCompany?: number
		} = {}

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			]
		}

		if (status === 'active') {
			where.status = true
		}

		if (companyId) {
			const parsedCompanyId = Number(companyId)
			if (!Number.isNaN(parsedCompanyId)) {
				where.idCompany = parsedCompanyId
			}
		}

		const products = await prisma.product.findMany({
			where,
			include: {
				company: true,
				typeProduct: true,
			},
			orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
		})

		return NextResponse.json({ products })
	} catch (error) {
		console.error('Error fetching products:', error)
		return NextResponse.json(
			{ error: 'Error al obtener productos' },
			{ status: 500 }
		)
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const data = productSchema.parse(body)

		const product = await prisma.product.create({
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

		return NextResponse.json({ product }, { status: 201 })
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
				{
					error:
						'Ya existe un producto con este nombre para la compañía seleccionada',
				},
				{ status: 409 }
			)
		}

		console.error('Error creating product:', error)
		return NextResponse.json(
			{
				error: 'Error al crear producto',
				details: error instanceof Error ? error.message : undefined,
			},
			{ status: 500 }
		)
	}
}
