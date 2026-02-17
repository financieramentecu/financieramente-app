/**
 * Shared Prisma-related utility types to avoid manual definitions in mappers.
 */

export type DecimalLike = {
    toNumber(): number
} | number | string
