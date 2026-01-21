import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/nextauth'
import { prisma } from '@/lib/prisma'
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password-utils'
import { UserRole } from '@/lib/auth/roles'
import { z } from 'zod'

/**
 * Schema de validación para establecer contraseña
 */
const setPasswordSchema = z.object({
    userId: z.number().int().positive(),
    password: z.string().min(8),
    ssoOnly: z.boolean(),
})

/**
 * POST /api/admin/users/set-password
 * Establece o actualiza la contraseña de un usuario
 * Solo accesible para usuarios ADMIN
 * Solo puede establecer contraseñas a usuarios ADMIN
 */
export async function POST(request: Request) {
    try {
        const session = await auth()

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'No autenticado' },
                { status: 401 }
            )
        }

        // Verificar que el usuario autenticado sea ADMIN
        if (session.user.role !== UserRole.ADMIN) {
            return NextResponse.json(
                { error: 'No autorizado. Solo administradores pueden establecer contraseñas.' },
                { status: 403 }
            )
        }

        // Parsear y validar el body
        const body = await request.json()
        const validationResult = setPasswordSchema.safeParse(body)

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: 'Datos inválidos',
                    details: validationResult.error.issues,
                },
                { status: 400 }
            )
        }

        const { userId, password, ssoOnly } = validationResult.data

        // Validar fortaleza de la contraseña
        const passwordValidation = validatePasswordStrength(password)
        if (!passwordValidation.isValid) {
            return NextResponse.json(
                { error: passwordValidation.error },
                { status: 400 }
            )
        }

        // Verificar que el usuario objetivo existe
        const targetUser = await prisma.user.findUnique({
            where: { idUser: userId },
            include: { role: true },
        })

        if (!targetUser) {
            return NextResponse.json(
                { error: 'Usuario no encontrado' },
                { status: 404 }
            )
        }

        // RESTRICCIÓN: Solo se puede establecer contraseña a usuarios ADMIN
        if (targetUser.role?.code !== UserRole.ADMIN) {
            return NextResponse.json(
                {
                    error: 'Solo se puede establecer contraseña a usuarios con rol ADMIN',
                },
                { status: 403 }
            )
        }

        // Hashear la contraseña
        const hashedPassword = await hashPassword(password)

        // Actualizar usuario
        await prisma.user.update({
            where: { idUser: userId },
            data: {
                password: hashedPassword,
                ssoOnly,
            },
        })

        return NextResponse.json(
            {
                success: true,
                message: 'Contraseña establecida exitosamente',
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error setting password:', error)
        return NextResponse.json(
            {
                error: 'Error al establecer contraseña',
                details: error instanceof Error ? error.message : undefined,
            },
            { status: 500 }
        )
    }
}
