import { DOCUMENT_DATA_TYPES } from '@/features/document-types/lib/document-data-type'

/**
 * Lista base precargada al desplegar Tipos de Documento.
 * Las longitudes siguen el uso habitual en Colombia y caben en
 * `client.identity_number` / `user.identity_number` (VARCHAR 20).
 */
export const STANDARD_DOCUMENT_TYPES = [
	{
		name: 'Cédula de Ciudadanía',
		code: 'CC',
		dataType: DOCUMENT_DATA_TYPES.NUMERIC,
		minLength: 6,
		maxLength: 10,
	},
	{
		name: 'Cédula de Extranjería',
		code: 'CE',
		dataType: DOCUMENT_DATA_TYPES.ALPHANUMERIC,
		minLength: 6,
		maxLength: 7,
	},
	{
		name: 'Pasaporte',
		code: 'PAS',
		dataType: DOCUMENT_DATA_TYPES.ALPHANUMERIC,
		minLength: 6,
		maxLength: 15,
	},
	{
		name: 'Número de Identificación Tributaria',
		code: 'NIT',
		dataType: DOCUMENT_DATA_TYPES.NUMERIC,
		minLength: 9,
		maxLength: 10,
	},
	{
		name: 'Permiso de Protección Temporal',
		code: 'PPT',
		dataType: DOCUMENT_DATA_TYPES.ALPHANUMERIC,
		minLength: 6,
		maxLength: 15,
	},
] as const
