import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { Client } from '@prisma/client'
import { ApiResponse } from '@/features/shared/types/api-response.types'

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('query')?.trim() ?? ''
		const limitParam = searchParams.get('limit')

		if (!query || query.length < 3) {
			return NextResponse.json({ users: [] })
		}

		const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 25)

		const clients = await prisma.client.findMany({
			where: {
				OR: [{ identityNumber: { contains: query, mode: 'insensitive' } }],
			},
			orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
			select: {
				idClient: true,
				name: true,
				lastName: true,
				typeIdentity: true,
				identityNumber: true,
				email: true,
				phone: true,
				direcction: true,
				city: true,
				country: true,
				active: true,
				createdAt: true,
				updatedAt: true,
			},
			take: limit,
		})

		return NextResponse.json({ data: clients } satisfies ApiResponse<Client[]>)
	} catch (error) {
		console.error('Error searching clients:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al buscar clientes',
			} satisfies ApiResponse<null>,
			{ status: 500 }
		)
	}
}
