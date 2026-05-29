import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardFilter } from '../../components/DashboardFilterContext'

describe('useDashboardFilter', () => {
  it('throws a descriptive error when called outside DashboardFilterProvider', () => {
    expect(() => {
      renderHook(() => useDashboardFilter())
    }).toThrow(
      'useDashboardFilter must be used within DashboardFilterProvider'
    )
  })
})
