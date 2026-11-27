import { describe, it, expect, vi } from 'vitest'
import { listRolesOverview } from '../services/role-query.service'

describe('listRolesOverview', () => {
	it('maps active roles with active user and enabled permission counts', async () => {
		const findMany = vi.fn().mockResolvedValue([
			{
				idRole: 1,
				code: 'ADMIN',
				name: 'Administrador',
				description: null,
				isSystem: true,
				_count: { users: 3, rolePermissions: 44 },
			},
		])
		const result = await listRolesOverview({ role: { findMany } } as never)
		expect(result).toEqual([
			{
				id: 1,
				code: 'ADMIN',
				name: 'Administrador',
				description: null,
				isSystem: true,
				userCount: 3,
				permissionCount: 44,
			},
		])
		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { active: true },
				select: expect.objectContaining({
					_count: {
						select: {
							users: { where: { active: true } },
							rolePermissions: { where: { status: true } },
						},
					},
				}),
			})
		)
	})
})
