/**
 * Re-exporta tipos y constantes de estado de negocio desde business-entity.types.ts
 * (fuente canónica)
 */

export { BUSINESS_STATUS, type BusinessStatus } from './business-entity.types'

/**
 * Determina el estado del negocio basado en si tiene contrato o no
 *
 * @param contract - Número de contrato (opcional)
 * @returns Estado del negocio: EMITIDO si tiene contrato, VENTA_EFECTUADA si no
 */
export function determineBusinessStatus(
	contract?: string | null
): import('./business-entity.types').BusinessStatus {
	if (contract && contract.trim().length > 0) {
		return 'EMITIDO'
	}
	return 'VENTA_EFECTUADA'
}
