import { describe, it, expect } from 'vitest'
import { resolveSessionRevalidation } from '../session-revalidation'

const active = (roleCode: string | null) => ({ active: true, roleCode })
const inactive = (roleCode: string | null) => ({ active: false, roleCode })

describe('resolveSessionRevalidation - plain session', () => {
	it('ends the session when the user no longer exists', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: false,
				currentUser: null,
				originalUser: null,
			})
		).toEqual({ action: 'end' })
	})

	it('ends the session when the user was deactivated', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: false,
				currentUser: inactive('PARTNER'),
				originalUser: null,
			})
		).toEqual({ action: 'end' })
	})

	it('ends the session when the active user has no role (fails closed)', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: false,
				currentUser: active(null),
				originalUser: null,
			})
		).toEqual({ action: 'end' })
	})

	it.each(['ADMIN', 'AGENTE', 'PARTNER', 'CONSULTOR'])(
		'keeps an active %s session with the role read from the database',
		(roleCode) => {
			expect(
				resolveSessionRevalidation({
					isImpersonating: false,
					currentUser: active(roleCode),
					originalUser: null,
				})
			).toEqual({ action: 'keep', roleCode })
		}
	)

	it('refreshes the role when it changed in the database', () => {
		// JWT still says AGENTE; the database now says CONSULTOR
		expect(
			resolveSessionRevalidation({
				isImpersonating: false,
				currentUser: active('CONSULTOR'),
				originalUser: null,
			})
		).toEqual({ action: 'keep', roleCode: 'CONSULTOR' })
	})

	it('ignores activatedAt: a pending partner (active, never activated) is kept', () => {
		const pendingPartner = {
			active: true,
			roleCode: 'PARTNER',
			activatedAt: null,
		}
		expect(
			resolveSessionRevalidation({
				isImpersonating: false,
				currentUser: pendingPartner,
				originalUser: null,
			})
		).toEqual({ action: 'keep', roleCode: 'PARTNER' })
	})
})

describe('resolveSessionRevalidation - impersonation', () => {
	it('keeps the target session while both admin and target are active', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: active('PARTNER'),
				originalUser: active('ADMIN'),
			})
		).toEqual({ action: 'keep', roleCode: 'PARTNER' })
	})

	it('keeps impersonating a pending partner (activatedAt is not checked)', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: {
					active: true,
					roleCode: 'PARTNER',
					activatedAt: null,
				} as never,
				originalUser: active('ADMIN'),
			})
		).toEqual({ action: 'keep', roleCode: 'PARTNER' })
	})

	it('restores the admin when the target was deactivated', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: inactive('PARTNER'),
				originalUser: active('ADMIN'),
			})
		).toEqual({ action: 'restore_admin' })
	})

	it('restores the admin when the target no longer exists', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: null,
				originalUser: active('ADMIN'),
			})
		).toEqual({ action: 'restore_admin' })
	})

	it('ends the session when the impersonating admin was deactivated', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: active('PARTNER'),
				originalUser: inactive('ADMIN'),
			})
		).toEqual({ action: 'end' })
	})

	it('ends the session when the impersonating admin no longer exists', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: active('PARTNER'),
				originalUser: null,
			})
		).toEqual({ action: 'end' })
	})

	it('ends the session when the original user is no longer an ADMIN', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: active('PARTNER'),
				originalUser: active('AGENTE'),
			})
		).toEqual({ action: 'end' })
	})

	it('ends the session (not restore) when both admin and target are gone', () => {
		expect(
			resolveSessionRevalidation({
				isImpersonating: true,
				currentUser: inactive('PARTNER'),
				originalUser: inactive('ADMIN'),
			})
		).toEqual({ action: 'end' })
	})
})
