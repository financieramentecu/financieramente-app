'use client'

import type { RefObject } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import { useComments } from '../hooks/use-comments'
import { CommentThread } from './CommentThread'

interface CommentsHistoryModalProps {
  businessId: number
  /** Business contract number; null or empty means the business has no contract */
  contract: string | null
  open: boolean
  onClose: () => void
  /** Element that receives focus when the dialog closes (the row indicator) */
  returnFocusRef?: RefObject<HTMLElement | null>
}

/**
 * Read-only history of a business's comments, opened from the business list row.
 * Mount it only while open: mounting starts the fetch and the live SSE subscription
 * of `useComments`, and unmounting releases them. It never creates or edits comments.
 */
export function CommentsHistoryModal({
  businessId,
  contract,
  open,
  onClose,
  returnFocusRef,
}: CommentsHistoryModalProps) {
  const { state, refetch } = useComments(businessId)
  const title = contract ? `Comentarios — ${contract}` : 'Comentarios'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        className="sm:max-w-lg flex max-h-[85vh] flex-col overflow-hidden"
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          // The dialog is mounted conditionally, so Radix has no DialogTrigger to return focus to
          if (returnFocusRef?.current) {
            event.preventDefault()
            returnFocusRef.current.focus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div data-testid="comments-history-body" className="min-h-0 flex-1 overflow-y-auto">
          {(state.status === 'idle' || state.status === 'loading') && (
            <p className="py-10 text-center text-sm text-muted-foreground animate-pulse">
              Cargando comentarios…
            </p>
          )}

          {state.status === 'error' && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive">{state.error}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          )}

          {state.status === 'success' && <CommentThread comments={state.data} />}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
