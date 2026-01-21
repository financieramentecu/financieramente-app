import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export async function GET() {
	try {
		const agents = await prisma.user.findMany({
			where: {
				active: true,
			},
			select: {
				idUser: true,
				name: true,
				lastName: true,
				email: true,
				identityNumber: true,
			},
			orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
			take: 100,
		})

		return NextResponse.json({ agents })
	} catch (error) {
		console.error('Error fetching agents:', error)
		return NextResponse.json(
			{ error: 'Error al obtener agentes' },
			{ status: 500 }
		)
	}
}
