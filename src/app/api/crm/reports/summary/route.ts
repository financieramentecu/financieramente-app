import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAccessibleUserIds, isHierarchyBypassRole } from '@/features/auth/lib/hierarchy'
import { canAccessCrm } from '@/features/leads/crm/crm-policy'
import { getCrmSummary } from '@/features/leads/analytics/crm-summary.service'
import { isFeatureEnabledServer } from '@/features/shared/lib/flagsmith-server'
import { getCurrentUserByEmail } from '@/features/negocios/services/user.service'
import type { ApiResponse } from '@/features/shared/types/api-response.types'

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: message } satisfies ApiResponse<null>, { status })
}

/** Hierarchy-scoped aggregate CRM metrics with no contact/business/payment projection. */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) return error('No autorizado', 401)
    if (!(await isFeatureEnabledServer('crm_reports', session.user.email))) {
      return error('CRM no disponible', 404)
    }
    const currentUser = await getCurrentUserByEmail(session.user.email)
    if (!currentUser) return error('Usuario no encontrado', 404)
    const roleCode = currentUser.role?.code
    if (!canAccessCrm(roleCode)) return error('Sin permisos para CRM', 403)
    const isBypass = isHierarchyBypassRole(roleCode)
    const visibleUserIds = isBypass ? [] : await getAccessibleUserIds(currentUser.idUser)
    const data = await getCrmSummary({ viewer: currentUser, visibleUserIds, isBypass })
    return NextResponse.json({ data } satisfies ApiResponse<typeof data>)
  } catch (cause) {
    console.error('Error fetching CRM summary:', cause)
    return error('Error al obtener el resumen CRM', 500)
  }
}
