/**
 * Cliente API centralizado
 *
 * Proporciona métodos type-safe para realizar peticiones HTTP
 * con manejo consistente de errores y headers.
 */
class ApiClient {
	private baseUrl = '/api'

	async get<T>(url: string): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
		})

		if (!response.ok) {
			const contentType = response.headers.get('content-type')
			const error = contentType?.includes('application/json')
				? await response.json().catch(() => ({}))
				: { error: `Error ${response.status}: ${response.statusText}` }
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		const contentType = response.headers.get('content-type')
		if (!contentType?.includes('application/json')) {
			const text = await response.text()
			if (!text) {
				throw new Error('Respuesta vacía del servidor')
			}
			throw new Error(`Respuesta no-JSON recibida: ${text.substring(0, 100)}`)
		}

		const text = await response.text()
		if (!text) {
			throw new Error('Respuesta vacía del servidor')
		}

		try {
			return JSON.parse(text) as T
		} catch (error) {
			throw new Error(`Error parseando JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	async post<T>(url: string, data: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
			credentials: 'include',
		})

		if (!response.ok) {
			const contentType = response.headers.get('content-type')
			const error = contentType?.includes('application/json')
				? await response.json().catch(() => ({}))
				: { error: `Error ${response.status}: ${response.statusText}` }
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		const contentType = response.headers.get('content-type')
		if (!contentType?.includes('application/json')) {
			const text = await response.text()
			if (!text) {
				throw new Error('Respuesta vacía del servidor')
			}
			throw new Error(`Respuesta no-JSON recibida: ${text.substring(0, 100)}`)
		}

		const text = await response.text()
		if (!text) {
			throw new Error('Respuesta vacía del servidor')
		}

		try {
			return JSON.parse(text) as T
		} catch (error) {
			throw new Error(`Error parseando JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	async put<T>(url: string, data: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
			credentials: 'include',
		})

		if (!response.ok) {
			const contentType = response.headers.get('content-type')
			const error = contentType?.includes('application/json')
				? await response.json().catch(() => ({}))
				: { error: `Error ${response.status}: ${response.statusText}` }
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		const contentType = response.headers.get('content-type')
		if (!contentType?.includes('application/json')) {
			const text = await response.text()
			if (!text) {
				throw new Error('Respuesta vacía del servidor')
			}
			throw new Error(`Respuesta no-JSON recibida: ${text.substring(0, 100)}`)
		}

		const text = await response.text()
		if (!text) {
			throw new Error('Respuesta vacía del servidor')
		}

		try {
			return JSON.parse(text) as T
		} catch (error) {
			throw new Error(`Error parseando JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	async patch<T>(url: string, data: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
			credentials: 'include',
		})

		if (!response.ok) {
			const contentType = response.headers.get('content-type')
			const error = contentType?.includes('application/json')
				? await response.json().catch(() => ({}))
				: { error: `Error ${response.status}: ${response.statusText}` }
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		const contentType = response.headers.get('content-type')
		if (!contentType?.includes('application/json')) {
			const text = await response.text()
			if (!text) {
				throw new Error('Respuesta vacía del servidor')
			}
			throw new Error(`Respuesta no-JSON recibida: ${text.substring(0, 100)}`)
		}

		const text = await response.text()
		if (!text) {
			throw new Error('Respuesta vacía del servidor')
		}

		try {
			return JSON.parse(text) as T
		} catch (error) {
			throw new Error(`Error parseando JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	async delete<T>(url: string): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			method: 'DELETE',
			credentials: 'include',
		})

		if (!response.ok) {
			const contentType = response.headers.get('content-type')
			const error = contentType?.includes('application/json')
				? await response.json().catch(() => ({}))
				: { error: `Error ${response.status}: ${response.statusText}` }
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		const contentType = response.headers.get('content-type')
		// DELETE puede devolver 204 No Content (sin body)
		if (response.status === 204 || !contentType?.includes('application/json')) {
			return {} as T
		}

		const text = await response.text()
		if (!text) {
			return {} as T
		}

		try {
			return JSON.parse(text) as T
		} catch (error) {
			throw new Error(`Error parseando JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}
}

export const apiClient = new ApiClient()
