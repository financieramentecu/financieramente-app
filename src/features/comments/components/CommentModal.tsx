'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/shared/ui/dialog'
import { useAuthSession } from '@/features/shared/hooks/use-auth-session'
import { commentsApi } from '../lib/comments-api'
import { CommentInput } from './CommentInput'

interface CommentModalProps {
  businessId: number
  /** Contract number shown as a locked field, same label used in the sidebar */
  contract: string
  open: boolean
  onClose: () => void
  /** Called after a comment is successfully created, before the modal closes */
  onCreated?: () => void
}

/**
 * Create-comment modal launched from the business row actions menu (Scenario 1).
 * Reuses `CommentInput` for locked fields, char-limit validation, and submit/cancel
 * behavior — same rules as the contract detail sidebar.
 */
export function CommentModal({ businessId, contract, open, onClose, onCreated }: CommentModalProps) {
  const { user } = useAuthSession()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar comentario</DialogTitle>
        </DialogHeader>
        <CommentInput
          authorName={user?.name ?? ''}
          authorEmail={user?.email ?? ''}
          contract={contract}
          onSubmit={async (input) => {
            await commentsApi.create(businessId, input)
            onCreated?.()
            onClose()
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
