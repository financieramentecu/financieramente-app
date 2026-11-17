import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

const session = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('next-auth/react', () => ({
	useSession: () => ({ data: session.value }),
}))

import { usePermissions } from '../use-permissions'

describe('usePermissions can/scope', () => {
	it('answers from the session grants', () => {
		session.value = {
			user: {
				role: 'AGENTE',
				grants: { 'negocios.ver': { scope: 'TEAM' }, 'negocios.crear': {} },
			},
		}
		const { result } = renderHook(() => usePermissions())
		expect(result.current.can('negocios.crear')).toBe(true)
		expect(result.current.can('negocios.cancelar')).toBe(false)
		expect(result.current.scope('negocios.ver')).toBe('TEAM')
	})

	it('fails closed on a session without grants', () => {
		session.value = { user: { role: 'ADMIN' } }
		const { result } = renderHook(() => usePermissions())
		expect(result.current.can('negocios.crear')).toBe(false)
		expect(result.current.scope('negocios.ver')).toBeUndefined()
	})
})
