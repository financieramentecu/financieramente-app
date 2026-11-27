import { apiClient } from '@/lib/api/client'
import type { ApiSuccessResponse } from '@/features/shared/types/api-response.types'
import type { RoleGrants } from '../types/access-control.types'
import type {
	PermissionChanges,
	RoleDetail,
	RoleOverview,
} from '../types/role.types'

const BASE = '/admin/roles'

export interface RoleFormInput {
	name: string
	description?: string | null
}

/** Browser-side client of the roles API; errors carry the server's Spanish message. */
export const roleApi = {
	async list(): Promise<RoleOverview[]> {
		const res = await apiClient.get<ApiSuccessResponse<RoleOverview[]>>(`${BASE}/overview`)
		return res.data
	},

	async detail(id: number): Promise<RoleDetail> {
		const res = await apiClient.get<ApiSuccessResponse<RoleDetail>>(`${BASE}/${id}`)
		return res.data
	},

	async create(input: RoleFormInput): Promise<{ id: number; name: string }> {
		const res = await apiClient.post<ApiSuccessResponse<{ id: number; name: string }>>(BASE, input)
		return res.data
	},

	async update(id: number, input: RoleFormInput): Promise<void> {
		await apiClient.put(`${BASE}/${id}`, input)
	},

	async deactivate(id: number): Promise<void> {
		await apiClient.delete(`${BASE}/${id}`)
	},

	async savePermissions(id: number, grants: RoleGrants): Promise<PermissionChanges> {
		const res = await apiClient.put<ApiSuccessResponse<PermissionChanges>>(
			`${BASE}/${id}/permissions`,
			{ grants }
		)
		return res.data
	},
}
