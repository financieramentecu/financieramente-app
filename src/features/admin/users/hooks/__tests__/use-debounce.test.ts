import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce } from '../use-debounce'

describe('useDebounce', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('initial', 500))
        expect(result.current).toBe('initial')
    })

    it('should debounce value changes', async () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            {
                initialProps: { value: 'initial', delay: 500 },
            }
        )

        expect(result.current).toBe('initial')

        // Update value
        rerender({ value: 'updated', delay: 500 })

        // Value should not change immediately
        expect(result.current).toBe('initial')

        // Fast-forward time
        act(() => {
            jest.advanceTimersByTime(500)
        })

        // Value should now be updated
        await waitFor(() => {
            expect(result.current).toBe('updated')
        })
    })

    it('should cancel previous timeout on rapid changes', async () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            {
                initialProps: { value: 'initial' },
            }
        )

        // Rapid changes
        rerender({ value: 'change1' })
        act(() => {
            jest.advanceTimersByTime(200)
        })

        rerender({ value: 'change2' })
        act(() => {
            jest.advanceTimersByTime(200)
        })

        rerender({ value: 'final' })

        // Fast-forward to complete debounce
        act(() => {
            jest.advanceTimersByTime(500)
        })

        // Should only have the final value
        await waitFor(() => {
            expect(result.current).toBe('final')
        })
    })

    it('should use custom delay', async () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            {
                initialProps: { value: 'initial', delay: 1000 },
            }
        )

        rerender({ value: 'updated', delay: 1000 })

        // Should not update after 500ms
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current).toBe('initial')

        // Should update after 1000ms
        act(() => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            expect(result.current).toBe('updated')
        })
    })

    it('should handle different types', async () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 500),
            {
                initialProps: { value: 123 },
            }
        )

        expect(result.current).toBe(123)

        rerender({ value: 456 })

        act(() => {
            jest.advanceTimersByTime(500)
        })

        await waitFor(() => {
            expect(result.current).toBe(456)
        })
    })
})
