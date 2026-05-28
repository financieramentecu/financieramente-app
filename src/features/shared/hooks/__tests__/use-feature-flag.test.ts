import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @flagsmith/flagsmith/react before importing the hook
vi.mock('@flagsmith/flagsmith/react', () => ({
	useFlags: vi.fn(),
}))

describe('useFeatureFlag', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns { enabled: false, value: null } when SDK has no flags for the given key', async () => {
		const { useFlags } = await import('@flagsmith/flagsmith/react')
		vi.mocked(useFlags).mockReturnValue({})

		const { useFeatureFlag } = await import('../use-feature-flag')
		const { result } = renderHook(() => useFeatureFlag('negocios_advanced_filters'))

		expect(result.current.enabled).toBe(false)
		expect(result.current.value).toBeNull()
	})

	it('returns enabled: true when SDK returns the flag as enabled', async () => {
		const { useFlags } = await import('@flagsmith/flagsmith/react')
		vi.mocked(useFlags).mockReturnValue({
			negocios_advanced_filters: { enabled: true, value: null },
		})

		const { useFeatureFlag } = await import('../use-feature-flag')
		const { result } = renderHook(() => useFeatureFlag('negocios_advanced_filters'))

		expect(result.current.enabled).toBe(true)
		expect(result.current.value).toBeNull()
	})

	it('returns the correct value when SDK returns a non-null flag value', async () => {
		const { useFlags } = await import('@flagsmith/flagsmith/react')
		vi.mocked(useFlags).mockReturnValue({
			negocios_advanced_filters: { enabled: true, value: 'feature-variant-a' },
		})

		const { useFeatureFlag } = await import('../use-feature-flag')
		const { result } = renderHook(() => useFeatureFlag('negocios_advanced_filters'))

		expect(result.current.enabled).toBe(true)
		expect(result.current.value).toBe('feature-variant-a')
	})

	it('calls useFlags with an array containing the flag name', async () => {
		const { useFlags } = await import('@flagsmith/flagsmith/react')
		vi.mocked(useFlags).mockReturnValue({
			negocios_advanced_filters: { enabled: false, value: null },
		})

		const { useFeatureFlag } = await import('../use-feature-flag')
		renderHook(() => useFeatureFlag('negocios_advanced_filters'))

		expect(useFlags).toHaveBeenCalledWith(['negocios_advanced_filters'])
	})
})
