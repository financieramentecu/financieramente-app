'use client'

import { useRef, useEffect } from 'react'
import { FileUp } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import { useUploadComprobante } from '../hooks/useUploadComprobante'
import { ALLOWED_MIME_TYPES } from '../lib/mime-utils'

interface UploadComprobanteModalProps {
  businessId: number
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const ACCEPT = ALLOWED_MIME_TYPES.join(',')

export function UploadComprobanteModal({
  businessId,
  open,
  onClose,
  onSuccess,
}: UploadComprobanteModalProps) {
  const { state, upload, reset } = useUploadComprobante(businessId)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state.status === 'success') {
      toast.success('Comprobante subido exitosamente')
      onSuccess?.()
      reset()
      onClose()
    }
  }, [state.status, onSuccess, reset, onClose])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await upload(file)
  }

  const isLoading = state.status === 'loading'
  const selectedFile = (inputRef.current?.files?.[0]?.name) ?? null

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir comprobante</DialogTitle>
          <DialogDescription>
            Seleccioná una imagen (JPEG, PNG, WebP) o un PDF. Máximo 10 MB.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <input
            data-testid="file-input"
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            disabled={isLoading}
            onChange={handleFileChange}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            className="w-full gap-2"
          >
            <FileUp className="h-4 w-4" />
            {selectedFile ?? 'Seleccionar archivo'}
          </Button>

          {isLoading && (
            <p className="text-sm text-muted-foreground animate-pulse">Subiendo archivo…</p>
          )}

          {state.status === 'error' && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
