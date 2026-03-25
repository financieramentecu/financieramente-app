import { describe, it, expect } from 'vitest'
import {
    createCategoryTypeSchema,
    updateCategoryTypeSchema,
} from '@/features/category-types/lib/category-type-schemas'

describe('Category Type Schemas', () => {
    describe('createCategoryTypeSchema', () => {
        it('should validate valid input', () => {
            const validInputs = [
                { name: 'MMS', description: 'Sistema de Múltiples Niveles', status: true },
                { name: 'ALIADO', status: true },
            ]

            validInputs.forEach((input) => {
                const result = createCategoryTypeSchema.safeParse(input)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid input', () => {
            const invalidInputs = [
                { name: 'A' }, // too short (min 2)
                { name: '' }, // empty
                { name: 'A'.repeat(101) }, // too long (max 100)
                { name: 'MMS', description: 'A'.repeat(501) }, // desc too long
                {}, // missing name
            ]

            invalidInputs.forEach((input) => {
                const result = createCategoryTypeSchema.safeParse(input)
                expect(result.success).toBe(false)
            })
        })
    })

    describe('updateCategoryTypeSchema', () => {
        it('should validate valid partial input', () => {
            const validInputs = [
                { name: 'MMS Updated' },
                { description: 'Nueva descripción' },
                { status: false },
                { name: 'ALIADO', status: true },
                {}, // all fields are optional
            ]

            validInputs.forEach((input) => {
                const result = updateCategoryTypeSchema.safeParse(input)
                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid partial input', () => {
            const invalidInputs = [
                { name: 'A' }, // too short
                { description: 'A'.repeat(501) }, // too long
            ]

            invalidInputs.forEach((input) => {
                const result = updateCategoryTypeSchema.safeParse(input)
                expect(result.success).toBe(false)
            })
        })
    })
})
