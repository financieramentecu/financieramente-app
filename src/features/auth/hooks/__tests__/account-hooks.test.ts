import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSetPassword } from '../use-set-password'
import { useForgotPassword } from '../use-forgot-password'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

beforeEach(() => {
	fetchMock.mockReset()
	vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('useSetPassword', () => {
	it('posts token and password and ends in success', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
		const { result } = renderHook(() => useSetPassword('activate'))
		expect(result.current.state.status).toBe('idle')
		await act(async () => {
			await result.current.submit('tok', 'Abcdef12')
		})
		expect(result.current.state.status).toBe('success')
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/account/activate')
		expect(init.method).toBe('POST')
		expect(JSON.parse(init.body)).toEqual({
			token: 'tok',
			password: 'Abcdef12',
		})
	})

	it('surfaces the server error message on 400', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse({ data: null, error: 'Enlace inválido o vencido' }, 400)
		)
		const { result } = renderHook(() => useSetPassword('reset-password'))
		await act(async () => {
			await result.current.submit('tok', 'Abcdef12')
		})
		expect(result.current.state.status).toBe('error')
		expect(result.current.state.error).toBe('Enlace inválido o vencido')
	})

	it('falls back to a generic message on network failure', async () => {
		fetchMock.mockRejectedValueOnce(new Error('offline'))
		const { result } = renderHook(() => useSetPassword('activate'))
		await act(async () => {
			await result.current.submit('tok', 'Abcdef12')
		})
		expect(result.current.state.status).toBe('error')
		expect(result.current.state.error).toBe(
			'No se pudo completar la solicitud. Inténtalo de nuevo.'
		)
	})
})

describe('useForgotPassword', () => {
	it('posts the email and ends in success', async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
		const { result } = renderHook(() => useForgotPassword())
		await act(async () => {
			await result.current.submit('ana@example.com')
		})
		expect(result.current.state.status).toBe('success')
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/account/forgot-password')
		expect(JSON.parse(init.body)).toEqual({ email: 'ana@example.com' })
	})

	it('surfaces the 429 message', async () => {
		fetchMock.mockResolvedValueOnce(
			jsonResponse({ data: null, error: 'Demasiadas solicitudes.' }, 429)
		)
		const { result } = renderHook(() => useForgotPassword())
		await act(async () => {
			await result.current.submit('ana@example.com')
		})
		expect(result.current.state.status).toBe('error')
		expect(result.current.state.error).toBe('Demasiadas solicitudes.')
	})
})
