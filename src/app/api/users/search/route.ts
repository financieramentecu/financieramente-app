import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { isValidRole, UserRole } from '@/features/auth/lib/roles'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { BeneficiaryMode, Prisma } from '@prisma/client'
import { UserWithRole } from '@/features/negocios/types/business.types'
import { requireAuth } from '@/lib/auth/require-role'

export async function GET(request: Request) {
	const guard = await requireAuth()
	if (!guard.ok) {
		return guard.response
	}

	try {
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('query')?.trim() ?? ''
		const limitParam = searchParams.get('limit')
		const roleParam = searchParams.get('role')
		const beneficiaryModeParam = searchParams.get('beneficiaryMode')
		const idLevelParam = searchParams.get('idLevel')
		const forImpersonation = searchParams.get('forImpersonation') === 'true'

		// Require at least 3 chars unless an idLevel filter is present (leader listing) or forImpersonation is true
		if ((!query || query.length < 3) && !idLevelParam && !forImpersonation) {
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

		// When listing by level (no text query), allow up to 100; otherwise cap at 25
		const defaultLimit = idLevelParam && !query ? 100 : 10
		const limit = Math.min(Math.max(Number(limitParam) || defaultLimit, 1), 100)

		// Construir filtros
		const where: Prisma.UserWhereInput = {
			active: true,
			...(query.length >= 3 && {
				OR: [
					{ identityNumber: { contains: query, mode: 'insensitive' } },
					{ name: { contains: query, mode: 'insensitive' } },
					{ lastName: { contains: query, mode: 'insensitive' } },
				],
			}),
		}

		// add filter if there is a code role
		if (roleParam && isValidRole(roleParam)) {
			where.role = {
				code: roleParam as UserRole,
			}
		}

		// Combine idLevel + beneficiaryMode filters into a single `level` relation block
		// to avoid Prisma generating conflicting JOIN conditions
		if (idLevelParam || beneficiaryModeParam) {
			const levelFilter: Prisma.LevelWhereInput = {}
			if (idLevelParam) {
				const idLevelNum = Number(idLevelParam)
				if (!isNaN(idLevelNum)) {
					levelFilter.idLevel = idLevelNum
				}
			}
			if (beneficiaryModeParam) {
				levelFilter.beneficiaryMode = beneficiaryModeParam as BeneficiaryMode
			}
			where.level = levelFilter
		}

		const users = await prisma.user.findMany({
			where,
			orderBy: [{ name: 'asc' }, { lastName: 'asc' }],
			include: {
				role: true,
				category: { select: { name: true } },
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
