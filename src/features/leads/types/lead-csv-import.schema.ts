import { z } from 'zod'

/**
 * Offset-aware ISO 8601 instant, same construction as `crm-sync.schema.ts`'s
 * `offsetAwareInstant` (pinned `zod@4.4.3` behavior): naive (offset-less)
 * strings, offsets without a colon, date-only strings, and epoch strings are
 * all rejected by construction. `fecha_creacion` follows the spec's explicit
 * "offset-aware ISO 8601 or reject" requirement rather than the plain
 * `YYYY-MM-DD` date-only convention used elsewhere in the app.
 */
const offsetAwareInstant = z.iso.datetime({ offset: true }).transform((value) => new Date(value))

/**
 * Zod row schema for one CSV data row (10 columns, raw string values as
 * extracted by `parseLeadCsvFile`). `columna_funnel` and `estado` are kept
 * as raw strings here — their strict resolution happens downstream via
 * `resolveFunnelColumnByName` and `parseLeadOutcomeStatus`, never via a
 * lenient Zod enum/fallback.
 */
export const leadCsvRowSchema = z.object({
	id_externo_crm: z.string().min(1, 'id_externo_crm es obligatorio'),
	nombre: z.string().optional(),
	apellido: z.string().optional(),
	telefono: z.string().optional(),
	correo: z.union([z.literal(''), z.string().email()]).optional(),
	columna_funnel: z.string().min(1, 'columna_funnel es obligatorio'),
	estado: z.string().min(1, 'estado es obligatorio'),
	fecha_creacion: offsetAwareInstant,
	origen: z.string().optional(),
	propietario_correo: z.union([z.literal(''), z.string().email()]).optional(),
	propietario_nombre: z.string().optional(),
})

export type LeadCsvRow = z.infer<typeof leadCsvRowSchema>
