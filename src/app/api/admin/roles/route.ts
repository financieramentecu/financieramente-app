import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'

/**
 * GET /api/admin/roles
 *
 * Lista todos los roles activos del sistema
 */
export async function GET() {
    try {
        // Verificar autenticación
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'No autorizado' },
                { status: 401 }
            )
        }

        // Obtener roles activos
        const roles = await prisma.role.findMany({
            where: { active: true },
            orderBy: { name: 'asc' },
            select: {
                idRole: true,
                code: true,
                name: true,
                description: true,
            },
        })

        // Map to frontend format
        const formattedRoles = roles.map((role) => ({
            id: role.idRole,
            code: role.code,
            name: role.name,
            description: role.description,
        }))

        return NextResponse.json({
            success: true,
            data: formattedRoles,
        })
    } catch (error) {
        console.error('Error fetching roles:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Error al obtener roles',
                details: error instanceof Error ? error.message : 'Error desconocido',
            },
            { status: 500 }
        )
    }
}
