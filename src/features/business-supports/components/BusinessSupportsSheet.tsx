'use client'

import { useState } from 'react'
import { Trash2, ImageIcon, ZoomIn } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/features/shared/ui/sheet'
import { Button } from '@/features/shared/ui/button'
import { Badge } from '@/features/shared/ui/badge'
import { useBusinessSupports } from '../hooks/useBusinessSupports'
import { useDeleteComprobante } from '../hooks/useDeleteComprobante'
import type { BusinessSupportDTO } from '../types/business-support.types'
import { UserRole } from '@/features/auth/lib/roles'

const DELETE_ALLOWED_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.ASISTENTE_GERENCIA_OPERATIVA,
  UserRole.ANALISTA_SOPORTE,
]

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
  onDelete: (id: string) => Promise<void>
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

function SupportGallery({ items, canDelete, onDelete }: SupportGalleryProps) {
  const [selected, setSelected] = useState<BusinessSupportDTO>(items[0])
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await onDelete(id)
    setDeleting(null)
    if (selected?.id === id) {
      const next = items.find((i) => i.id !== id)
      if (next) setSelected(next)
    }
  }

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
                  <img
                    src={c.viewUrl ?? '#'}
                    alt={`Comprobante ${c.id}`}
                    className="w-full h-full object-cover"
                  />
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

              {/* Delete button — visible on hover, restricted to allowed roles */}
              {canDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); void handleDelete(c.id) }}
                  disabled={deleting === c.id}
                  aria-label={`Delete support ${c.id}`}
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
            {/* Preview toolbar */}
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

            {/* Image preview */}
            <div className="flex flex-1 items-center justify-center bg-muted/20 p-6 overflow-auto">
              <img
                src={selected.viewUrl ?? '#'}
                alt={`Support preview ${selected.id}`}
                className="max-h-full max-w-full object-contain rounded-md shadow-md"
              />
            </div>
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
  const canDelete = userRole !== undefined && DELETE_ALLOWED_ROLES.includes(userRole)

  const handleDelete = async (id: string) => {
    await remove(id)
    onSupportDeleted?.()
    void refetch()
  }

  return (
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
            : <SupportGallery items={state.data} canDelete={canDelete} onDelete={handleDelete} />
        )}
      </SheetContent>
    </Sheet>
  )
}
