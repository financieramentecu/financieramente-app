'use client'

import { useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { FileUp } from 'lucide-react'
import { UploadComprobanteModal } from './UploadComprobanteModal'

interface UploadSupportButtonProps {
  businessId: number
  onSuccess?: () => void
}

export function UploadSupportButton({ businessId, onSuccess }: UploadSupportButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <FileUp className="h-3.5 w-3.5" />
        Subir Soporte
      </Button>

      <UploadComprobanteModal
        businessId={businessId}
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  )
}
