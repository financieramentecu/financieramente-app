import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/features/shared/types/session-user.types'

export async function getCurrentUserByEmail(
	email: string
): Promise<SessionUser | null> {
	try {
		const user = await prisma.user.findUnique({
			where: { email },
			include: {
				role: true,
				level: true,
			},
		})

		if (!user) return null

		return {
			idUser: user.idUser,
			name: user.name,
			lastName: user.lastName,
			email: user.email,
			active: user.active,
			idLevel: user.idLevel,
			idCategory: user.idCategory,
			idUserLeader: user.idUserLeader,
			role: user.role ? { code: user.role.code } : null,
			level: user.level ? { code: user.level.code } : null,
		}
	} catch (error) {
		console.error('Error getting current user by email:', error)
		return null
	}
}
