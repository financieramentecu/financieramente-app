import { UserRole } from '@/features/auth/lib/roles'
import { ROLE_NAMES } from '@/features/auth/lib/roles'
import type { CommentDTO } from '../types/comment.types'
import { LinkifiedText } from './LinkifiedText'

interface CommentItemProps {
  comment: CommentDTO
  /** Marks the just-created/just-notified comment so the sidebar can scroll to it */
  highlighted?: boolean
}

function formatCommentDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Money Strategist (AGENTE) comments align left, Analyst (ANALISTA_SOPORTE) comments align right */
export function CommentItem({ comment, highlighted }: CommentItemProps) {
  const isAgente = comment.author.role === UserRole.AGENTE

  return (
    <div
      id={`comment-${comment.id}`}
      data-testid={`comment-item-${comment.id}`}
      className={`flex ${isAgente ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[85%] rounded-lg border p-3 text-sm ${
          isAgente ? 'bg-muted/40 border-border' : 'bg-primary/10 border-primary/20'
        } ${highlighted ? 'ring-2 ring-primary' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{comment.author.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {ROLE_NAMES[comment.author.role]}
          </span>
        </div>
        <p className="font-medium text-sm text-foreground">
          <LinkifiedText text={comment.title} />
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
          <LinkifiedText text={comment.detail} />
        </p>
        <p className="text-[11px] text-muted-foreground mt-1.5">{formatCommentDate(comment.createdAt)}</p>
      </div>
    </div>
  )
}
