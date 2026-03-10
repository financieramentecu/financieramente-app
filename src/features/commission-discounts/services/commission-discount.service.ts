import { prisma } from '@/lib/prisma'
import type { CreateCommissionDiscountData } from '@/features/commission-discounts/lib/commission-discount-schemas'

export async function listDiscounts() {
	return prisma.commissionDiscount.findMany({
		include: { createdBy: true, updatedBy: true },
		orderBy: { createdAt: 'desc' },
	})
}

export async function findActiveByType(type: string) {
	return prisma.commissionDiscount.findFirst({
		where: { type, status: 'ACTIVE' },
	})
}

export async function createDiscount(input: CreateCommissionDiscountData, createdById: number) {
	return prisma.commissionDiscount.create({
		data: { ...input, description: input.description ?? null, createdById },
	})
}

export async function findDiscountById(id: number) {
	return prisma.commissionDiscount.findUnique({ where: { id } })
}

export async function inactivateDiscount(id: number, updatedById: number) {
	return prisma.commissionDiscount.update({
		where: { id },
		data: { status: 'INACTIVE', updatedById },
	})
}
