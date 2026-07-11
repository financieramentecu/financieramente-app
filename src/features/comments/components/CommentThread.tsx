import { ScrollArea } from '@/features/shared/ui/scroll-area'
import type { CommentDTO } from '../types/comment.types'
import { CommentItem } from './CommentItem'

interface CommentThreadProps {
  comments: CommentDTO[]
  /** Comment id to highlight and scroll into view, e.g. from a notification deep link */
  focusedCommentId?: string
}

function EmptyThread() {
  return (
    <div className="flex flex-1 items-center justify-center py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Todavía no hay comentarios en este contrato.
      </p>
    </div>
  )
}

/** Renders the comment thread ordered oldest -> newest, role-aligned per CommentItem */
export function CommentThread({ comments, focusedCommentId }: CommentThreadProps) {
  if (comments.length === 0) return <EmptyThread />

  return (
    <ScrollArea className="flex-1 pr-2">
      <div className="flex flex-col gap-3 py-2">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            highlighted={comment.id === focusedCommentId}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
