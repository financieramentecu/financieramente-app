import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCategoryTypes } from '../../hooks/use-category-types'
import { categoryTypeApi } from '../../lib/category-type-api'
import { CategoryTypeListResponse } from '../../types/category-type.types'
import { ApiResponse } from '@/features/shared/types/api-response.types'

// Mock the API
vi.mock('../../lib/category-type-api', () => ({
    categoryTypeApi: {
        getCategoryTypes: vi.fn(),
        getCategoryType: vi.fn(),
        createCategoryType: vi.fn(),
        updateCategoryType: vi.fn(),
        toggleStatus: vi.fn(),
    },
}))

describe('Category Type Hooks', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should fetch category types', async () => {
        const mockData: CategoryTypeListResponse = {
            categoryTypes: [],
            pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 }
        }
        const mockResponse: ApiResponse<CategoryTypeListResponse> = {
            data: mockData
        }
        vi.mocked(categoryTypeApi.getCategoryTypes).mockResolvedValue(mockResponse)

        const { result } = renderHook(() => useCategoryTypes())

        expect(result.current.status).toBe('loading')

        await waitFor(() => {
            expect(result.current.status).toBe('success')
        })

        expect(result.current.data).toEqual(mockData)
    })
})
