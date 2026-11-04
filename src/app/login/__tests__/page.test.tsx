import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
	searchParams: new URLSearchParams(),
	signIn: vi.fn(),
	push: vi.fn(),
	replace: vi.fn(),
	toastError: vi.fn(),
}))

vi.mock('next-auth/react', () => ({ signIn: mocks.signIn }))
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
	useSearchParams: () => mocks.searchParams,
}))
vi.mock('sonner', () => ({
	toast: {
		error: mocks.toastError,
		success: vi.fn(),
		info: vi.fn(),
	},
}))

import LoginPage from '../page'

describe('LoginPage email/password sign-in (AA-01)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.searchParams = new URLSearchParams()
		mocks.signIn.mockResolvedValue({ ok: true })
	})

	it('shows the credentials form and the forgot-password link without ?superadmin', async () => {
		render(<LoginPage />)
		expect(await screen.findByLabelText('Contraseña')).toBeTruthy()
		expect(
			screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })
		).toBeTruthy()
	})

	it('does not block non-corporate email domains (partners sign in with their own email)', async () => {
		const user = userEvent.setup()
		render(<LoginPage />)
		await user.type(
			await screen.findByLabelText('Correo electrónico'),
			'partner@example.com'
		)
		await user.type(screen.getByLabelText('Contraseña'), 'Abcdef12')
		await user.click(screen.getByRole('button', { name: 'Ingresar' }))

		await waitFor(() =>
			expect(mocks.signIn).toHaveBeenCalledWith(
				'credentials',
				expect.objectContaining({
					email: 'partner@example.com',
					password: 'Abcdef12',
				})
			)
		)
		expect(mocks.toastError).not.toHaveBeenCalledWith(
			'Dominio no autorizado',
			expect.anything()
		)
	})
})

describe('LoginPage callbackUrl [TM] (F10 open redirect)', () => {
	async function submitCredentials() {
		const user = userEvent.setup()
		render(<LoginPage />)
		await user.type(
			await screen.findByLabelText('Correo electrónico'),
			'partner@example.com'
		)
		await user.type(screen.getByLabelText('Contraseña'), 'Abcdef12')
		await user.click(screen.getByRole('button', { name: 'Ingresar' }))
		await waitFor(() => expect(mocks.push).toHaveBeenCalled())
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mocks.signIn.mockResolvedValue({ ok: true })
	})

	it.each([
		['https://evil.tld'],
		['//evil.tld'],
		['/\\evil.tld'],
		['javascript:alert(1)'],
		['%2F%2Fevil.tld'],
	])(
		'ignores the unsafe callbackUrl %s for signIn and router.push',
		async (value) => {
			mocks.searchParams = new URLSearchParams({ callbackUrl: value })
			await submitCredentials()
			expect(mocks.signIn).toHaveBeenCalledWith(
				'credentials',
				expect.objectContaining({ callbackUrl: '/dashboard' })
			)
			expect(mocks.push).toHaveBeenCalledWith('/dashboard')
		}
	)

	it('keeps a safe same-origin callbackUrl', async () => {
		mocks.searchParams = new URLSearchParams({
			callbackUrl: '/dashboard/negocios?x=1',
		})
		await submitCredentials()
		expect(mocks.signIn).toHaveBeenCalledWith(
			'credentials',
			expect.objectContaining({ callbackUrl: '/dashboard/negocios?x=1' })
		)
		expect(mocks.push).toHaveBeenCalledWith('/dashboard/negocios?x=1')
	})

	it('also sanitizes the callbackUrl passed to the Google flow', async () => {
		const user = userEvent.setup()
		mocks.searchParams = new URLSearchParams({ callbackUrl: '//evil.tld' })
		render(<LoginPage />)
		await user.click(
			await screen.findByRole('button', { name: /Continuar con Google/ })
		)
		expect(mocks.signIn).toHaveBeenCalledWith(
			'google',
			expect.objectContaining({ callbackUrl: '/dashboard' })
		)
	})
})

describe('LoginPage credentials error messages (F26)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.searchParams = new URLSearchParams()
	})

	async function submitWith(result: unknown) {
		mocks.signIn.mockResolvedValue(result)
		const user = userEvent.setup()
		render(<LoginPage />)
		await user.type(
			await screen.findByLabelText('Correo electrónico'),
			'anyone@example.com'
		)
		await user.type(screen.getByLabelText('Contraseña'), 'Abcdef12')
		await user.click(screen.getByRole('button', { name: 'Ingresar' }))
		await waitFor(() => expect(mocks.toastError).toHaveBeenCalled())
	}

	it('shows the generic throttle message when the rate limit code comes back', async () => {
		await submitWith({
			ok: false,
			error: 'CredentialsSignin',
			code: 'rate_limited',
		})
		expect(mocks.toastError).toHaveBeenCalledWith('Error de autenticación', {
			description: 'Demasiados intentos. Intenta de nuevo más tarde.',
		})
	})

	it('keeps the invalid-credentials message for other errors', async () => {
		await submitWith({
			ok: false,
			error: 'CredentialsSignin',
			code: 'credentials',
		})
		expect(mocks.toastError).toHaveBeenCalledWith('Error de autenticación', {
			description:
				'Credenciales inválidas o usuario no autorizado para este método de acceso.',
		})
	})
})
