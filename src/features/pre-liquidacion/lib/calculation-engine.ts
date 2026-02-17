import { Decimal } from '@prisma/client/runtime/library'
import type { CommissionHierarchy } from './hierarchy-resolver'
import { roundCurrency } from '@/features/shared/lib/math-utils'

// Interfaces
export interface DistributionCategory {
    id: number
    name: string
    percentage: Decimal
}

export interface CalculatedDistribution {
    categoryId: number
    categoryName: string
    baseAmount: Decimal // Bruta
    discountAmount: Decimal // Descuento (e.g. 12%)
    clawbackAmount: Decimal // Retencion (e.g. 10% for Polizas)
    finalAmount: Decimal // Net after all deductions
    percentageApplied: Decimal
    discountPercentageApplied: Decimal
    clawbackPercentageApplied: Decimal
}

export interface CalculationContext {
    settlementValue: Decimal // The commission value from Excel
    hierarchy: CommissionHierarchy
    categories: DistributionCategory[] // From Product Config
    officeDiscount: Decimal // Global Discount (e.g. 0.12)
    clawbackPercentage: Decimal // Global Clawback (e.g. 0.10)
    isPoliza: boolean
    origin?: string // For Polizas
}

/**
 * Calculates the distribution of commissions based on categories, hierarchy, and type.
 */
export function calculateDistributions(ctx: CalculationContext): CalculatedDistribution[] {
    const results: CalculatedDistribution[] = []

    // Iterate Categories (Agencia, Lider, Coach, General)
    for (const cat of ctx.categories) {
        // T021: Hierarchy Check
        const catName = cat.name.toUpperCase()
        let roleExists = true

        if (catName.includes('LIDER') || catName.includes('LÍDER')) {
            if (!ctx.hierarchy.leader) roleExists = false
        } else if (catName.includes('AGENCIA')) {
            if (!ctx.hierarchy.agency) roleExists = false
        } else if (catName.includes('COACH')) {
            if (!ctx.hierarchy.coach) roleExists = false
        }

        if (!roleExists) continue

        // Resolve Percentage
        const pct = cat.percentage

        // 1. Bruta = Value * %Category
        const bruta = roundCurrency(ctx.settlementValue.mul(pct))

        let discountAmount = new Decimal(0)
        let clawbackAmount = new Decimal(0)
        let discountPctApplied = new Decimal(0)
        let clawbackPctApplied = new Decimal(0)

        // 2. Logic Selection
        if (!ctx.isPoliza) {
            // Voluntaria: Apply Office Discount (e.g. 12%)
            discountPctApplied = ctx.officeDiscount
            discountAmount = roundCurrency(bruta.mul(discountPctApplied))

            // Clawback is 0 for Voluntarias
        } else {
            // Poliza: 
            // Spec SC-002: "verify ... 10% clawback subtraction after the 12% tax discount".
            // This implies: 
            // A) Bruta - (Bruta * 12%) = Intermediate
            // B) Final = Intermediate - (Intermediate * 10%) ?? Or (Bruta * 10%)?
            // "subtract a configurable Clawback percentage ... from the amount after the 12% tax discount."
            // So it applies to the Intermediate Neta?
            // Let's assume: Clawback = (Bruta - Discount) * Clawback%

            // Step A: Discount
            discountPctApplied = ctx.officeDiscount
            discountAmount = roundCurrency(bruta.mul(discountPctApplied))
            const intermediate = bruta.sub(discountAmount)

            // Step B: Clawback
            clawbackPctApplied = ctx.clawbackPercentage
            clawbackAmount = roundCurrency(intermediate.mul(clawbackPctApplied))
        }

        // 3. Final = Bruta - Discount - Clawback
        const final = bruta.sub(discountAmount).sub(clawbackAmount)

        results.push({
            categoryId: cat.id,
            categoryName: cat.name,
            baseAmount: bruta,
            discountAmount: discountAmount,
            clawbackAmount: clawbackAmount,
            finalAmount: final,
            percentageApplied: pct,
            discountPercentageApplied: discountPctApplied,
            clawbackPercentageApplied: clawbackPctApplied
        })
    }

    return results
}
