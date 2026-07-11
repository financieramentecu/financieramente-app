import { z } from 'zod'

/**
 * Validation boundaries for comment creation.
 * `title` mirrors the "Comment name" field (max 40), `detail` mirrors
 * the "Detail" field (max 200) — both required, matching the DB
 * `VarChar(40)` / `VarChar(200)` columns.
 */
export const createCommentSchema = z.object({
  title: z
    .string()
    .min(1, 'El nombre del comentario es obligatorio')
    .max(40, 'El nombre del comentario no puede superar 40 caracteres'),
  detail: z
    .string()
    .min(1, 'El detalle es obligatorio')
    .max(200, 'El detalle no puede superar 200 caracteres'),
})

export type CreateCommentSchema = z.infer<typeof createCommentSchema>
