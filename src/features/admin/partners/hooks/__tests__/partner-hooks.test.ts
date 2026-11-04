import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('../../lib/partner-api', () => ({
	partnerApi: {
		list: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		deactivate: vi.fn(),
		reactivate: vi.fn(),
		resendActivation: vi.fn(),
		leaderLevels: vi.fn(),
		leaders: vi.fn(),
	},
}))

import { partnerApi } from '../../lib/partner-api'
import { usePartners } from '../use-partners'
import { useCreatePartner } from '../use-create-partner'
import { useUpdatePartner } from '../use-update-partner'
import { usePartnerActions } from '../use-partner-actions'
import { useLeaderPicker } from '../use-leader-picker'
import type { PartnerDto } from '../../types/partner.types'

const PARTNER: PartnerDto = {
	id: 21,
	name: 'Ana',
	lastName: 'Gómez',
	typeIdentity: 'CC',
	identityNumber: '1',
	email: 'ana@p.com',
	phone: null,
	active: true,
	activatedAt: null,
	createdAt: '2026-10-10T12:00:00.000Z',
	status: 'PENDING',
	leader: null,
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('usePartners', () => {
	it('goes loading -> success with the list', async () => {
		vi.mocked(partnerApi.list).mockResolvedValue([PARTNER])
		const { result } = renderHook(() => usePartners())
		expect(result.current.state.status).toBe('loading')
		await waitFor(() => expect(result.current.state.status).toBe('success'))
		expect(result.current.state.data).toEqual([PARTNER])
	})

	it('goes to error with the server message', async () => {
		vi.mocked(partnerApi.list).mockRejectedValue(new Error('Sin permisos'))
		const { result } = renderHook(() => usePartners())
		await waitFor(() => expect(result.current.state.status).toBe('error'))
		expect(result.current.state.error).toBe('Sin permisos')
	})

	it('refresh reloads the list', async () => {
		vi.mocked(partnerApi.list).mockResolvedValue([])
		const { result } = renderHook(() => usePartners())
		await waitFor(() => expect(result.current.state.status).toBe('success'))
		vi.mocked(partnerApi.list).mockResolvedValue([PARTNER])
		await act(() => result.current.refresh())
		expect(result.current.state.data).toEqual([PARTNER])
	})
})

describe('useCreatePartner', () => {
	const INPUT = {
		name: 'Ana',
		typeIdentity: 'CC',
		identityNumber: '1',
		email: 'ana@p.com',
		leaderId: 3,
	}

	it('starts idle and ends success with emailSent', async () => {
		vi.mocked(partnerApi.create).mockResolvedValue({
			...PARTNER,
			emailSent: false,
		})
		const { result } = renderHook(() => useCreatePartner())
		expect(result.current.state.status).toBe('idle')

		let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined
		await act(async () => {
			outcome = await result.current.submit(INPUT)
		})

		expect(outcome).toEqual({
			ok: true,
			data: { ...PARTNER, emailSent: false },
		})
		expect(result.current.state.status).toBe('success')
	})

	it('surfaces the Spanish server error (e.g. duplicate email)', async () => {
		vi.mocked(partnerApi.create).mockRejectedValue(
			new Error('Este correo electrónico ya está registrado')
		)
		const { result } = renderHook(() => useCreatePartner())
		let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined
		await act(async () => {
			outcome = await result.current.submit(INPUT)
		})
		expect(outcome).toEqual({
			ok: false,
			error: 'Este correo electrónico ya está registrado',
		})
		expect(result.current.state).toMatchObject({
			status: 'error',
			error: 'Este correo electrónico ya está registrado',
		})
	})

	it('reset returns to idle', async () => {
		vi.mocked(partnerApi.create).mockRejectedValue(new Error('x'))
		const { result } = renderHook(() => useCreatePartner())
		await act(async () => {
			await result.current.submit(INPUT)
		})
		act(() => result.current.reset())
		expect(result.current.state.status).toBe('idle')
	})
})

describe('usePartnerActions', () => {
	it.each([
		['deactivate', 'deactivate'],
		['reactivate', 'reactivate'],
		['resend', 'resendActivation'],
	] as const)(
		'%s calls the API and refreshes the list',
		async (action, method) => {
			vi.mocked(partnerApi[method]).mockResolvedValue({
				...PARTNER,
				emailSent: true,
			})
			const onChanged = vi.fn()
			const { result } = renderHook(() => usePartnerActions(onChanged))

			let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined
			await act(async () => {
				outcome = await result.current.run(action, 21)
			})

			expect(partnerApi[method]).toHaveBeenCalledWith(21)
			expect(outcome?.ok).toBe(true)
			expect(onChanged).toHaveBeenCalledTimes(1)
			expect(result.current.pending).toBeNull()
		}
	)

	it('reports the error and does not refresh on failure', async () => {
		vi.mocked(partnerApi.resendActivation).mockRejectedValue(
			new Error('El partner ya activó su cuenta')
		)
		const onChanged = vi.fn()
		const { result } = renderHook(() => usePartnerActions(onChanged))
		let outcome: Awaited<ReturnType<typeof result.current.run>> | undefined
		await act(async () => {
			outcome = await result.current.run('resend', 21)
		})
		expect(outcome).toEqual({
			ok: false,
			error: 'El partner ya activó su cuenta',
		})
		expect(onChanged).not.toHaveBeenCalled()
	})
})

describe('useLeaderPicker', () => {
	it('loads the level step first and the leaders only after a level is chosen', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([
			{ code: 'LEVEL_1', name: 'Nivel 1' },
			{ code: 'LEVEL_2', name: 'Director' },
		])
		vi.mocked(partnerApi.leaders).mockResolvedValue([
			{ id: 3, name: 'Luis', lastName: null, email: 'l@c.com' },
		])
		const { result } = renderHook(() => useLeaderPicker())

		await waitFor(() => expect(result.current.levels.status).toBe('success'))
		expect(result.current.levels.data?.map((l) => l.name)).toEqual([
			'Nivel 1',
			'Director',
		])
		expect(result.current.leaders.status).toBe('idle')
		expect(partnerApi.leaders).not.toHaveBeenCalled()

		act(() => result.current.selectLevel('LEVEL_2'))
		await waitFor(() => expect(result.current.leaders.status).toBe('success'))

		expect(partnerApi.leaders).toHaveBeenCalledWith('LEVEL_2')
		expect(result.current.levelCode).toBe('LEVEL_2')
		expect(result.current.leaders.data).toHaveLength(1)
	})

	it('clears the leaders when the level is cleared', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([
			{ code: 'LEVEL_1', name: 'Nivel 1' },
		])
		vi.mocked(partnerApi.leaders).mockResolvedValue([])
		const { result } = renderHook(() => useLeaderPicker())
		await waitFor(() => expect(result.current.levels.status).toBe('success'))
		act(() => result.current.selectLevel('LEVEL_1'))
		await waitFor(() => expect(result.current.leaders.status).toBe('success'))
		act(() => result.current.selectLevel(null))
		expect(result.current.levelCode).toBeNull()
		expect(result.current.leaders.status).toBe('idle')
	})
})

describe('useLeaderPicker out-of-order responses (F20)', () => {
	function deferred<T>() {
		let resolve!: (value: T) => void
		const promise = new Promise<T>((res) => {
			resolve = res
		})
		return { promise, resolve }
	}

	const LEADER_A = { id: 1, name: 'Ana', lastName: null, email: 'a@c.com' }
	const LEADER_B = { id: 2, name: 'Beto', lastName: null, email: 'b@c.com' }

	it('a slow first response resolving after a second selection does not overwrite the leaders', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([])
		const slow = deferred<(typeof LEADER_A)[]>()
		const fast = deferred<(typeof LEADER_B)[]>()
		vi.mocked(partnerApi.leaders).mockImplementation((code: string) =>
			code === 'LEVEL_1' ? slow.promise : fast.promise
		)
		const { result } = renderHook(() => useLeaderPicker())
		await waitFor(() => expect(result.current.levels.status).toBe('success'))

		act(() => result.current.selectLevel('LEVEL_1'))
		act(() => result.current.selectLevel('LEVEL_2'))
		await act(async () => fast.resolve([LEADER_B]))
		expect(result.current.leaders.data).toEqual([LEADER_B])

		// The stale LEVEL_1 response arrives last and must be ignored.
		await act(async () => slow.resolve([LEADER_A]))
		expect(result.current.levelCode).toBe('LEVEL_2')
		expect(result.current.leaders.data).toEqual([LEADER_B])
	})

	it('a stale failure does not replace the leaders of the current level', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([])
		const slow = deferred<(typeof LEADER_A)[]>()
		vi.mocked(partnerApi.leaders).mockImplementation((code: string) =>
			code === 'LEVEL_1' ? slow.promise : Promise.resolve([LEADER_B])
		)
		const errorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		const { result } = renderHook(() => useLeaderPicker())
		await waitFor(() => expect(result.current.levels.status).toBe('success'))

		act(() => result.current.selectLevel('LEVEL_1'))
		act(() => result.current.selectLevel('LEVEL_2'))
		await waitFor(() => expect(result.current.leaders.data).toEqual([LEADER_B]))
		await act(async () => {
			// Reject through the already-pending promise by resolving a rejection.
			slow.resolve(Promise.reject(new Error('boom')) as never)
		})
		expect(result.current.leaders.status).toBe('success')
		expect(result.current.leaders.data).toEqual([LEADER_B])
		errorSpy.mockRestore()
	})

	it('clearing the level while a request is in flight ignores that response', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([])
		const slow = deferred<(typeof LEADER_A)[]>()
		vi.mocked(partnerApi.leaders).mockReturnValue(slow.promise)
		const { result } = renderHook(() => useLeaderPicker())
		await waitFor(() => expect(result.current.levels.status).toBe('success'))

		act(() => result.current.selectLevel('LEVEL_1'))
		act(() => result.current.selectLevel(null))
		await act(async () => slow.resolve([LEADER_A]))
		expect(result.current.leaders.status).toBe('idle')
	})

	it('selecting the already selected level keeps the loaded leaders', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([])
		vi.mocked(partnerApi.leaders).mockResolvedValue([LEADER_A])
		const { result } = renderHook(() => useLeaderPicker())
		await waitFor(() => expect(result.current.levels.status).toBe('success'))
		act(() => result.current.selectLevel('LEVEL_1'))
		await waitFor(() => expect(result.current.leaders.status).toBe('success'))
		act(() => result.current.selectLevel('LEVEL_1'))
		expect(result.current.leaders.status).toBe('success')
		expect(partnerApi.leaders).toHaveBeenCalledTimes(1)
	})

	it('does not update state after unmount', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([])
		const slow = deferred<(typeof LEADER_A)[]>()
		vi.mocked(partnerApi.leaders).mockReturnValue(slow.promise)
		const errorSpy = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		const { result, unmount } = renderHook(() => useLeaderPicker('LEVEL_1'))
		expect(result.current.leaders.status).toBe('loading')
		unmount()
		await act(async () => slow.resolve([LEADER_A]))
		expect(errorSpy).not.toHaveBeenCalled()
		errorSpy.mockRestore()
	})
})

describe('useUpdatePartner', () => {
	const INPUT = {
		name: 'Ana',
		typeIdentity: 'CC',
		identityNumber: '1',
		leaderId: 3,
	}

	it('starts idle and ends success with the updated partner', async () => {
		vi.mocked(partnerApi.update).mockResolvedValue(PARTNER)
		const { result } = renderHook(() => useUpdatePartner())
		expect(result.current.state.status).toBe('idle')

		let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined
		await act(async () => {
			outcome = await result.current.submit(21, INPUT)
		})
		expect(partnerApi.update).toHaveBeenCalledWith(21, INPUT)
		expect(outcome).toEqual({ ok: true, data: PARTNER })
		expect(result.current.state.status).toBe('success')
	})

	it('surfaces the server message on failure and can be reset', async () => {
		vi.mocked(partnerApi.update).mockRejectedValue(
			new Error('Este documento ya está registrado')
		)
		const { result } = renderHook(() => useUpdatePartner())

		let outcome: Awaited<ReturnType<typeof result.current.submit>> | undefined
		await act(async () => {
			outcome = await result.current.submit(21, INPUT)
		})
		expect(outcome).toEqual({
			ok: false,
			error: 'Este documento ya está registrado',
		})
		expect(result.current.state.status).toBe('error')

		act(() => result.current.reset())
		expect(result.current.state.status).toBe('idle')
	})

	it('falls back to a generic Spanish message for non-Error rejections', async () => {
		vi.mocked(partnerApi.update).mockRejectedValue('boom')
		const { result } = renderHook(() => useUpdatePartner())
		await act(async () => {
			await result.current.submit(21, INPUT)
		})
		expect(result.current.state.error).toBe('Error al actualizar el partner')
	})
})

describe('useLeaderPicker with an initial level (edit prefill)', () => {
	it('starts on the given level and loads its leaders right away', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([
			{ code: 'LEVEL_2', name: 'Director' },
		])
		vi.mocked(partnerApi.leaders).mockResolvedValue([
			{ id: 7, name: 'Luis', lastName: null, email: 'l@c.com' },
		])
		const { result } = renderHook(() => useLeaderPicker('LEVEL_2'))
		expect(result.current.levelCode).toBe('LEVEL_2')
		await waitFor(() => expect(result.current.leaders.status).toBe('success'))
		expect(partnerApi.leaders).toHaveBeenCalledWith('LEVEL_2')
	})

	it('stays idle without an initial level', async () => {
		vi.mocked(partnerApi.leaderLevels).mockResolvedValue([])
		const { result } = renderHook(() => useLeaderPicker(null))
		await waitFor(() => expect(result.current.levels.status).toBe('success'))
		expect(result.current.levelCode).toBeNull()
		expect(partnerApi.leaders).not.toHaveBeenCalled()
	})
})
