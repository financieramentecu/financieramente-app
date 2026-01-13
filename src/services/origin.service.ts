import { prisma } from '@/lib/prisma'
import { ClientOrigin } from '@prisma/client'

export const getClientOrigins = async (): Promise<ClientOrigin[]> => {
	return await prisma.clientOrigin.findMany({
		where: {
			status: true,
		},
		orderBy: {
			name: 'asc',
		},
	})
}
