import type { Empresa, EmpresaListResponse } from '../../types/empresa.types'

/**
 * Crea un mock de Empresa para tests
 */
export function createMockEmpresa(
	overrides?: Partial<Empresa>
): Empresa {
	return {
		idCompany: 1,
		name: 'Skandia Seguros',
		status: true,
		createdAt: '2024-01-01T00:00:00.000Z',
		updatedAt: '2024-01-01T00:00:00.000Z',
		...overrides,
	}
}

/**
 * Crea un mock de EmpresaListResponse para tests
 */
export function createMockEmpresaListResponse(
	empresas: Empresa[] = [createMockEmpresa()],
	pagination?: Partial<EmpresaListResponse['pagination']>
): EmpresaListResponse {
	return {
		empresas,
		pagination: {
			page: 1,
			pageSize: 10,
			total: empresas.length,
			totalPages: Math.ceil(empresas.length / 10),
			...pagination,
		},
	}
}

