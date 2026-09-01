'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/features/shared/ui/sheet'
import { Button } from '@/features/shared/ui/button'
import { useComments } from '../hooks/use-comments'
import { CommentThread } from './CommentThread'
import { CommentInput } from './CommentInput'

interface CommentsSidebarProps {
  businessId: number
  authorName: string
  authorEmail: string
  contract: string
  /** Auto-open the sidebar on mount, e.g. from `?openComments=true` */
  defaultOpen?: boolean
  /** Comment id to scroll into view once the thread loads, e.g. from a notification deep link */
  focusedCommentId?: string
  /** Called once, after auto-opening from a notification deep link, to mark it as read */
  onAutoOpen?: () => void
  /** Company-wide read-only role (CONSULTOR): hides the add-comment form, keeps the thread visible */
  readOnly?: boolean
}

export function CommentsSidebar({
  businessId,
  authorName,
  authorEmail,
  contract,
  defaultOpen = false,
  focusedCommentId,
  onAutoOpen,
  readOnly = false,
}: CommentsSidebarProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { state, createComment } = useComments(businessId)
  const hasAutoOpened = useRef(false)

  useEffect(() => {
    if (defaultOpen && !hasAutoOpened.current) {
      hasAutoOpened.current = true
      setOpen(true)
      onAutoOpen?.()
    }
  }, [defaultOpen, onAutoOpen])

  useEffect(() => {
    if (!open || !focusedCommentId || state.status !== 'success') return
    const el = document.getElementById(`comment-${focusedCommentId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [open, focusedCommentId, state.status])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 hover:text-violet-800"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Comentarios
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md flex flex-col gap-4 overflow-hidden p-4">
          <SheetHeader className="shrink-0 p-0">
            <SheetTitle>Comentarios del negocio</SheetTitle>
          </SheetHeader>

          {state.status === 'loading' && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground animate-pulse">Cargando comentarios…</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-destructive">{state.error}</p>
            </div>
          )}

          {state.status === 'success' && (
            <CommentThread comments={state.data} focusedCommentId={focusedCommentId} />
          )}

          {!readOnly && (
            <CommentInput
              authorName={authorName}
              authorEmail={authorEmail}
              contract={contract}
              onSubmit={async (input) => {
                await createComment(input)
              }}
              onCancel={() => {}}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
