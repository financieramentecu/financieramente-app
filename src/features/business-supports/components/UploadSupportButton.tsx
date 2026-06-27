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
      <Button onClick={() => setOpen(true)} className="gap-2">
        <FileUp className="h-4 w-4" />
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
