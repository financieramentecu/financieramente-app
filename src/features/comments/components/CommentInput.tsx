'use client'

import { useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { Input } from '@/features/shared/ui/input'
import { Textarea } from '@/features/shared/ui/textarea'
import { Label } from '@/features/shared/ui/label'
import { createCommentSchema } from '../schemas/comment.schema'
import type { CreateCommentInput } from '../types/comment.types'

const TITLE_MAX = 40
const DETAIL_MAX = 200

interface CommentInputProps {
  authorName: string
  authorEmail: string
  contract: string
  onSubmit: (input: CreateCommentInput) => Promise<void>
  onCancel: () => void
}

function nowLabel(): string {
  return new Date().toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CommentInput({ authorName, authorEmail, contract, onSubmit, onCancel }: CommentInputProps) {
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [errors, setErrors] = useState<{ title?: string; detail?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    const result = createCommentSchema.safeParse({ title, detail })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setErrors({
        title: fieldErrors.title?.[0],
        detail: fieldErrors.detail?.[0],
      })
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      await onSubmit(result.data)
      setTitle('')
      setDetail('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setTitle('')
    setDetail('')
    setErrors({})
    onCancel()
  }

  return (
    <div className="border-t border-border pt-3 space-y-3">
      {/* Locked fields */}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span>{authorName}</span>
        <span className="text-right">{authorEmail}</span>
        <span>{contract}</span>
        <span className="text-right">{nowLabel()}</span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="comment-title">Nombre del comentario</Label>
          <span className="text-[11px] text-muted-foreground">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <Input
          id="comment-title"
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
          placeholder="Ej. Seguimiento de pago"
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="comment-detail">Detalle</Label>
          <span className="text-[11px] text-muted-foreground">
            {detail.length}/{DETAIL_MAX}
          </span>
        </div>
        <Textarea
          id="comment-detail"
          value={detail}
          maxLength={DETAIL_MAX}
          onChange={(e) => setDetail(e.target.value.slice(0, DETAIL_MAX))}
          placeholder="Escribí el detalle del comentario"
          rows={3}
        />
        {errors.detail && <p className="text-xs text-destructive">{errors.detail}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
          Guardar
        </Button>
      </div>
    </div>
  )
}
