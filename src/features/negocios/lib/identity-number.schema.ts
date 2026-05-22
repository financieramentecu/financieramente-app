import { z } from 'zod'

export const IDENTITY_NUMBER_REGEX = /^[A-Za-z0-9.\-]+$/
export const IDENTITY_NUMBER_MIN = 5
export const IDENTITY_NUMBER_MAX = 20

export const identityNumberSchema = z
	.string()
	.min(1, 'El número de identificación es obligatorio')
	.min(
		IDENTITY_NUMBER_MIN,
		`El número de identificación debe tener al menos ${IDENTITY_NUMBER_MIN} caracteres`
	)
	.max(
		IDENTITY_NUMBER_MAX,
		`El número de identificación no puede exceder ${IDENTITY_NUMBER_MAX} caracteres`
	)
	.regex(
		IDENTITY_NUMBER_REGEX,
		'El número de identificación solo puede contener letras, números, puntos y guiones'
	)
