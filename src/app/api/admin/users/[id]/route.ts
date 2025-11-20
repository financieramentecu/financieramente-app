import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth/nextauth'
import { logAuditEvent, AuditAction } from '@/lib/auth/audit-logger'

/**
 * GET /api/admin/users/[id]
 * 
 * Obtiene un usuario por ID
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { idUser: userId },
      include: {
        role: true,
        typeUser: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Obtener último acceso
    const lastLogin = await prisma.auditLog.findFirst({
      where: {
        idUser: userId,
        action: 'LOGIN',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: user.idUser,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        avatar: null,
        role: user.role
          ? {
              id: user.role.idRole,
              code: user.role.code,
              name: user.role.name,
            }
          : null,
        active: user.active,
        createdAt: user.createdAt,
        lastLogin: lastLogin?.createdAt || null,
        typeUser: user.typeUser
          ? {
              id: user.typeUser.idTypeUser,
              name: user.typeUser.nombre,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener usuario',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/users/[id]
 * 
 * Actualiza un usuario (estado, rol)
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'ID de usuario inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { active, roleId } = body

    // Validar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { idUser: userId },
      include: { role: true },
    })

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Preparar datos de actualización
    const updateData: { active?: boolean; idRole?: number | null } = {}

    if (typeof active === 'boolean') {
      updateData.active = active
    }

    if (roleId !== undefined) {
      if (roleId === null) {
        updateData.idRole = null
      } else {
        // Verificar que el rol existe
        const role = await prisma.role.findUnique({
          where: { idRole: parseInt(roleId) },
        })
        if (!role) {
          return NextResponse.json(
            { success: false, error: 'Rol no encontrado' },
            { status: 400 }
          )
        }
        updateData.idRole = role.idRole
      }
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { idUser: userId },
      data: updateData,
      include: {
        role: true,
        typeUser: true,
      },
    })

    // Registrar en audit log
    const adminUserId = session.user.id ? parseInt(session.user.id) : undefined

    if (typeof active === 'boolean' && active !== existingUser.active) {
      await logAuditEvent({
        userId: adminUserId,
        roleId: updatedUser.idRole || undefined,
        action: active ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
        email: existingUser.email || undefined,
        details: `Usuario ${active ? 'activado' : 'desactivado'} por administrador`,
      })
    }

    if (roleId !== undefined && updatedUser.idRole !== existingUser.idRole) {
      await logAuditEvent({
        userId: adminUserId,
        roleId: updatedUser.idRole || undefined,
        action: AuditAction.ROLE_CHANGED,
        email: existingUser.email || undefined,
        details: `Rol cambiado de ${existingUser.role?.code || 'sin rol'} a ${updatedUser.role?.code || 'sin rol'}`,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.idUser,
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        role: updatedUser.role
          ? {
              id: updatedUser.role.idRole,
              code: updatedUser.role.code,
              name: updatedUser.role.name,
            }
          : null,
        active: updatedUser.active,
      },
      message: 'Usuario actualizado exitosamente',
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar usuario',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

