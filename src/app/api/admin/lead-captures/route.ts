import { NextResponse } from 'next/server'
import { requireLeadCaptureAdmin } from '@/features/leads/captures/lead-capture-admin'
import { leadCaptureSchema } from '@/features/leads/captures/lead-capture.schema'
import {
	listLeadCaptures,
	saveLeadCapture,
} from '@/features/leads/captures/lead-capture.service'
import { crmErrorResponse, readJsonBody } from '@/lib/auth/require-crm-actor'

export async function GET() {
	const guard = await requireLeadCaptureAdmin()
	if (!guard.ok) return guard.response
	try {
		return NextResponse.json({ data: await listLeadCaptures() })
	} catch (cause) {
		console.error('Error listing captures:', cause)
		return crmErrorResponse('No fue posible consultar capturas', 500)
	}
}
export async function POST(request: Request) {
	const guard = await requireLeadCaptureAdmin()
	if (!guard.ok) return guard.response
	const input = leadCaptureSchema.safeParse(await readJsonBody(request))
	if (!input.success)
		return crmErrorResponse(
			input.error.issues[0]?.message ?? 'Datos inválidos',
			400
		)
	try {
		const result = await saveLeadCapture(input.data)
		if (!result.ok) return crmErrorResponse(result.error, result.status)
		return NextResponse.json({ data: result.capture }, { status: 201 })
	} catch (cause) {
		console.error('Error creating capture:', cause)
		return crmErrorResponse('No fue posible crear la captura', 500)
	}
}
