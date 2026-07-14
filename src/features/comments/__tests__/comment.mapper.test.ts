import { describe, it, expect } from 'vitest'
import { UserRole } from '@/features/auth/lib/roles'
import { toCommentDTO, type CommentWithAuthor } from '../mappers/comment.mapper'

function buildRow(overrides: Partial<CommentWithAuthor> = {}): CommentWithAuthor {
  return {
    id: 'comment-1',
    businessId: 10,
    title: 'Seguimiento',
    detail: 'Falta el comprobante de pago',
    createdAt: new Date('2026-07-01T12:00:00Z'),
    author: {
      idUser: 1,
      name: 'Ana Agente',
      role: { code: 'AGENTE' },
    },
    ...overrides,
  }
}

describe('toCommentDTO', () => {
  it('aligns AGENTE role from the author relation', () => {
    const dto = toCommentDTO(buildRow())
    expect(dto.author.role).toBe(UserRole.AGENTE)
    expect(dto.author.name).toBe('Ana Agente')
    expect(dto.createdAt).toBe('2026-07-01T12:00:00.000Z')
  })

  it('aligns ANALISTA_SOPORTE role from the author relation', () => {
    const dto = toCommentDTO(
      buildRow({ author: { idUser: 2, name: 'Beto Analista', role: { code: 'ANALISTA_SOPORTE' } } }),
    )
    expect(dto.author.role).toBe(UserRole.ANALISTA_SOPORTE)
  })

  it('falls back to DEFAULT when author has no role', () => {
    const dto = toCommentDTO(buildRow({ author: { idUser: 3, name: 'Sin Rol', role: null } }))
    expect(dto.author.role).toBe(UserRole.DEFAULT)
  })

  it('falls back to DEFAULT for an unknown role code', () => {
    const dto = toCommentDTO(
      buildRow({ author: { idUser: 4, name: 'Rol Raro', role: { code: 'UNKNOWN_ROLE' } } }),
    )
    expect(dto.author.role).toBe(UserRole.DEFAULT)
  })
})
