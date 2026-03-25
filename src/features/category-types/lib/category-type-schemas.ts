import { z } from 'zod'

/**
 * Base schema for category type
 */
export const baseCategoryTypeSchema = z.object({
    name: z
        .string()
        .min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
        .max(100, { message: 'El nombre no puede exceder los 100 caracteres' }),
    description: z
        .string()
        .max(500, { message: 'La descripción no puede exceder los 500 caracteres' })
        .nullable()
        .optional(),
    status: z.boolean(),
})

/**
 * Schema for creating a category type
 */
export const createCategoryTypeSchema = baseCategoryTypeSchema

/**
 * Schema for updating a category type (all fields optional)
 */
export const updateCategoryTypeSchema = baseCategoryTypeSchema.partial()

/**
 * Types inferred from schemas for form handling
 */
export type CreateCategoryTypeFormData = z.infer<
    typeof createCategoryTypeSchema
>
export type UpdateCategoryTypeFormData = z.infer<
    typeof updateCategoryTypeSchema
>
