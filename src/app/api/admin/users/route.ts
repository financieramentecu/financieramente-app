import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import { Prisma } from '@prisma/client'

/**
 * GET /api/admin/users
 *
 * Lista usuarios con filtros opcionales:
 * - status: 'active' | 'inactive'
 * - role: código del rol
 * - search: búsqueda por nombre o email
 */
export async function GET(request: Request) {
	// Requiere sesión + rol ADMIN.
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}

	try {
		const { searchParams } = new URL(request.url)
		const status = searchParams.get('status') // 'active' | 'inactive' | null
		const roleCode = searchParams.get('role')
		const search = searchParams.get('search')

		// Construir filtros
		const where: Prisma.UserWhereInput = {}

		if (status === 'active') {
			where.active = true
		} else if (status === 'inactive') {
			where.active = false
		}

		if (roleCode) {
			where.role = {
				code: roleCode,
			}
		}

		if (search) {
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ email: { contains: search, mode: 'insensitive' } },
			]
		}

		// Obtener usuarios con relaciones
		const users = await prisma.user.findMany({
			where,
			select: {
				idUser: true,
				name: true,
				lastName: true,
				email: true,
				active: true,
				createdAt: true,
				role: {
					select: {
						idRole: true,
						code: true,
						name: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		// Obtener último acceso desde audit_log
		const userIds = users.map((u) => u.idUser)
		const lastLogins = await prisma.auditLog.findMany({
			where: {
				idUser: { in: userIds },
				action: 'LOGIN',
			},
			select: {
				idUser: true,
				createdAt: true,
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		// Crear mapa de últimos accesos
		const lastLoginMap = new Map<number, Date>()
		lastLogins.forEach((log) => {
			if (log.idUser && !lastLoginMap.has(log.idUser)) {
				lastLoginMap.set(log.idUser, log.createdAt)
			}
		})

		// Formatear respuesta
		const formattedUsers = users.map((user) => ({
			id: user.idUser,
			name: user.name,
			lastName: user.lastName,
			email: user.email,
			avatar: null, // TODO: Agregar campo avatar o usar image de OAuth
			role: user.role
				? {
					id: user.role.idRole,
					code: user.role.code,
					name: user.role.name,
				}
				: null,
			active: user.active,
			createdAt: user.createdAt,
			lastLogin: lastLoginMap.get(user.idUser) || null,
		}))

		return NextResponse.json({
			success: true,
			data: formattedUsers,
			total: formattedUsers.length,
		})
	} catch (error) {
		console.error('Error listing users:', error)
		return NextResponse.json(
			{
				success: false,
				error: 'Error al listar usuarios',
				details: error instanceof Error ? error.message : 'Error desconocido',
			},
			{ status: 500 }
		)
	}
}
