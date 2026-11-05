import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import {
	getAccessibleUserIds,
	isHierarchyBypassRole,
} from '@/features/auth/lib/hierarchy'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import { leadCrmEventInputSchema } from '@/features/leads/crm/lead-crm-event.schema'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import {
	appendLeadActivityTx,
	getLeadActivityPage,
	type LeadActivityCursor,
	type LeadActivityPage,
} from '@/features/leads/activities/lead-activity.service'

interface RouteContext {
	params: Promise<{ id: string }>
}

interface CrmRouteContext {
	idLead: number
	idUser: number
	roleCode: string | null | undefined
	visibleUserIds: number[]
}

function error(message: string, status: number) {
	const body: ApiResponse<null> = { data: null, error: message }
	return NextResponse.json(body, { status })
}

function isRouteResponse(value: CrmRouteContext | Response): value is Response {
	return (
		value instanceof Response ||
		(typeof value === 'object' &&
			value !== null &&
			'status' in value &&
			'json' in value)
	)
}

function parseLeadId(value: string): number | null {
	const idLead = Number.parseInt(value, 10)
	return Number.isSafeInteger(idLead) && idLead > 0 ? idLead : null
}

function parseCursor(value: string | null): LeadActivityCursor | undefined {
	if (!value) return undefined
	const [dateValue, idValue] = value.split('|')
	const occurredAt = new Date(dateValue)
	const idLeadActivity = Number.parseInt(idValue ?? '', 10)
	if (
		Number.isNaN(occurredAt.getTime()) ||
		!Number.isSafeInteger(idLeadActivity) ||
		idLeadActivity < 1
	) {
		return undefined
	}
	return { occurredAt, idLeadActivity }
}

async function resolveCrmContext(
	context: RouteContext
): Promise<CrmRouteContext | Response> {
	const session = await auth()
	if (!session?.user?.email) return error('No autorizado', 401)
	if (!(await isFeatureEnabledServer('crm_timeline', session.user.email))) {
		return error('CRM no disponible', 404)
	}

	const { id } = await context.params
	const idLead = parseLeadId(id)
	if (!idLead) return error('Identificador de lead inválido', 400)

	const currentUser = await getCurrentUserByEmail(session.user.email)
	if (!currentUser) return error('Usuario no encontrado', 404)
	const roleCode = currentUser.role?.code
	if (!canAccessCrm(roleCode)) return error('Sin permisos para CRM', 403)

	const visibleUserIds = isHierarchyBypassRole(roleCode)
		? []
		: await getAccessibleUserIds(currentUser.idUser)
	const lead = await getLeadDetail(idLead, currentUser, { visibleUserIds })
	if (!lead) return error('Lead no encontrado', 404)

	return { idLead, idUser: currentUser.idUser, roleCode, visibleUserIds }
}

export async function GET(request: Request, context: RouteContext) {
	try {
		const crm = await resolveCrmContext(context)
		if (isRouteResponse(crm)) return crm

		const url = new URL(request.url)
		const requestedLimit = Number.parseInt(
			url.searchParams.get('limit') ?? '25',
			10
		)
		if (
			!Number.isFinite(requestedLimit) ||
			requestedLimit < 1 ||
			requestedLimit > 100
		) {
			return error('Límite inválido', 400)
		}
		const cursorValue = url.searchParams.get('cursor')
		const cursor = parseCursor(cursorValue)
		if (cursorValue && !cursor) return error('Cursor inválido', 400)

		const page = await getLeadActivityPage(prisma, crm.idLead, {
			limit: requestedLimit,
			cursor,
		})
		const body: ApiResponse<LeadActivityPage> = { data: page }
		return NextResponse.json(body)
	} catch (cause) {
		console.error('Error fetching lead activities:', cause)
		return error('Error al obtener las actividades del lead', 500)
	}
}

export async function POST(request: Request, context: RouteContext) {
	try {
		const crm = await resolveCrmContext(context)
		if (isRouteResponse(crm)) return crm
		if (!canManageCrm(crm.roleCode))
			return error('Sin permisos para modificar CRM', 403)

		const input = leadCrmEventInputSchema.safeParse(await request.json())
		if (!input.success) return error('Actividad inválida', 400)

		const activity = await prisma.$transaction((tx) =>
			appendLeadActivityTx(tx, {
				idLead: crm.idLead,
				idUser: crm.idUser,
				type: input.data.type,
				payload: input.data.payload,
				correlationId: crypto.randomUUID(),
			})
		)
		return NextResponse.json({ data: activity }, { status: 201 })
	} catch (cause) {
		console.error('Error appending lead activity:', cause)
		return error('Error al registrar la actividad del lead', 500)
	}
}
