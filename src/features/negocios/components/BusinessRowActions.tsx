'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileImage, MoreVertical, Pencil, Eye, Trash2, ScrollText, MessageSquarePlus, AlertTriangle, CheckCircle2, Settings2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/features/shared/ui/tooltip'
import { Button } from '@/features/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/features/shared/ui/dropdown-menu'
import type { BusinessStatus, BusinessNovedadStatus, BusinessEntity } from '../types/business-entity.types'
import { BUSINESS_STATUS, BUSINESS_NOVEDAD_STATUS } from '../types/business-entity.types'
import { UserRole } from '@/features/auth/lib/roles'
import { UploadComprobanteModal } from '@/features/business-supports/components/UploadComprobanteModal'
import { ViewComprobantesSheet } from '@/features/business-supports/components/BusinessSupportsSheet'
import { CommentModal } from '@/features/comments/components/CommentModal'
import { isUploadAllowedStatus } from '@/features/business-supports/lib/upload-allowed-statuses'
import { useManageNovedad } from '../hooks/use-manage-novedad'
import { BusinessNovedadManageModal } from './modals/BusinessNovedadManageModal'
import { MANAGE_NOVEDAD_ALLOWED_ROLES } from './ui/NovedadManageTrigger'

export interface BusinessRowActionsProps {
  businessId: number
  businessStatus: BusinessStatus
  /** Contract number — may be null for early-stage businesses */
  contract: string | null
  supportCount?: number
  userRole?: UserRole
  hasPayments: boolean
  hasPendingPaymentFunding: boolean
  /** Estado de la novedad marcada sobre el negocio; null si nunca fue marcado */
  novedadStatus?: BusinessNovedadStatus | null
  onEdit?: (id: number) => void
  onView?: (id: number) => void
  onCancel?: (id: number) => void
  onViewObservations?: (id: number) => void
  onFondear?: (id: number) => void
  onUploadSuccess?: () => void
  onDeleteSuccess?: () => void
  onUploadComprobante?: (id: number) => void
  onViewComprobantes?: (id: number) => void
  onMarkNovedad?: (id: number) => void
  onUnmarkNovedad?: (id: number) => void
  /** Called after a successful manual novedad status change (Gestionar Novedad) */
  onManageNovedadSuccess?: (id: number) => void
}

export function BusinessRowActions({
  businessId,
  businessStatus,
  contract,
  supportCount: _supportCount,
  userRole,
  novedadStatus = null,
  onUploadSuccess,
  onDeleteSuccess,
  onEdit,
  onView,
  onCancel,
  onViewObservations,
  onUploadComprobante,
  onViewComprobantes,
  onMarkNovedad,
  onUnmarkNovedad,
  onManageNovedadSuccess,
}: BusinessRowActionsProps) {
  const canUpload = isUploadAllowedStatus(businessStatus)
  const canMarkNovedad =
    businessStatus === BUSINESS_STATUS.VENTA_EFECTUADA && novedadStatus === null
  const canUnmarkNovedad = novedadStatus === BUSINESS_NOVEDAD_STATUS.NUEVA
  const canManageNovedad =
    novedadStatus !== null &&
    userRole !== undefined &&
    MANAGE_NOVEDAD_ALLOWED_ROLES.includes(userRole)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [manageNovedadOpen, setManageNovedadOpen] = useState(false)
  const commentContract = contract ?? `Negocio #${businessId}`
  const { updateStatus } = useManageNovedad(businessId)

  const handleConfirmManageNovedad = async (target: BusinessNovedadStatus) => {
    const result = await updateStatus(target)
    if (result.data) {
      toast.success('Novedad actualizada correctamente')
      onManageNovedadSuccess?.(businessId)
    } else if (result.error) {
      toast.error(result.error)
      throw new Error(result.error)
    }
  }

  const handleUploadClick = () => {
    onUploadComprobante?.(businessId)
    setUploadOpen(true)
  }

  const handleViewClick = () => {
    onViewComprobantes?.(businessId)
    setViewOpen(true)
  }

  return (
    <TooltipProvider>
      <div className="inline-flex items-center gap-1">
        {/* Upload comprobante — visible when status is VENTA_EFECTUADA, EMITIDO, or FONDEADO */}
        {canUpload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Subir comprobante"
                onClick={handleUploadClick}
              >
                <Upload className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Subir comprobante</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* View comprobantes — always visible */}
        {(
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Ver comprobantes"
                onClick={handleViewClick}
              >
                <FileImage className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver comprobantes</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Más acciones">
              <MoreVertical className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(businessId)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            {onView && (
              <DropdownMenuItem onClick={() => onView(businessId)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalle
              </DropdownMenuItem>
            )}
            {onViewObservations && (
              <DropdownMenuItem onClick={() => onViewObservations(businessId)}>
                <ScrollText className="mr-2 h-4 w-4" />
                Ver motivo cancelación
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setCommentOpen(true)}>
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Agregar comentario
            </DropdownMenuItem>
            {onMarkNovedad && canMarkNovedad && (
              <DropdownMenuItem onClick={() => onMarkNovedad(businessId)}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Marcar Con Novedad
              </DropdownMenuItem>
            )}
            {onUnmarkNovedad && canUnmarkNovedad && (
              <DropdownMenuItem onClick={() => onUnmarkNovedad(businessId)}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Desmarcar Novedad
              </DropdownMenuItem>
            )}
            {canManageNovedad && (
              <DropdownMenuItem onClick={() => setManageNovedadOpen(true)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Gestionar Novedad
              </DropdownMenuItem>
            )}
            {onCancel && (
              <DropdownMenuItem
                onClick={() => onCancel(businessId)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {uploadOpen && (
        <UploadComprobanteModal
          businessId={businessId}
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSuccess={() => onUploadSuccess?.()}
        />
      )}

      {viewOpen && (
        <ViewComprobantesSheet
          businessId={businessId}
          userRole={userRole}
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          onSupportDeleted={onDeleteSuccess}
        />
      )}

      {commentOpen && (
        <CommentModal
          businessId={businessId}
          contract={commentContract}
          open={commentOpen}
          onClose={() => setCommentOpen(false)}
        />
      )}

      {manageNovedadOpen && (
        <BusinessNovedadManageModal
          open={manageNovedadOpen}
          onOpenChange={setManageNovedadOpen}
          business={{ id: businessId, novedadStatus } as BusinessEntity}
          onConfirm={handleConfirmManageNovedad}
        />
      )}
    </TooltipProvider>
  )
}
