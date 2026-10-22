import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetPasswordScreen } from '../set-password-screen'
import { ForgotPasswordScreen } from '../forgot-password-screen'

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

describe('SetPasswordScreen (activate)', () => {
	it('shows the invalid-link state when the server says the link is closed', () => {
		render(<SetPasswordScreen mode="activate" token="abc" linkValid={false} />)
		expect(screen.getByText('Enlace inválido o vencido')).toBeTruthy()
		expect(screen.queryByLabelText('Nueva contraseña')).toBeNull()
	})

	it('shows the invalid-link state without a token and never fetches', () => {
		render(<SetPasswordScreen mode="reset" token={null} linkValid={false} />)
		expect(screen.getByText('Enlace inválido o vencido')).toBeTruthy()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('does not render a form when linkValid is false even if a token is present', () => {
		render(<SetPasswordScreen mode="reset" token="abc" linkValid={false} />)
		expect(
			screen.queryByRole('button', { name: 'Restablecer contraseña' })
		).toBeNull()
	})

	it('links an invalid reset page to /forgot-password to request a new one', () => {
		render(<SetPasswordScreen mode="reset" token={null} linkValid={false} />)
		const link = screen.getByRole('link', {
			name: 'Solicitar un nuevo enlace',
		})
		expect(link.getAttribute('href')).toBe('/forgot-password')
	})

	it('renders the form immediately for a valid link, with no preview request', () => {
		render(<SetPasswordScreen mode="activate" token="abc" linkValid />)
		expect(screen.getByLabelText('Nueva contraseña')).toBeTruthy()
		expect(screen.getByLabelText('Confirmar contraseña')).toBeTruthy()
		expect(screen.getByText('Mínimo 8 caracteres')).toBeTruthy()
		expect(screen.getByText('Un carácter especial (!@#$%...)')).toBeTruthy()
		expect(screen.queryByText('Verificando enlace...')).toBeNull()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('blocks submit when the confirmation does not match', async () => {
		const user = userEvent.setup()
		render(<SetPasswordScreen mode="activate" token="abc" linkValid />)
		await user.type(screen.getByLabelText('Nueva contraseña'), 'Abcdef1!')
		await user.type(screen.getByLabelText('Confirmar contraseña'), 'Abcdef2!')
		await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))
		expect(await screen.findByText('Las contraseñas no coinciden')).toBeTruthy()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('blocks submit when the password breaks the rule', async () => {
		const user = userEvent.setup()
		render(<SetPasswordScreen mode="activate" token="abc" linkValid />)
		await user.type(screen.getByLabelText('Nueva contraseña'), 'abc')
		await user.type(screen.getByLabelText('Confirmar contraseña'), 'abc')
		await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))
		expect(
			await screen.findByText('La contraseña debe tener al menos 8 caracteres')
		).toBeTruthy()
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it('shows the success state with a link to /login after a successful submit', async () => {
		const user = userEvent.setup()
		fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
		render(<SetPasswordScreen mode="activate" token="abc" linkValid />)
		await user.type(screen.getByLabelText('Nueva contraseña'), 'Abcdef1!')
		await user.type(screen.getByLabelText('Confirmar contraseña'), 'Abcdef1!')
		await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))

		const link = await screen.findByRole('link', {
			name: 'Ir a iniciar sesión',
		})
		expect(link.getAttribute('href')).toBe('/login')
		const [url, init] = fetchMock.mock.calls[0]
		expect(url).toBe('/api/account/activate')
		expect(JSON.parse(init.body)).toEqual({
			token: 'abc',
			password: 'Abcdef1!',
		})
	})

	it('shows the server error when the submit is rejected', async () => {
		const user = userEvent.setup()
		fetchMock.mockResolvedValueOnce(
			jsonResponse({ data: null, error: 'Enlace inválido o vencido' }, 400)
		)
		render(<SetPasswordScreen mode="reset" token="abc" linkValid />)
		await user.type(screen.getByLabelText('Nueva contraseña'), 'Abcdef1!')
		await user.type(screen.getByLabelText('Confirmar contraseña'), 'Abcdef1!')
		await user.click(
			screen.getByRole('button', { name: 'Restablecer contraseña' })
		)
		await waitFor(() =>
			expect(screen.getByRole('alert').textContent).toContain(
				'Enlace inválido o vencido'
			)
		)
		expect(fetchMock.mock.calls[0][0]).toBe('/api/account/reset-password')
	})

	it('removes the token from the address bar without breaking the submit', async () => {
		const user = userEvent.setup()
		window.history.replaceState(null, '', '/activate-account?token=abc')
		fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
		render(<SetPasswordScreen mode="activate" token="abc" linkValid />)
		await waitFor(() => expect(window.location.search).toBe(''))
		expect(window.location.pathname).toBe('/activate-account')

		await user.type(screen.getByLabelText('Nueva contraseña'), 'Abcdef1!')
		await user.type(screen.getByLabelText('Confirmar contraseña'), 'Abcdef1!')
		await user.click(screen.getByRole('button', { name: 'Activar cuenta' }))
		await screen.findByRole('link', { name: 'Ir a iniciar sesión' })
		expect(JSON.parse(fetchMock.mock.calls[0][1].body).token).toBe('abc')
	})

	it('leaves other query parameters alone when stripping the token', async () => {
		window.history.replaceState(null, '', '/reset-password?token=abc&x=1')
		render(<SetPasswordScreen mode="reset" token="abc" linkValid />)
		await waitFor(() => expect(window.location.search).toBe('?x=1'))
	})
})

describe('ForgotPasswordScreen', () => {
	const CONFIRMATION =
		'Si el correo está registrado, te enviaremos un enlace para restablecer tu contraseña.'

	it('shows the same confirmation after submitting', async () => {
		const user = userEvent.setup()
		fetchMock.mockResolvedValueOnce(jsonResponse({ data: { ok: true } }))
		render(<ForgotPasswordScreen />)
		await user.type(
			screen.getByLabelText('Correo electrónico'),
			'ana@example.com'
		)
		await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
		expect(await screen.findByText(CONFIRMATION)).toBeTruthy()
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
			email: 'ana@example.com',
		})
	})

	it('shows the rate limit message from the server', async () => {
		const user = userEvent.setup()
		fetchMock.mockResolvedValueOnce(
			jsonResponse({ data: null, error: 'Demasiadas solicitudes.' }, 429)
		)
		render(<ForgotPasswordScreen />)
		await user.type(
			screen.getByLabelText('Correo electrónico'),
			'ana@example.com'
		)
		await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
		expect((await screen.findByRole('alert')).textContent).toContain(
			'Demasiadas solicitudes.'
		)
		expect(screen.queryByText(CONFIRMATION)).toBeNull()
	})

	it('offers a way back to /login', () => {
		render(<ForgotPasswordScreen />)
		const link = screen.getByRole('link', { name: 'Volver a iniciar sesión' })
		expect(link.getAttribute('href')).toBe('/login')
	})
})
