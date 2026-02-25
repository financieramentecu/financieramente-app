const FILE_TYPES = {
	POLIZA: 'POLIZA',
	VOLUNTARIA: 'VOLUNTARIA',
} as const

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES]

const POLIZA_REQUIRED_HEADERS = [
	'Polizas Periodo',
	'Plan de Compensación',
	'Valor Comisión',
	'BASE',
	'Polizas Producto',
	'Contrato Largo',
	'Polizas Id Agente',
	'Polizas Nombre Agente',
	'Polizas Id Sociedad',
	'Nombre Sociedad',
	'Polizas Clasificación',
] as const

const VOLUNTARIA_REQUIRED_HEADERS = [
	'Nombre Franquicia',
	'Desde',
	'Hasta',
	'Nombre Fp',
	'Sub Grupo Fp',
	'Compania',
	'Producto',
	'Tipo de Comision',
	'Cto',
	'Base',
	'Com',
] as const

export type PolizaHeader = (typeof POLIZA_REQUIRED_HEADERS)[number]
export type VoluntariaHeader = (typeof VOLUNTARIA_REQUIRED_HEADERS)[number]
export type FileTypeHeader = PolizaHeader | VoluntariaHeader

const FILE_TYPE_REQUIRED_HEADERS = {
	[FILE_TYPES.POLIZA]: POLIZA_REQUIRED_HEADERS,
	[FILE_TYPES.VOLUNTARIA]: VOLUNTARIA_REQUIRED_HEADERS,
} as const

export {
	FILE_TYPES,
	FILE_TYPE_REQUIRED_HEADERS,
	POLIZA_REQUIRED_HEADERS,
	VOLUNTARIA_REQUIRED_HEADERS,
}
