import { UserRole } from '@/features/auth/lib/roles'

/** Domain entity mirroring the Prisma `Comment` model */
export interface Comment {
  id: string
  businessId: number
  authorId: number
  title: string
  detail: string
  status: boolean
  createdAt: Date
  updatedAt: Date
}

/** Author summary embedded in a CommentDTO, role resolved from the current User.role */
export interface CommentAuthorDTO {
  id: number
  name: string
  role: UserRole
}

/** Client-facing shape returned by the comments API and consumed by the UI */
export interface CommentDTO {
  id: string
  businessId: number
  title: string
  detail: string
  author: CommentAuthorDTO
  createdAt: string
}

export type CommentErrorCode = 'NOT_FOUND' | 'INVALID_ROLE' | 'INTERNAL'

export class CommentError extends Error {
  constructor(
    public readonly code: CommentErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'CommentError'
  }
}

export interface RequestContext {
  userId: number
  email: string
  ipAddress?: string
  userAgent?: string
}

export interface CreateCommentInput {
  title: string
  detail: string
}
