import { z } from 'zod'

/**
 * Password rule for activation and reset (AA-05): 8..72 characters (72 is the
 * bcrypt input limit), with lowercase, uppercase, a digit and a special
 * character. Each regex below is the single source of truth, reused both by
 * the Zod schema (client + server validation, `account-token-handlers.ts`)
 * and by `PASSWORD_REQUIREMENTS` (live checklist UI) — never duplicate them.
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

const LOWERCASE_RE = /\p{Ll}/u
const UPPERCASE_RE = /\p{Lu}/u
const DIGIT_RE = /\d/
/** Anything that is not a letter, digit or whitespace counts as "special". */
const SPECIAL_RE = /[^\p{L}\d\s]/u

export interface PasswordRequirement {
	readonly id: 'length' | 'lowercase' | 'uppercase' | 'number' | 'special'
	readonly label: string
	readonly test: (password: string) => boolean
}

/** Drives the live password-strength checklist shown while the user types. */
export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
	{
		id: 'length',
		label: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`,
		test: (password) => password.length >= PASSWORD_MIN_LENGTH,
	},
	{
		id: 'lowercase',
		label: 'Una letra minúscula',
		test: (password) => LOWERCASE_RE.test(password),
	},
	{
		id: 'uppercase',
		label: 'Una letra mayúscula',
		test: (password) => UPPERCASE_RE.test(password),
	},
	{
		id: 'number',
		label: 'Un número',
		test: (password) => DIGIT_RE.test(password),
	},
	{
		id: 'special',
		label: 'Un carácter especial (!@#$%...)',
		test: (password) => SPECIAL_RE.test(password),
	},
]

export const accountPasswordSchema = z
	.string({ error: 'La contraseña es obligatoria' })
	.min(
		PASSWORD_MIN_LENGTH,
		`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
	)
	.max(
		PASSWORD_MAX_LENGTH,
		`La contraseña no puede superar ${PASSWORD_MAX_LENGTH} caracteres`
	)
	.regex(LOWERCASE_RE, 'La contraseña debe contener al menos una letra minúscula')
	.regex(UPPERCASE_RE, 'La contraseña debe contener al menos una letra mayúscula')
	.regex(DIGIT_RE, 'La contraseña debe contener al menos un número')
	.regex(SPECIAL_RE, 'La contraseña debe contener al menos un carácter especial')

export type AccountPassword = z.infer<typeof accountPasswordSchema>
