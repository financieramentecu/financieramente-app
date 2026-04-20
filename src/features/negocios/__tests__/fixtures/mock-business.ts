/**
 * Fixtures para testing de BusinessEntity
 * Proporciona datos mock para pruebas unitarias e integración
 */

import type {
	BusinessEntity,
	ClientInfo,
	AgentInfo,
	ProductInfo,
} from '../../types/business-entity.types'

/**
 * Crea un mock de información de cliente
 */
export function createMockClientInfo(
	overrides: Partial<ClientInfo> = {}
): ClientInfo {
	return {
		id: 1,
		fullName: 'María García López',
		identityNumber: '1234567890',
		email: 'maria.garcia@email.com',
		phone: '3001234567',
		...overrides,
	}
}

/**
 * Crea un mock de información de agente
 */
export function createMockAgentInfo(
	overrides: Partial<AgentInfo> = {}
): AgentInfo {
	return {
		id: 2,
		fullName: 'Carlos Agente Pérez',
		roleName: 'Agente/Coach',
		email: 'carlos.agente@financieramente.com',
		phone: '3009876543',
		...overrides,
	}
}

/**
 * Crea un mock de información de producto
 */
export function createMockProductInfo(
	overrides: Partial<ProductInfo> = {}
): ProductInfo {
	return {
		id: 1,
		name: 'Crédito Personal',
		companyId: 1,
		companyName: 'Skandia',
		...overrides,
	}
}

/**
 * Crea un mock de BusinessEntity completo
 * @param overrides - Propiedades para sobrescribir los valores por defecto
 */
export function createMockBusiness(
	overrides: Partial<BusinessEntity> = {}
): BusinessEntity {
	return {
		id: 1,
		contract: 'PN0001234',
		term: 12,
		value: 15000000,
		status: 'VENTA_EFECTUADA',
		createdAt: '2024-01-15T10:00:00.000Z',
		dateIssued: null,
		dateAnchored: null,
		hasAnnualPayments: false,
		hasPendingAnnualFunding: false,
		client: createMockClientInfo(overrides.client),
		agent: createMockAgentInfo(overrides.agent),
		product: createMockProductInfo(overrides.product),
		currency: { id: 1, name: 'COP' },
		periodicity: { id: 1, name: 'Mensual' },
		clientOrigin: { id: 1, name: 'Referido' },
		...overrides,
	}
}

/**
 * Mock de negocio en estado VENTA_EFECTUADA (sin contrato)
 */
export const mockVentaEfectuada = createMockBusiness({
	id: 1,
	status: 'VENTA_EFECTUADA',
	contract: null,
})

/**
 * Mock de negocio en estado EMITIDO (con contrato)
 */
export const mockEmitido = createMockBusiness({
	id: 2,
	status: 'EMITIDO',
	contract: 'PN0005678',
	dateIssued: '2024-02-01T12:00:00.000Z',
})

/**
 * Mock de negocio en estado CANCELADO
 */
export const mockCancelado = createMockBusiness({
	id: 3,
	status: 'CANCELADO',
	contract: 'PN0009999',
})

/**
 * Lista de negocios mock para testing de tabla
 */
export const mockBusinessList: BusinessEntity[] = [
	mockVentaEfectuada,
	mockEmitido,
	createMockBusiness({
		id: 4,
		status: 'VENTA_EFECTUADA',
		contract: null,
		value: 25000000,
		client: createMockClientInfo({
			id: 2,
			fullName: 'Juan Pérez García',
			identityNumber: '9876543210',
		}),
		product: createMockProductInfo({
			id: 2,
			name: 'Crédito Hipotecario',
			companyName: 'Trinity',
		}),
	}),
	createMockBusiness({
		id: 5,
		status: 'EMITIDO',
		contract: 'PN0003456',
		value: 8000000,
		client: createMockClientInfo({
			id: 3,
			fullName: 'Ana Rodríguez',
			identityNumber: '1122334455',
		}),
	}),
	mockCancelado,
]

/**
 * Negocios agrupados por estado para testing
 */
export const mockBusinessesByStatus = {
	ventaEfectuada: mockBusinessList.filter(
		(b) => b.status === 'VENTA_EFECTUADA'
	),
	emitido: mockBusinessList.filter((b) => b.status === 'EMITIDO'),
	cancelado: mockBusinessList.filter((b) => b.status === 'CANCELADO'),
}
