import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteCategoryType } from '../../services/category-type.service'

const { findUnique, update } = vi.hoisted(() => ({
    findUnique: vi.fn(),
    update: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        categoryType: {
            findUnique,
            update,
        },
    },
}))

describe('deleteCategoryType (Logical Elimination)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should update status to false instead of deleting', async () => {
        const mockType = {
            id: 1,
            name: 'Test Type',
            status: true,
        }

        findUnique.mockResolvedValueOnce(mockType)
        update.mockResolvedValueOnce({ ...mockType, status: false })

        const result = await deleteCategoryType(1)

        expect(findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
        })
        expect(update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { status: false },
        })
        expect(result.status).toBe(false)
    })

    it('should throw error if category type not found', async () => {
        findUnique.mockResolvedValueOnce(null)

        await expect(deleteCategoryType(999)).rejects.toThrow('Tipo de categoría no encontrado')
        expect(update).not.toHaveBeenCalled()
    })
})
