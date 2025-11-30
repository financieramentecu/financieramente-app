import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createCompanySchema } from '@/features/admin/companies/lib/company-schemas'
import { z } from 'zod'

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const search = searchParams.get('search')
		const status = searchParams.get('status')

		const where: {
			name?: { contains: string; mode: 'insensitive' }
			status?: boolean
		} = {}

		if (search) {
			where.name = { contains: search, mode: 'insensitive' }
		}

		if (status === 'active') {
			where.status = true
		}

		const companies = await prisma.company.findMany({
			where,
			orderBy: { name: 'asc' },
		})

		return NextResponse.json({ companies })
	} catch (error) {
		console.error('Error fetching companies:', error)
		return NextResponse.json(
			{ error: 'Error al obtener compañías' },
			{ status: 500 }
		)
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json()
		const data = createCompanySchema.parse(body)

		const company = await prisma.company.create({
			data,
		})

		return NextResponse.json({ company }, { status: 201 })
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
				{ error: 'Ya existe una compañía con este nombre' },
				{ status: 409 }
			)
		}

		console.error('Error creating company:', error)
		return NextResponse.json(
			{
				error: 'Error al crear compañía',
				details: error instanceof Error ? error.message : undefined,
			},
			{ status: 500 }
		)
	}
}
