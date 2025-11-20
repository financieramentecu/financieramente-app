import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'

/**
 * GET /api/admin/roles
 * 
 * Lista todos los roles disponibles en el sistema
 */
export async function GET(_request: Request) {
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
      where: {
        active: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        idRole: true,
        code: true,
        name: true,
        description: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: roles,
    })
  } catch (error) {
    console.error('Error listing roles:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al listar roles',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

