import { NextResponse } from 'next/server'
import { ApiResponse } from '@/features/shared/types/api-response.types'
import { requireAuth } from '@/lib/auth/require-role'
import { searchPolicyholdersByDocument } from '@/features/policyholders/services/policyholder.service'
import type { PolicyholderSearchResult } from '@/features/policyholders/types/policyholder.types'

export async function GET(request: Request) {
	const guard = await requireAuth()
	if (!guard.ok) {
		return guard.response
	}

	try {
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('query')?.trim() ?? ''
		const limitParam = searchParams.get('limit')

		if (query.length < 3) {
			return NextResponse.json({
				data: [],
			} satisfies ApiResponse<PolicyholderSearchResult[]>)
		}

		const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 25)
		const policyholders = await searchPolicyholdersByDocument(query, limit)

		return NextResponse.json({
			data: policyholders,
		} satisfies ApiResponse<PolicyholderSearchResult[]>)
	} catch (error) {
		console.error('Error searching policyholders:', error)
		return NextResponse.json(
			{
				data: null,
				error: 'Error al buscar tomadores',
			} satisfies ApiResponse<null>,
			{ status: 500 }
		)
	}
}
