'use client'

import { useState } from 'react'
import { partnerApi } from '../lib/partner-api'
import type { PartnerWithEmailResult } from '../types/partner.types'

export type PartnerAction = 'deactivate' | 'reactivate' | 'resend'

export interface PendingPartnerAction {
	id: number
	action: PartnerAction
}

export type PartnerActionOutcome =
	| { ok: true; emailSent?: boolean }
	| { ok: false; error: string }

async function execute(
	action: PartnerAction,
	id: number
): Promise<{ emailSent?: boolean }> {
	switch (action) {
		case 'deactivate':
			await partnerApi.deactivate(id)
			return {}
		case 'reactivate':
			await partnerApi.reactivate(id)
			return {}
		case 'resend': {
			const result: PartnerWithEmailResult =
				await partnerApi.resendActivation(id)
			return { emailSent: result.emailSent }
		}
	}
}

/**
 * Runs deactivate / reactivate / resend for one partner at a time and asks
 * the caller to refresh the list after a successful change.
 */
export function usePartnerActions(onChanged: () => Promise<void> | void) {
	const [pending, setPending] = useState<PendingPartnerAction | null>(null)

	async function run(
		action: PartnerAction,
		id: number
	): Promise<PartnerActionOutcome> {
		setPending({ id, action })
		try {
			const result = await execute(action, id)
			await onChanged()
			return { ok: true, ...result }
		} catch (error) {
			return {
				ok: false,
				error:
					error instanceof Error && error.message
						? error.message
						: 'No se pudo completar la acción',
			}
		} finally {
			setPending(null)
		}
	}

	return { pending, run }
}
