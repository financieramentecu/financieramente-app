import { prisma } from '@/lib/prisma'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { presignPutUrl, presignGetUrl, getSpacesConfig } from '../lib/spaces-client'
import { buildComprobanteKey } from '../lib/object-key'
import { isAllowedMime, extensionFor } from '../lib/mime-utils'
import {
  BusinessSupportDTO,
  ComprobanteError,
  PersistComprobanteInput,
  PresignResponse,
  RequestContext,
} from '../types/business-support.types'

const ALLOWED_STATUSES = ['EMITIDO', 'FONDEADO']

function toDTO(
  row: {
    id: string
    businessId: number
    objectKey: string
    mimeType: string
    sizeBytes: number
    uploadedBy: number
    createdAt: Date
    uploader: { idUser: number; name: string }
  },
  viewUrl?: string,
): BusinessSupportDTO {
  return {
    id: row.id,
    businessId: row.businessId,
    objectKey: row.objectKey,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    uploadedBy: {
      id: row.uploader.idUser,
      name: row.uploader.name,
    },
    createdAt: row.createdAt.toISOString(),
    viewUrl,
  }
}

/** List active comprobantes for a negocio, with presigned view URLs */
export async function listComprobantes(
  businessId: number,
): Promise<BusinessSupportDTO[]> {
  const rows = await prisma.businessSupport.findMany({
    where: { businessId, status: true },
    orderBy: { createdAt: 'desc' },
    include: {
      uploader: {
        select: { idUser: true, name: true },
      },
    },
  })

  return Promise.all(
    rows.map(async (row) => {
      const viewUrl = await presignGetUrl(row.objectKey).catch(() => undefined)
      return toDTO(row as Parameters<typeof toDTO>[0], viewUrl)
    }),
  )
}

/** Validate business and generate a presigned PUT URL for direct upload */
export async function presignComprobanteUpload(
  businessId: number,
  mime: string,
  _size: number,
  _ctx: RequestContext,
): Promise<PresignResponse> {
  const business = await prisma.business.findUnique({
    where: { idBusiness: businessId },
    select: { idBusiness: true, status: true, contract: true },
  })

  if (!business) {
    throw new ComprobanteError('NOT_FOUND', `Negocio ${businessId} not found`)
  }

  if (!business.status || !ALLOWED_STATUSES.includes(business.status)) {
    throw new ComprobanteError(
      'INVALID_STATUS',
      `Negocio status '${business.status}' is not allowed for uploads`,
    )
  }

  if (!business.contract) {
    throw new ComprobanteError('NO_CONTRACT', 'Negocio has no contract number')
  }

  if (!isAllowedMime(mime)) {
    throw new ComprobanteError('INVALID_MIME', `MIME type '${mime}' is not allowed`)
  }

  const ext = extensionFor(mime)!
  const { prefix } = getSpacesConfig()
  const key = buildComprobanteKey({ prefix, contract: business.contract, ext })
  const url = await presignPutUrl(key, mime)

  return { url, key }
}

/** Persist a BusinessSupport record after successful direct upload */
export async function persistComprobante(
  businessId: number,
  input: PersistComprobanteInput,
  ctx: RequestContext,
): Promise<BusinessSupportDTO> {
  if (!isAllowedMime(input.mime)) {
    throw new ComprobanteError('INVALID_MIME', `MIME type '${input.mime}' is not allowed`)
  }

  const row = await prisma.businessSupport.create({
    data: {
      businessId,
      objectKey: input.key,
      mimeType: input.mime,
      sizeBytes: input.size,
      uploadedBy: ctx.userId,
    },
    include: {
      uploader: {
        select: { idUser: true, name: true },
      },
      business: {
        select: { contract: true, user: { select: { name: true } } }
      }
    },
  })

  await logAuditEvent({
    userId: ctx.userId,
    email: ctx.email,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    action: AuditAction.COMPROBANTE_UPLOADED,
    details: `Comprobante uploaded for negocio ${businessId}: ${input.key}`,
  })

  try {
    // Buscar analistas de soporte (y admins)
    const targetUsers = await prisma.user.findMany({
      where: { role: { code: { in: ['SUPPORT', 'ADMIN'] } }, active: true },
      select: { idUser: true }
    })

    const title = 'Nuevo soporte adjuntado'
    const message = `Se ha subido un soporte para el contrato ${row.business.contract} (Agente: ${row.business.user.name})`

    const createdNotifications = await Promise.all(
      targetUsers.map(u => prisma.notification.create({ 
        data: {
          idUser: u.idUser,
          idBusiness: businessId,
          title,
          message
        }
      }))
    )

    const { notificationProvider } = await import('@/features/shared/services/notifications/pusher-notification-provider')
    for (const n of createdNotifications) {
      await notificationProvider.sendNotification(n.idUser, n).catch(err => {
        console.error('Error in sendNotification:', err)
      })
    }
  } catch (error) {
    console.error('Error creating notifications for uploaded support:', error)
  }

  return toDTO(row as Parameters<typeof toDTO>[0])
}

/** Soft-delete a BusinessSupport record (status = false) */
export async function deactivateComprobante(
  supportId: string,
  ctx: RequestContext,
): Promise<void> {
  const existing = await prisma.businessSupport.findUnique({
    where: { id: supportId },
  })

  if (!existing) {
    throw new ComprobanteError('NOT_FOUND', `BusinessSupport ${supportId} not found`)
  }

  await prisma.businessSupport.update({
    where: { id: supportId },
    data: { status: false },
  })

  await logAuditEvent({
    userId: ctx.userId,
    email: ctx.email,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    action: AuditAction.COMPROBANTE_DEACTIVATED,
    details: `Comprobante deactivated: ${supportId}`,
  })
}
