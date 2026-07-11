import { UserRole } from '@/features/auth/lib/roles'
import type { CommentDTO } from '../types/comment.types'

/** Shape produced by the Prisma query used in the comments service (`include: { author: { include: { role: true } } }`) */
export interface CommentWithAuthor {
  id: string
  businessId: number
  title: string
  detail: string
  createdAt: Date
  author: {
    idUser: number
    name: string
    role: { code: string } | null
  }
}

/** Maps a Prisma Comment row (with author + author.role included) to a CommentDTO */
export function toCommentDTO(row: CommentWithAuthor): CommentDTO {
  const roleCode = row.author.role?.code
  const role = roleCode && Object.values(UserRole).includes(roleCode as UserRole)
    ? (roleCode as UserRole)
    : UserRole.DEFAULT

  return {
    id: row.id,
    businessId: row.businessId,
    title: row.title,
    detail: row.detail,
    author: {
      id: row.author.idUser,
      name: row.author.name,
      role,
    },
    createdAt: row.createdAt.toISOString(),
  }
}
