import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { partnerErrorResponse } from '@/features/admin/partners/lib/partner-http'
import { listLeaderLevels } from '@/features/admin/partners/services/partner.service'
import type { LeaderLevelOption } from '@/features/admin/partners/types/partner.types'

/**
 * GET /api/admin/partners/leader-levels
 * LEVEL_1..LEVEL_5 with their display names (first step of the leader picker).
 */
export async function GET(): Promise<
	NextResponse<ApiResponse<LeaderLevelOption[]>>
> {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response as NextResponse<ApiResponse<LeaderLevelOption[]>>
	}

	try {
		return NextResponse.json({ data: await listLeaderLevels() })
	} catch (error) {
		return partnerErrorResponse(error, 'Error al listar niveles')
	}
}
