import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { leaderLevelQuerySchema } from '@/features/admin/partners/lib/partner-schemas'
import {
	errorJson,
	partnerErrorResponse,
} from '@/features/admin/partners/lib/partner-http'
import { listLeaderCandidates } from '@/features/admin/partners/services/partner.service'
import type { PartnerLeaderOption } from '@/features/admin/partners/types/partner.types'

/**
 * GET /api/admin/partners/leaders?levelCode=LEVEL_n
 * Active users of one LEVEL_1..LEVEL_5 level (never PARTNER users). ADMIN only.
 */
export async function GET(
	request: Request
): Promise<NextResponse<ApiResponse<PartnerLeaderOption[]>>> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response as NextResponse<ApiResponse<PartnerLeaderOption[]>>
	}

	const levelCode = new URL(request.url).searchParams.get('levelCode')
	const parsed = leaderLevelQuerySchema.safeParse(levelCode)
	if (!parsed.success) {
		return errorJson('Nivel de líder inválido', 400, { field: 'levelCode' })
	}

	try {
		return NextResponse.json({ data: await listLeaderCandidates(parsed.data) })
	} catch (error) {
		return partnerErrorResponse(error, 'Error al listar líderes')
	}
}
