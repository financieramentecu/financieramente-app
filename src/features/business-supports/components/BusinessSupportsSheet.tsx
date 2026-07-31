'use client'

import { useState } from 'react'
import { Trash2, ImageIcon, ZoomIn, FileText } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/features/shared/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/features/shared/ui/alert-dialog'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { useBusinessSupports } from '../hooks/useBusinessSupports'
import { useDeleteComprobante } from '../hooks/useDeleteComprobante'
import type { BusinessSupportDTO } from '../types/business-support.types'
import { UserRole, canDeleteBusinessComprobante } from '@/features/auth/lib/roles'
import { isImageMime } from '../lib/mime-utils'

interface ViewComprobantesSheetProps {
  businessId: number
  userRole?: UserRole
  open: boolean
  onClose: () => void
  onSupportDeleted?: () => void
}

interface SupportGalleryProps {
  items: BusinessSupportDTO[]
  canDelete: boolean
  pendingDeleteId: string | null
  onRequestDelete: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Sin comprobantes</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          No hay comprobantes registrados para este negocio.
        </p>
      </div>
    </div>
  )
}

function SupportGallery({
  items,
  canDelete,
  pendingDeleteId,
  onRequestDelete,
}: SupportGalleryProps) {
  const [selected, setSelected] = useState<BusinessSupportDTO>(items[0])

  return (
    <div className="flex flex-1 gap-0 min-h-0 overflow-hidden rounded-lg border border-border">
      {/* Left: thumbnail list */}
      <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-muted/30 overflow-y-auto">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {items.length} {items.length === 1 ? 'comprobante' : 'comprobantes'}
          </p>
        </div>
        <ul className="flex flex-col gap-0">
          {items.map((c) => (
            <li
              key={c.id}
              className={`group relative cursor-pointer transition-colors ${
                selected?.id === c.id
                  ? 'bg-primary/10 border-l-2 border-l-primary'
                  : 'border-l-2 border-l-transparent hover:bg-muted/60'
              }`}
              onClick={() => setSelected(c)}
            >
              <div className="p-2.5 flex gap-2.5 items-start">
                <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-muted border border-border">
                  {isImageMime(c.mimeType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.viewUrl ?? '#'}
                      alt={`Comprobante ${c.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {formatDate(c.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(c.sizeBytes)}
                  </p>
                  <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1">
                    {c.mimeType.split('/')[1].toUpperCase()}
                  </Badge>
                </div>
              </div>

              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRequestDelete(c.id)
                  }}
                  disabled={pendingDeleteId === c.id}
                  aria-label={`Eliminar comprobante ${c.id}`}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex h-6 w-6 items-center justify-center rounded-md bg-background border border-border hover:border-destructive hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>

      {/* Right: preview */}
      <main className="flex flex-1 flex-col min-w-0">
        {selected ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background shrink-0">
              <div>
                <p className="text-sm font-medium text-foreground">{formatDate(selected.createdAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(selected.sizeBytes)} · {selected.mimeType} · {selected.uploadedBy.name}
                </p>
              </div>
              <a
                href={selected.viewUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ZoomIn className="h-3.5 w-3.5" />
                  Ver original
                </Button>
              </a>
            </div>

            {isImageMime(selected.mimeType) ? (
              <div className="flex flex-1 items-center justify-center bg-muted/20 p-6 overflow-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.viewUrl ?? '#'}
                  alt={`Support preview ${selected.id}`}
                  className="max-h-full max-w-full object-contain rounded-md shadow-md"
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <iframe
                  src={selected.viewUrl ?? '#'}
                  title="PDF viewer"
                  className="w-full h-full border-0"
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">Seleccioná un comprobante para previsualizarlo</p>
          </div>
        )}
      </main>
    </div>
  )
}

export function ViewComprobantesSheet({
  businessId,
  userRole,
  open,
  onClose,
  onSupportDeleted,
}: ViewComprobantesSheetProps) {
  const { state, refetch } = useBusinessSupports(businessId)
  const { remove } = useDeleteComprobante(businessId)
  const canDelete = canDeleteBusinessComprobante(userRole)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return
    setIsConfirming(true)
    try {
      await remove(pendingDeleteId)
      setPendingDeleteId(null)
      onSupportDeleted?.()
      void refetch()
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo eliminar el comprobante. Intente nuevamente.'
      toast.error('No se pudo completar la acción', {
        description: message,
      })
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <SheetContent className="w-full sm:max-w-[900px] flex flex-col gap-4 overflow-hidden p-6">
          <SheetHeader className="shrink-0">
            <SheetTitle>Comprobantes del negocio</SheetTitle>
          </SheetHeader>

          {state.status === 'loading' && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground animate-pulse">Cargando comprobantes…</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}

          {state.status === 'success' && (
            state.data.length === 0
              ? <EmptyState />
              : (
                <SupportGallery
                  items={state.data}
                  canDelete={canDelete}
                  pendingDeleteId={pendingDeleteId}
                  onRequestDelete={setPendingDeleteId}
                />
              )
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isConfirming) setPendingDeleteId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este comprobante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El comprobante se eliminará de la lista de evidencias del negocio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isConfirming}
              onClick={(e) => {
                e.preventDefault()
                void handleConfirmDelete()
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isConfirming ? 'Eliminando…' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
