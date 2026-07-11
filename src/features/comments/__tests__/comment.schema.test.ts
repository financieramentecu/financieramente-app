import { describe, it, expect } from 'vitest'
import { createCommentSchema } from '../schemas/comment.schema'

describe('createCommentSchema', () => {
  it('accepts a valid title (40 chars) and detail (200 chars)', () => {
    const result = createCommentSchema.safeParse({
      title: 'a'.repeat(40),
      detail: 'b'.repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it('rejects a title longer than 40 chars', () => {
    const result = createCommentSchema.safeParse({
      title: 'a'.repeat(41),
      detail: 'valid detail',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a detail longer than 200 chars', () => {
    const result = createCommentSchema.safeParse({
      title: 'valid title',
      detail: 'b'.repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty title', () => {
    const result = createCommentSchema.safeParse({ title: '', detail: 'valid detail' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty detail', () => {
    const result = createCommentSchema.safeParse({ title: 'valid title', detail: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = createCommentSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
