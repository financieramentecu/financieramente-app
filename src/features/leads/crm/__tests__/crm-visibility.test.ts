import { describe, expect, it } from 'vitest'
import { resolveCrmVisibility } from '@/features/leads/crm/crm-visibility'

const tree = [7, 8]
const base = { canViewLeads: true, granted: false, treeUserIds: tree, viewerId: 7 } as const

describe('resolveCrmVisibility', () => {
	it('keeps a branch writer on their branch when the grant is off', () => {
		expect(resolveCrmVisibility({ ...base, manageScope: 'TEAM' })).toEqual({
			visibleUserIds: tree,
			manageableUserIds: tree,
			canManage: true,
			canOpenCrm: true,
			companyWrite: false,
		})
	})

	it('lets a granted advisor read every branch and edit only their own', () => {
		expect(resolveCrmVisibility({ ...base, manageScope: 'TEAM', granted: true })).toEqual({
			visibleUserIds: [],
			manageableUserIds: tree,
			canManage: true,
			canOpenCrm: true,
			companyWrite: false,
		})
	})

	it('limits an OWN-scope writer to themselves', () => {
		expect(resolveCrmVisibility({ ...base, manageScope: 'OWN' })).toMatchObject({
			visibleUserIds: [7],
			manageableUserIds: [7],
		})
	})

	it('keeps a read-only viewer out of the CRM until the grant is on', () => {
		expect(
			resolveCrmVisibility({ ...base, manageScope: undefined, treeUserIds: [9], viewerId: 9 })
		).toMatchObject({ visibleUserIds: [9], canManage: false, canOpenCrm: false })
	})

	it('opens company-wide read-only CRM for a granted person without CRM write access', () => {
		expect(
			resolveCrmVisibility({
				...base,
				manageScope: undefined,
				granted: true,
				treeUserIds: [9],
				viewerId: 9,
			})
		).toEqual({
			visibleUserIds: [],
			manageableUserIds: [9],
			canManage: false,
			canOpenCrm: true,
			companyWrite: false,
		})
	})

	it('ignores the grant for a role that cannot view leads at all', () => {
		expect(
			resolveCrmVisibility({
				...base,
				manageScope: undefined,
				canViewLeads: false,
				granted: true,
				treeUserIds: [4],
				viewerId: 4,
			})
		).toMatchObject({ visibleUserIds: [4], canOpenCrm: false, canManage: false })
	})

	it('keeps company-scope writers on the whole company', () => {
		expect(resolveCrmVisibility({ ...base, manageScope: 'COMPANY' })).toEqual({
			visibleUserIds: [],
			manageableUserIds: [],
			canManage: true,
			canOpenCrm: true,
			companyWrite: true,
		})
	})
})
