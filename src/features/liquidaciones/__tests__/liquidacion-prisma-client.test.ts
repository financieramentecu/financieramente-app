import { describe, expect, it, vi } from 'vitest'

const { prismaClientConstructed } = vi.hoisted(() => ({
	prismaClientConstructed: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

vi.mock('@prisma/client', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@prisma/client')>()
	return {
		...actual,
		PrismaClient: vi.fn(function PrismaClientSpy() {
			prismaClientConstructed()
		}),
	}
})

describe('liquidacion.service Prisma client', () => {
	it('reuses the shared singleton instead of opening its own connection pool', async () => {
		await import('../services/liquidacion.service')

		expect(prismaClientConstructed).not.toHaveBeenCalled()
	})
})
