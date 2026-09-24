import type { LeadCsvRow } from '@/features/leads/types/lead-csv-import.schema'
import type { CrmSyncPayload } from '@/features/leads/types/crm-sync.schema'

/**
 * Maps a validated `LeadCsvRow` to the `CrmSyncPayload` shape consumed
 * as-is by `buildLeadUpsertData` (webhook builder, unmodified). Preserves
 * "omit means preserve": an empty optional CSV value maps to `undefined`,
 * never an empty string, so `buildLeadUpsertData`'s trim-and-skip merge
 * logic leaves the previously stored value untouched.
 *
 * `statusKey` is a required field on `CrmSyncPayload` for the webhook
 * contract, but the CSV import path never uses it — the funnel column is
 * already resolved directly by `resolveFunnelColumnByName` before this
 * payload is built, and `buildLeadUpsertData` never reads `.statusKey`. The
 * empty placeholder here is inert by construction.
 */
export function mapCsvRowToLeadPayload(row: LeadCsvRow): CrmSyncPayload {
	const originTag = row.origen && row.origen.trim() !== '' ? row.origen : undefined
	const ownerEmail =
		row.propietario_correo && row.propietario_correo.trim() !== ''
			? row.propietario_correo
			: undefined

	return {
		externalCrmId: row.id_externo_crm,
		statusKey: '',
		name: row.nombre,
		lastName: row.apellido,
		phone: row.telefono,
		email: row.correo,
		originTag,
		ownerEmail,
		createdAt: row.fecha_creacion,
	}
}
