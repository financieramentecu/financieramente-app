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
			const error = await response.json().catch(() => ({}))
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		return response.json()
	}

	async post<T>(url: string, data: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
			credentials: 'include',
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({}))
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		return response.json()
	}

	async put<T>(url: string, data: unknown): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
			credentials: 'include',
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({}))
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		return response.json()
	}

	async delete<T>(url: string): Promise<T> {
		const response = await fetch(`${this.baseUrl}${url}`, {
			method: 'DELETE',
			credentials: 'include',
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({}))
			throw new Error(error.message || error.error || 'Error en la solicitud')
		}

		return response.json()
	}
}

export const apiClient = new ApiClient()
