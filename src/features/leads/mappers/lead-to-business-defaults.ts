import type { BusinessFormData } from '@/features/negocios/lib/business-form-schemas'
import type { LeadDetail } from '@/features/leads/types/lead.types'

type LeadContactFields = Pick<
	LeadDetail,
	'name' | 'lastName' | 'email' | 'phone' | 'identityNumber'
>

/**
 * Maps a `Lead`'s stored contact fields to `BusinessFormProps.defaultValues`
 * (the existing prop already consumed by `useBusinessForm`). Only the
 * contact fields the lead may have captured are prefilled — everything else
 * (product, currency, origin, value, agent, term, periodicity) is left for
 * the user to fill in the existing business creation form.
 *
 * Takes only the contact-field slice of `LeadDetail` (interface
 * segregation) — callers that already have a raw `Lead` (e.g.
 * `getLeadForConversion()`, which doesn't join `User` for `ownerName`)
 * don't need to build a full `LeadDetail` just to call this.
 *
 * `null` stored values map to `''` so React controlled inputs never receive
 * `null`/`undefined`. `Lead.lastName` maps to `defaultValues.lastNames`
 * (the form field name differs from the Prisma column name).
 */
export function mapLeadToBusinessDefaults(
	lead: LeadContactFields
): Partial<BusinessFormData> {
	return {
		name: lead.name ?? '',
		lastNames: lead.lastName ?? '',
		email: lead.email ?? '',
		phone: lead.phone ?? '',
		identityNumber: lead.identityNumber ?? '',
	}
}
