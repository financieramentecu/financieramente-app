import { crmErrorResponse as error, findScopedLead, parsePositiveId, requireCrmActor } from '@/lib/auth/require-crm-actor'
import { attachmentContentDisposition } from '@/features/leads/activities/lead-activity-attachment'
import { loadLeadActivityFile } from '@/features/leads/activities/lead-activity-files.service'

interface RouteContext {
	params: Promise<{ id: string; activityId: string; index: string }>
}

/** Serves one file stored on a lead activity. Images are inline; documents download. */
export async function GET(_: Request, context: RouteContext) {
	try {
		const guard = await requireCrmActor('crm_timeline')
		if (!guard.ok) return guard.response
		const params = await context.params
		const idLead = parsePositiveId(params.id)
		const activityId = parsePositiveId(params.activityId)
		const index = Number.parseInt(params.index, 10)
		if (!idLead || !activityId || !Number.isInteger(index)) {
			return error('Archivo inválido', 400)
		}
		if (!(await findScopedLead(guard.actor, idLead))) return error('Lead no encontrado', 404)

		const file = await loadLeadActivityFile(idLead, activityId, index)
		if (!file) return error('Archivo no encontrado', 404)

		const body = new ArrayBuffer(file.bytes.byteLength)
		new Uint8Array(body).set(file.bytes)
		return new Response(body, {
			headers: {
				'Content-Type': file.mimeType,
				'Content-Disposition': attachmentContentDisposition(file.mimeType, file.name),
				'Cache-Control': 'private, no-store',
			},
		})
	} catch (cause) {
		console.error('Error reading lead activity file:', cause)
		return error('Error al abrir el archivo', 500)
	}
}
