import { describe, it, expect } from 'vitest'
import {
  ALLOWED_MIME_TYPES,
  MAX_BYTES,
  isAllowedMime,
  extensionFor,
  validateUpload,
} from '../lib/mime-utils'

describe('ALLOWED_MIME_TYPES', () => {
  it('should include exactly the three allowed types', () => {
    expect(ALLOWED_MIME_TYPES).toContain('image/jpeg')
    expect(ALLOWED_MIME_TYPES).toContain('image/png')
    expect(ALLOWED_MIME_TYPES).toContain('image/webp')
    expect(ALLOWED_MIME_TYPES).not.toContain('image/gif')
    expect(ALLOWED_MIME_TYPES).toHaveLength(3)
  })
})

describe('isAllowedMime', () => {
  it('returns true for image/jpeg', () => {
    expect(isAllowedMime('image/jpeg')).toBe(true)
  })

  it('returns true for image/png', () => {
    expect(isAllowedMime('image/png')).toBe(true)
  })

  it('returns true for image/webp', () => {
    expect(isAllowedMime('image/webp')).toBe(true)
  })

  it('returns false for image/gif', () => {
    expect(isAllowedMime('image/gif')).toBe(false)
  })

  it('returns false for application/pdf', () => {
    expect(isAllowedMime('application/pdf')).toBe(false)
  })

  it('returns false for video/mp4', () => {
    expect(isAllowedMime('video/mp4')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAllowedMime('')).toBe(false)
  })
})

describe('extensionFor', () => {
  it('returns jpg for image/jpeg', () => {
    expect(extensionFor('image/jpeg')).toBe('jpg')
  })

  it('returns png for image/png', () => {
    expect(extensionFor('image/png')).toBe('png')
  })

  it('returns webp for image/webp', () => {
    expect(extensionFor('image/webp')).toBe('webp')
  })

  it('returns null for image/gif', () => {
    expect(extensionFor('image/gif')).toBeNull()
  })

  it('returns null for unsupported mime', () => {
    expect(extensionFor('application/pdf')).toBeNull()
  })
})

describe('validateUpload', () => {
  it('returns ok for a valid jpeg under size limit', () => {
    const result = validateUpload('image/jpeg', 1024 * 1024) // 1 MB
    expect(result.ok).toBe(true)
  })

  it('returns error when size exceeds 10 MB', () => {
    const result = validateUpload('image/jpeg', MAX_BYTES + 1)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FILE_TOO_LARGE')
    }
  })

  it('returns error for invalid mime type', () => {
    const result = validateUpload('application/pdf', 1024)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INVALID_MIME')
    }
  })

  it('returns error for invalid mime even under size limit', () => {
    const result = validateUpload('text/html', 100)
    expect(result.ok).toBe(false)
  })

  it('returns error when size is exactly at limit + 1', () => {
    const result = validateUpload('image/png', MAX_BYTES + 1)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FILE_TOO_LARGE')
    }
  })

  it('returns ok when size is exactly at limit', () => {
    const result = validateUpload('image/webp', MAX_BYTES)
    expect(result.ok).toBe(true)
  })
})
