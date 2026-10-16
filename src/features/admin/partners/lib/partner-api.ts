import { apiClient } from '@/lib/api/client'
import type { ApiSuccessResponse } from '@/features/shared/types/api-response.types'
import type {
	CreatePartnerInput,
	LeaderLevelOption,
	PartnerDto,
	PartnerLeaderOption,
	PartnerWithEmailResult,
	UpdatePartnerInput,
} from '../types/partner.types'

const BASE = '/admin/partners'

/**
 * Browser-side client of the partners API. `apiClient` throws an Error whose
 * message is the server's Spanish `error`, which the hooks surface as is.
 */
export const partnerApi = {
	async list(): Promise<PartnerDto[]> {
		const response = await apiClient.get<ApiSuccessResponse<PartnerDto[]>>(BASE)
		return response.data
	},

	async create(input: CreatePartnerInput): Promise<PartnerWithEmailResult> {
		const response = await apiClient.post<
			ApiSuccessResponse<PartnerWithEmailResult>
		>(BASE, input)
		return response.data
	},

	async update(id: number, input: UpdatePartnerInput): Promise<PartnerDto> {
		const response = await apiClient.put<ApiSuccessResponse<PartnerDto>>(
			`${BASE}/${id}`,
			input
		)
		return response.data
	},

	async deactivate(id: number): Promise<PartnerDto> {
		const response = await apiClient.post<ApiSuccessResponse<PartnerDto>>(
			`${BASE}/${id}/deactivate`,
			{}
		)
		return response.data
	},

	async reactivate(id: number): Promise<PartnerDto> {
		const response = await apiClient.post<ApiSuccessResponse<PartnerDto>>(
			`${BASE}/${id}/reactivate`,
			{}
		)
		return response.data
	},

	async resendActivation(id: number): Promise<PartnerWithEmailResult> {
		const response = await apiClient.post<
			ApiSuccessResponse<PartnerWithEmailResult>
		>(`${BASE}/${id}/resend-activation`, {})
		return response.data
	},

	async leaderLevels(): Promise<LeaderLevelOption[]> {
		const response = await apiClient.get<
			ApiSuccessResponse<LeaderLevelOption[]>
		>(`${BASE}/leader-levels`)
		return response.data
	},

	async leaders(levelCode: string): Promise<PartnerLeaderOption[]> {
		const response = await apiClient.get<
			ApiSuccessResponse<PartnerLeaderOption[]>
		>(`${BASE}/leaders?levelCode=${encodeURIComponent(levelCode)}`)
		return response.data
	},
}
