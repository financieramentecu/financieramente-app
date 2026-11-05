import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/features/shared/types/api-response.types'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import { getAccessibleUserIds, isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { getLeadDetail } from '@/features/leads/services/lead-board.service'
import { canAccessCrm, canManageCrm } from '@/features/leads/crm/crm-policy'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { leadSupportCaseCommentSchema, leadSupportCaseUpdateSchema } from '@/features/leads/cases/lead-support-case.schema'
import { addLeadSupportCaseCommentTx, transitionLeadSupportCaseTx } from '@/features/leads/cases/lead-support-case.service'

interface RouteContext { params: Promise<{ id: string }> }
function error(message: string, status: number) { return NextResponse.json({ data: null, error: message } satisfies ApiResponse<null>, { status }) }
function parseId(value: string) { const result = Number.parseInt(value, 10); return Number.isSafeInteger(result) && result > 0 ? result : null }

async function resolveCase(context: RouteContext) {
  const session = await auth()
  if (!session?.user?.email) return { error: error('No autorizado', 401) }
  if (!(await isFeatureEnabledServer('crm_cases', session.user.email))) return { error: error('CRM no disponible', 404) }
  const idLeadSupportCase = parseId((await context.params).id)
  if (!idLeadSupportCase) return { error: error('Identificador de caso inválido', 400) }
  const currentUser = await getCurrentUserByEmail(session.user.email)
  if (!currentUser) return { error: error('Usuario no encontrado', 404) }
  const roleCode = currentUser.role?.code
  if (!canAccessCrm(roleCode) || !canManageCrm(roleCode)) return { error: error('Sin permisos para modificar CRM', 403) }
  const supportCase = await prisma.leadSupportCase.findUnique({ where: { idLeadSupportCase }, select: { idLeadSupportCase: true, idLead: true, status: true } })
  if (!supportCase) return { error: error('Caso no encontrado', 404) }
  const visibleUserIds = isHierarchyBypassRole(roleCode) ? [] : await getAccessibleUserIds(currentUser.idUser)
  const lead = await getLeadDetail(supportCase.idLead, currentUser, { visibleUserIds })
  if (!lead) return { error: error('Caso no encontrado', 404) }
  return { supportCase, currentUser, roleCode, visibleUserIds }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const resolved = await resolveCase(context)
    if ('error' in resolved) return resolved.error
    const input = leadSupportCaseUpdateSchema.safeParse(await request.json())
    if (!input.success) return error('Actualización inválida', 400)
    const allowedAssignee = input.data.assignedTo === undefined || resolved.visibleUserIds.length === 0 || input.data.assignedTo === resolved.currentUser.idUser || resolved.visibleUserIds.includes(input.data.assignedTo)
    if (!allowedAssignee) return error('No puedes asignar fuera de tu alcance', 403)
    const updated = await prisma.$transaction((tx) => transitionLeadSupportCaseTx(tx, {
      idLeadSupportCase: resolved.supportCase.idLeadSupportCase,
      idLead: resolved.supportCase.idLead,
      updatedBy: resolved.currentUser.idUser,
      status: input.data.status,
      assignedTo: input.data.assignedTo,
      correlationId: crypto.randomUUID(),
    }))
    return NextResponse.json({ data: updated })
  } catch (cause) {
    console.error('Error updating lead support case:', cause)
    return error('Error al actualizar el caso de soporte', 500)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const resolved = await resolveCase(context)
    if ('error' in resolved) return resolved.error
    const input = leadSupportCaseCommentSchema.safeParse(await request.json())
    if (!input.success) return error('Comentario inválido', 400)
    const comment = await prisma.$transaction((tx) => addLeadSupportCaseCommentTx(tx, {
      idLeadSupportCase: resolved.supportCase.idLeadSupportCase,
      idLead: resolved.supportCase.idLead,
      authorId: resolved.currentUser.idUser,
      body: input.data.body,
      correlationId: crypto.randomUUID(),
    }))
    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (cause) {
    console.error('Error creating lead support case comment:', cause)
    return error('Error al registrar el comentario', 500)
  }
}
