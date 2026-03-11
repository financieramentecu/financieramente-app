import type {
	DeriveFlowInput,
	PreLiquidacionFlow,
} from '@/features/pre-liquidacion/types/types'

/**
 * Derives the pre-liquidación flow for clawback persistence and balance behavior.
 * Order: VOLUNTARIA first, then POLIZA+isClawback → POLIZA_CLAW, then POLIZA+CARTERA → POLIZA_CARTERA, then POLIZA → POLIZA_NO_CLAW, fallback VOLUNTARIA.
 */
export function deriveFlow(registro: DeriveFlowInput): PreLiquidacionFlow {
	if (registro.commissionType === 'VOLUNTARIA') return 'VOLUNTARIA'
	if (registro.commissionType === 'POLIZA' && registro.isClawback)
		return 'POLIZA_CLAW'
	if (registro.commissionType === 'POLIZA' && registro.originCommission === 'CARTERA')
		return 'POLIZA_CARTERA'
	if (registro.commissionType === 'POLIZA') return 'POLIZA_NO_CLAW'
	return 'VOLUNTARIA'
}

/**
 * Returns true when clawback should be persisted (any Poliza flow, not Voluntarias).
 */
export function shouldPersistClawback(flow: PreLiquidacionFlow): boolean {
	return flow !== 'VOLUNTARIA'
}
