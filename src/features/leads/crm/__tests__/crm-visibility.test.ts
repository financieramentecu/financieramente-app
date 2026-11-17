import { describe, expect, it } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { resolveCrmVisibility } from '@/features/leads/crm/crm-visibility'

const tree = [7, 8]

describe('resolveCrmVisibility', () => {
	it('keeps an advisor on their branch when the grant is off', () => {
		expect(
			resolveCrmVisibility({ roleCode: UserRole.AGENTE, granted: false, treeUserIds: tree })
		).toEqual({
			visibleUserIds: tree,
			manageableUserIds: tree,
			canManage: true,
			canOpenCrm: true,
		})
	})

	it('lets a granted advisor read every branch and edit only their own', () => {
		expect(
			resolveCrmVisibility({ roleCode: UserRole.AGENTE, granted: true, treeUserIds: tree })
		).toEqual({
			visibleUserIds: [],
			manageableUserIds: tree,
			canManage: true,
			canOpenCrm: true,
		})
	})

	it('keeps a consultor out of the CRM until the grant is on', () => {
		expect(
			resolveCrmVisibility({ roleCode: UserRole.CONSULTOR, granted: false, treeUserIds: [9] })
		).toMatchObject({ visibleUserIds: [9], canManage: false, canOpenCrm: false })
	})

	it('opens company-wide read-only CRM for a granted person outside the tree', () => {
		expect(
			resolveCrmVisibility({ roleCode: UserRole.CONSULTOR, granted: true, treeUserIds: [9] })
		).toEqual({
			visibleUserIds: [],
			manageableUserIds: [9],
			canManage: false,
			canOpenCrm: true,
		})
	})

	it('does not let a partner see other branches even if the flag is set', () => {
		expect(
			resolveCrmVisibility({ roleCode: UserRole.PARTNER, granted: true, treeUserIds: [4] })
		).toMatchObject({ visibleUserIds: [4], canOpenCrm: false, canManage: true })
	})

	it('keeps write-bypass roles on the whole company', () => {
		expect(
			resolveCrmVisibility({ roleCode: UserRole.ADMIN, granted: false, treeUserIds: tree })
		).toEqual({
			visibleUserIds: [],
			manageableUserIds: [],
			canManage: true,
			canOpenCrm: true,
		})
	})
})
