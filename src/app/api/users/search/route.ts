import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { isValidRole, UserRole } from '@/features/auth/lib/roles'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { Prisma } from '@prisma/client'
import { UserWithRole } from '@/features/negocios/types/business.types'

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('query')?.trim() ?? ''
		const limitParam = searchParams.get('limit')
		const roleParam = searchParams.get('role')

		if (!query || query.length < 3) {
			return NextResponse.json({ data: [] } satisfies ApiResponse<unknown[]>)
		}

		// check if role is valid
		if (roleParam && !isValidRole(roleParam)) {
			return NextResponse.json(
				{
					data: null,
					error: `Rol inválido: ${roleParam}. Roles válidos: ${Object.values(UserRole).join(', ')}`,
				} satisfies ApiResponse<null>,
				{ status: 400 }
			)
		}

		const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 25)

		// Construir filtros
		const where: Prisma.UserWhereInput = {
			active: true,
			OR: [
				{ identityNumber: { contains: query, mode: 'insensitive' } },
				{ name: { contains: query, mode: 'insensitive' } },
				{ lastName: { contains: query, mode: 'insensitive' } },
			],
		}

		// add filter if there is a code role
		if (roleParam && isValidRole(roleParam)) {
			where.role = {
				code: roleParam as UserRole,
			}
		}

		const users = await prisma.user.findMany({
			where,
			orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
			include: {
				role: true,
			},
			take: limit,
		})

		return NextResponse.json({ data: users } satisfies ApiResponse<
			UserWithRole[]
		>)
	} catch (error) {
		console.error('Error searching users:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al buscar usuarios',
			} satisfies ApiResponse<null>,
			{ status: 500 }
		)
	}
}
