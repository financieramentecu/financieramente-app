import { prisma } from '@/lib/prisma'
import { UserWithRole } from '../types/business.types'

export const getCurrentUserByEmail = async (
	email: string
): Promise<UserWithRole | null> => {
	try {
		const user: UserWithRole | null = await prisma.user.findUnique({
			where: { email },
			include: {
				role: true,
				level: { select: { code: true } },
			},
		})

		if (user) {
			return user
		}

		return null
	} catch (error) {
		console.error('Error getting current user by email:', error)
		return null
	}
}
