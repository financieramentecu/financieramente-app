import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds, isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { leadSupportCaseCreateSchema } from '@/features/leads/cases/lead-support-case.schema'
import { createLeadSupportCaseTx } from '@/features/leads/cases/lead-support-case.service'

interface RouteContext { params: Promise<{ id: string }> }
interface CrmContext { idLead: number; idUser: number; roleCode: string | null | undefined; visibleUserIds: number[] }
function error(message: string, status: number) { return NextResponse.json({ data: null, error: message } satisfies ApiResponse<null>, { status }) }
function parseId(value: string) { const result = Number.parseInt(value, 10); return Number.isSafeInteger(result) && result > 0 ? result : null }
function isResponse(value: CrmContext | Response): value is Response { return value instanceof Response || (typeof value === 'object' && value !== null && 'status' in value && 'json' in value) }

async function resolveContext(context: RouteContext): Promise<CrmContext | Response> {
  const session = await auth()
  if (!session?.user?.email) return error('No autorizado', 401)
  if (!(await isFeatureEnabledServer('crm_cases', session.user.email))) return error('CRM no disponible', 404)
  const idLead = parseId((await context.params).id)
  if (!idLead) return error('Identificador de lead inválido', 400)
  const currentUser = await getCurrentUserByEmail(session.user.email)
  if (!currentUser) return error('Usuario no encontrado', 404)
  const roleCode = currentUser.role?.code
  if (!canAccessCrm(roleCode)) return error('Sin permisos para CRM', 403)
  const visibleUserIds = isHierarchyBypassRole(roleCode) ? [] : await getAccessibleUserIds(currentUser.idUser)
  const lead = await getLeadDetail(idLead, currentUser, { visibleUserIds })
  if (!lead) return error('Lead no encontrado', 404)
  return { idLead, idUser: currentUser.idUser, roleCode, visibleUserIds }
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const crm = await resolveContext(context)
    if (isResponse(crm)) return crm
    const cases = await prisma.leadSupportCase.findMany({
      where: { idLead: crm.idLead },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: { idLeadSupportCase: true, subject: true, status: true, priority: true, dueAt: true, resolvedAt: true, assignedTo: true, assignee: { select: { name: true, lastName: true } } },
    })
    return NextResponse.json({ data: cases } satisfies ApiResponse<typeof cases>)
  } catch (cause) {
    console.error('Error fetching lead support cases:', cause)
    return error('Error al obtener los casos de soporte', 500)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const crm = await resolveContext(context)
    if (isResponse(crm)) return crm
    if (!canManageCrm(crm.roleCode)) return error('Sin permisos para modificar CRM', 403)
    const input = leadSupportCaseCreateSchema.safeParse(await request.json())
    if (!input.success) return error('Caso inválido', 400)
    const allowedAssignee = input.data.assignedTo === undefined || crm.visibleUserIds.length === 0 || input.data.assignedTo === crm.idUser || crm.visibleUserIds.includes(input.data.assignedTo)
    if (!allowedAssignee) return error('No puedes asignar fuera de tu alcance', 403)
    if (input.data.idBusiness) {
      const linkedBusiness = await prisma.business.findUnique({ where: { idBusiness: input.data.idBusiness }, select: { idBusiness: true } })
      if (!linkedBusiness) return error('Negocio no encontrado', 404)
    }
    const supportCase = await prisma.$transaction((tx) => createLeadSupportCaseTx(tx, {
      idLead: crm.idLead,
      idBusiness: input.data.idBusiness,
      openedBy: crm.idUser,
      assignedTo: input.data.assignedTo,
      subject: input.data.subject,
      priority: input.data.priority,
      dueAt: input.data.dueAt ? new Date(input.data.dueAt) : null,
      correlationId: crypto.randomUUID(),
    }))
    return NextResponse.json({ data: supportCase }, { status: 201 })
  } catch (cause) {
    console.error('Error creating lead support case:', cause)
    return error('Error al crear el caso de soporte', 500)
  }
}
