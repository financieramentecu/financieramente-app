/**
 * Value Object: EmailAddress
 *
 * Encapsula una dirección de correo electrónico con validación.
 * Sigue el principio de inmutabilidad de Value Objects.
 */
export class EmailAddress {
	private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

	private constructor(private readonly value: string) {}

	/**
	 * Crea una instancia válida de EmailAddress
	 * @param email Dirección de correo electrónico
	 * @returns EmailAddress si es válido, Error si no lo es
	 */
	static create(email: string): EmailAddress | Error {
		if (!email || typeof email !== 'string') {
			return new Error('El email es requerido y debe ser una cadena de texto')
		}

		const trimmedEmail = email.trim().toLowerCase()

		if (trimmedEmail.length === 0) {
			return new Error('El email no puede estar vacío')
		}

		if (trimmedEmail.length > 254) {
			return new Error('El email no puede exceder 254 caracteres')
		}

		if (!this.EMAIL_REGEX.test(trimmedEmail)) {
			return new Error('El formato del email no es válido')
		}

		return new EmailAddress(trimmedEmail)
	}

	/**
	 * Obtiene el valor del email
	 */
	getValue(): string {
		return this.value
	}

	/**
	 * Compara si dos EmailAddress son iguales
	 */
	equals(other: EmailAddress): boolean {
		return this.value === other.value
	}

	/**
	 * Representación en string
	 */
	toString(): string {
		return this.value
	}
}
