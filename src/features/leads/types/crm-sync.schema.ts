import { z } from 'zod'

/**
 * CRM-agnostic ingestion contract for `POST /api/leads/crm-sync`.
 * n8n normalizes the CRM-specific payload (GoHighLevel today) into this shape.
 * Unknown keys are stripped (default Zod object behaviour).
 */
export const crmSyncPayloadSchema = z.object({
	externalCrmId: z.string().min(1, 'externalCrmId es obligatorio'),
	statusKey: z.string().min(1, 'statusKey es obligatorio'),
	name: z.string().optional(),
	lastName: z.string().optional(),
	email: z.union([z.literal(''), z.string().email()]).optional(),
	phone: z.string().optional(),
	identityNumber: z.string().optional(),
	originTag: z.string().optional(),
	externalUrl: z.union([z.literal(''), z.string().url()]).optional(),
	ownerEmail: z.union([z.literal(''), z.string().email()]).optional(),
	// Never a `z.enum()` — an unrecognized value MUST NOT reject the webhook
	// (D12). The service resolves it with `resolveOutcomeStatus()`.
	outcomeStatus: z
		.string()
		.transform((value) => value.trim().toUpperCase())
		.optional(),
})

export type CrmSyncPayload = z.infer<typeof crmSyncPayloadSchema>
