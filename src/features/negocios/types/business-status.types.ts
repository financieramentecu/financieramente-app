/**
 * Tipos y constantes para estados de negocio
 */

/**
 * Estados posibles de un negocio
 */
export type BusinessStatus = 'VENTA_EFECTUADA' | 'EMITIDO'

/**
 * Constantes para los estados de negocio
 */
export const BUSINESS_STATUS = {
	VENTA_EFECTUADA: 'VENTA_EFECTUADA' as const,
	EMITIDO: 'EMITIDO' as const,
} as const

/**
 * Determina el estado del negocio basado en si tiene contrato o no
 *
 * @param contract - Número de contrato (opcional)
 * @returns Estado del negocio: EMITIDO si tiene contrato, VENTA_EFECTUADA si no
 */
export function determineBusinessStatus(
	contract?: string | null
): BusinessStatus {
	if (contract && contract.trim().length > 0) {
		return BUSINESS_STATUS.EMITIDO
	}
	return BUSINESS_STATUS.VENTA_EFECTUADA
}
