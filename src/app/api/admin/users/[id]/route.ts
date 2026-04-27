import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/require-role'
import { UserRole } from '@/features/auth/lib/roles'
import { logAuditEvent, AuditAction } from '@/features/auth/lib/audit-logger'
import { Prisma } from '@prisma/client'

type CategorySummary = {
	idCategory: number
	name: string
}

async function fetchCategorySummary(
	categoryId: number | null | undefined
): Promise<CategorySummary | null> {
	if (!categoryId) return null
	return prisma.category.findUnique({
		where: { idCategory: categoryId },
		select: { idCategory: true, name: true },
	})
}

/**
 * GET /api/admin/users/[id]
 *
 * Obtiene un usuario por ID
 */
export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}

	try {
		const { id } = await params
		const userId = parseInt(id)
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
				leader: {
					select: {
						idUser: true,
						name: true,
						lastName: true,
					},
				},
			},
		})

		if (!user) {
			return NextResponse.json(
				{ success: false, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const category = await fetchCategorySummary(user.idCategoria)

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
				category: category
					? {
							id: category.idCategory,
							name: category.name,
						}
					: null,
				leader: user.leader
					? {
						id: user.leader.idUser,
						name: user.leader.name,
						lastName: user.leader.lastName,
					}
					: null,
				active: user.active,
				createdAt: user.createdAt,
				lastLogin: lastLogin?.createdAt || null,
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
	{ params }: { params: Promise<{ id: string }> }
) {
	const guard = await requireRole([UserRole.ADMIN])
	if (!guard.ok) {
		return guard.response
	}
	const { session } = guard

	try {
		const { id } = await params
		const userId = parseInt(id)
		if (isNaN(userId)) {
			return NextResponse.json(
				{ success: false, error: 'ID de usuario inválido' },
				{ status: 400 }
			)
		}

		const body = await request.json()
		const { active, roleId, categoryId, leaderId } = body

		// Validar que el usuario existe
		const existingUser = await prisma.user.findUnique({
			where: { idUser: userId },
			include: { role: true, leader: true },
		})

		if (!existingUser) {
			return NextResponse.json(
				{ success: false, error: 'Usuario no encontrado' },
				{ status: 404 }
			)
		}

		const existingCategory = await fetchCategorySummary(
			existingUser.idCategoria
		)

		// Preparar datos de actualización
		const updateData: Prisma.UserUpdateInput = {}

		if (typeof active === 'boolean') {
			updateData.active = active
		}

		if (roleId !== undefined) {
			if (roleId === null) {
				updateData.role = { disconnect: true }
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
				updateData.role = { connect: { idRole: role.idRole } }
			}
		}

		// Validar y actualizar categoría
		if (categoryId !== undefined) {
			if (categoryId === null) {
				updateData.category = { disconnect: true }
			} else {
				// Verificar que la categoría existe
				const category = await prisma.category.findUnique({
					where: { idCategory: parseInt(categoryId) },
				})
				if (!category) {
					return NextResponse.json(
						{ success: false, error: 'Categoría no encontrada' },
						{ status: 400 }
					)
				}
				// Validar que si el rol es AGENTE, la categoría es requerida
				const currentRoleCode = existingUser.role?.code
				if (currentRoleCode === 'AGENTE' && categoryId === null) {
					return NextResponse.json(
						{
							success: false,
							error: 'La categoría es requerida cuando el rol es Agente/Coach',
						},
						{ status: 400 }
					)
				}
				updateData.category = { connect: { idCategory: category.idCategory } }
			}
		}

		// Validar y actualizar líder
		if (leaderId !== undefined) {
			if (leaderId === null) {
				updateData.leader = { disconnect: true }
			} else {
				// Validar que el líder no sea el mismo usuario
				if (leaderId === userId) {
					return NextResponse.json(
						{
							success: false,
							error: 'Un usuario no puede ser líder de sí mismo',
						},
						{ status: 400 }
					)
				}
				// Verificar que el líder existe y tiene rol AGENTE
				const leader = await prisma.user.findUnique({
					where: { idUser: parseInt(leaderId) },
					include: { role: true },
				})
				if (!leader) {
					return NextResponse.json(
						{ success: false, error: 'Líder no encontrado' },
						{ status: 400 }
					)
				}
				if (!leader.active) {
					return NextResponse.json(
						{ success: false, error: 'El líder debe estar activo' },
						{ status: 400 }
					)
				}
				if (leader.role?.code !== 'AGENTE') {
					return NextResponse.json(
						{
							success: false,
							error: 'Solo usuarios con rol Agente/Coach pueden ser líderes',
						},
						{ status: 400 }
					)
				}
				updateData.leader = { connect: { idUser: leader.idUser } }
			}
		}

		// Actualizar usuario
		const updatedUser = await prisma.user.update({
			where: { idUser: userId },
			data: updateData,
			include: {
				role: true,
				leader: {
					select: {
						idUser: true,
						name: true,
						lastName: true,
					},
				},
			},
		})

		const updatedCategory = await fetchCategorySummary(
			updatedUser.idCategoria
		)

		// Registrar en audit log
		const adminUserId = session.user.id ? parseInt(session.user.id) : undefined

		if (typeof active === 'boolean' && active !== existingUser.active) {
			await logAuditEvent({
				userId: adminUserId,
				roleId: updatedUser.idRole || undefined,
				action: active
					? AuditAction.USER_ACTIVATED
					: AuditAction.USER_DEACTIVATED,
				email: existingUser.email || undefined,
				details: `Usuario ${active ? 'activado' : 'desactivado'} por administrador`,
			})

			// Send activation email if user is being activated
			if (active && updatedUser.email) {
				try {
					const { sendUserActivationEmail } = await import(
						'@/features/email/lib/user-activation-notification'
					)
					await sendUserActivationEmail({
						userName: updatedUser.name,
						userEmail: updatedUser.email,
						roleName: updatedUser.role?.name || 'Sin rol asignado',
					})
				} catch (error) {
					console.error('Error sending activation email:', error)
					// Don't fail the request if email fails
				}
			}
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

		// Registrar cambios de categoría
		if (
			categoryId !== undefined &&
			updatedUser.idCategoria !== existingUser.idCategoria
		) {
			await logAuditEvent({
				userId: adminUserId,
				roleId: updatedUser.idRole || undefined,
				action: AuditAction.ROLE_CHANGED, // Reutilizar acción, o crear nueva si es necesario
				email: existingUser.email || undefined,
				details: `Categoría cambiada de ${existingCategory?.name || 'sin categoría'} a ${updatedCategory?.name || 'sin categoría'}`,
			})
		}

		// Registrar cambios de líder
		if (
			leaderId !== undefined &&
			updatedUser.idUserLeader !== existingUser.idUserLeader
		) {
			await logAuditEvent({
				userId: adminUserId,
				roleId: updatedUser.idRole || undefined,
				action: AuditAction.ROLE_CHANGED, // Reutilizar acción, o crear nueva si es necesario
				email: existingUser.email || undefined,
				details: `Líder cambiado de ${existingUser.leader ? `${existingUser.leader.name} ${existingUser.leader.lastName || ''}` : 'sin líder'} a ${updatedUser.leader ? `${updatedUser.leader.name} ${updatedUser.leader.lastName || ''}` : 'sin líder'}`,
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
				category: updatedCategory
					? {
							id: updatedCategory.idCategory,
							name: updatedCategory.name,
						}
					: null,
				leader: updatedUser.leader
					? {
						id: updatedUser.leader.idUser,
						name: updatedUser.leader.name,
						lastName: updatedUser.leader.lastName,
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
