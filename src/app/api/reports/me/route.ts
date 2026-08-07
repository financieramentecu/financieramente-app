import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserByEmail } from '@/features/shared/services/user.service'
import { getAuthorizedReportCodes } from '@/features/report-permissions/services/report-permissions.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import type { AuthorizedReportsDto } from '@/features/report-permissions/types/report-permissions.types'

export async function GET(): Promise<
	NextResponse<ApiResponse<AuthorizedReportsDto>>
> {
	const session = await auth()
	if (!session?.user?.email) {
		return NextResponse.json(
			{ data: null, error: 'Unauthorized' },
			{ status: 401 }
		)
	}

	try {
		const currentUser = await getCurrentUserByEmail(session.user.email)
		if (!currentUser) {
			return NextResponse.json(
				{ data: null, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const data = await getAuthorizedReportCodes({
			roleCode: currentUser.role?.code ?? session.user.role,
			idCategory: currentUser.idCategory,
		})

		return NextResponse.json({ data })
	} catch {
		return NextResponse.json(
			{ data: null, error: 'Error al obtener reportes autorizados' },
			{ status: 500 }
		)
	}
}
