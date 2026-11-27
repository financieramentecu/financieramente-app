import { NextResponse } from 'next/server'
import { listLeadCaptures } from '@/features/leads/captures/lead-capture.service'
import { requireCrmActor, crmErrorResponse } from '@/lib/auth/require-crm-actor'

export async function GET() {
	const guard = await requireCrmActor('leads_module')
	if (!guard.ok) return guard.response
	try {
		return NextResponse.json({ data: await listLeadCaptures(true) })
	} catch (cause) {
		console.error('Error listing captures:', cause)
		return crmErrorResponse('No fue posible consultar capturas', 500)
	}
}
