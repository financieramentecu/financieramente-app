import { NextResponse } from 'next/server'
import { requireLeadCaptureAdmin } from '@/features/leads/captures/lead-capture-admin'
import { leadCapturePatchSchema } from '@/features/leads/captures/lead-capture.schema'
import { saveLeadCapture } from '@/features/leads/captures/lead-capture.service'
import {
	crmErrorResponse,
	readJsonBody,
	parsePositiveId,
} from '@/lib/auth/require-crm-actor'

export async function PUT(
	request: Request,
	context: { params: Promise<{ id: string }> }
) {
	const guard = await requireLeadCaptureAdmin()
	if (!guard.ok) return guard.response
	const id = parsePositiveId((await context.params).id)
	if (!id) return crmErrorResponse('Identificador inválido', 400)
	const input = leadCapturePatchSchema.safeParse(await readJsonBody(request))
	if (!input.success)
		return crmErrorResponse(
			input.error.issues[0]?.message ?? 'Datos inválidos',
			400
		)
	try {
		const result = await saveLeadCapture(input.data, id)
		if (!result.ok) return crmErrorResponse(result.error, result.status)
		return NextResponse.json({ data: result.capture })
	} catch (cause) {
		console.error('Error updating capture:', cause)
		return crmErrorResponse('No fue posible actualizar la captura', 500)
	}
}
