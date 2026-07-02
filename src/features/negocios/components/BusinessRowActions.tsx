'use client'

import { useState } from 'react'
import { Upload, FileImage, MoreVertical, Pencil, Eye, Trash2, ScrollText } from 'lucide-react'
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
import type { BusinessStatus } from '../types/business-entity.types'
import { BUSINESS_STATUS } from '../types/business-entity.types'
import type { UserRole } from '@/features/auth/lib/roles'
import { UploadComprobanteModal } from '@/features/business-supports/components/UploadComprobanteModal'
import { ViewComprobantesSheet } from '@/features/business-supports/components/BusinessSupportsSheet'

const UPLOAD_ALLOWED_STATUSES: BusinessStatus[] = [
  BUSINESS_STATUS.EMITIDO,
  BUSINESS_STATUS.FONDEADO,
]

export interface BusinessRowActionsProps {
  businessId: number
  businessStatus: BusinessStatus
  /** Contract number — upload is only available when not null */
  contract: string | null
  supportCount?: number
  userRole?: UserRole
  hasPayments: boolean
  hasPendingPaymentFunding: boolean
  onEdit?: (id: number) => void
  onView?: (id: number) => void
  onCancel?: (id: number) => void
  onViewObservations?: (id: number) => void
  onFondear?: (id: number) => void
  onUploadSuccess?: () => void
  onDeleteSuccess?: () => void
  onUploadComprobante?: (id: number) => void
  onViewComprobantes?: (id: number) => void
}

export function BusinessRowActions({
  businessId,
  businessStatus,
  contract,
  supportCount: _supportCount,
  userRole,
  onUploadSuccess,
  onDeleteSuccess,
  onEdit,
  onView,
  onCancel,
  onViewObservations,
  onUploadComprobante,
  onViewComprobantes,
}: BusinessRowActionsProps) {
  const canUpload =
    UPLOAD_ALLOWED_STATUSES.includes(businessStatus) && contract !== null
  const [uploadOpen, setUploadOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

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
        {/* Upload comprobante — visible only when status allows and contract exists */}
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
    </TooltipProvider>
  )
}
