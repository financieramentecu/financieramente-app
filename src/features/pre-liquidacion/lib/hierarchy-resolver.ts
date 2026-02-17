import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Define a type that includes the necessary relations
type UserWithHierarchy = Prisma.UserGetPayload<{
    include: {
        leader: {
            include: {
                leader: true
            }
        }
    }
}>

// Simplified definition for the return interface, matching the structure but correctly typed
// However, the function returns the full object structure for coach, leader, agency.
// The consumer might expect just User, but if they access properties of User it's fine.
// The issue is assigning the result of query to this interface.

export interface CommissionHierarchy {
    coach: UserWithHierarchy
    leader?: UserWithHierarchy['leader'] | null
    agency?: UserWithHierarchy['leader']['leader'] | null
}

/**
 * Resuelve la jerarquía de comisiones para un usuario (Coach).
 * Busca 2 niveles hacia arriba: Leader y Agency via 'idUserLeader'.
 */
export async function resolveHierarchy(
    userId: number
): Promise<CommissionHierarchy | null> {
    const coach = await prisma.user.findUnique({
        where: { idUser: userId },
        include: {
            leader: {
                include: {
                    leader: true,
                },
            },
        },
    })

    if (!coach) return null

    const leader = coach.leader
    const agency = leader?.leader

    return {
        coach,
        leader: leader ?? null,
        agency: agency ?? null,
    }
}
