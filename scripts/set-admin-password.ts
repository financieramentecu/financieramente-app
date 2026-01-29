/**
 * Script para establecer contraseña a un usuario ADMIN
 * Uso: npx tsx scripts/set-admin-password.ts <email> <password>
 */

import { PrismaClient, Prisma } from '@prisma/client'
import { hashPassword } from '../src/features/auth/lib/password-utils'
import { UserRole } from '../src/features/auth/lib/roles'

const prisma = new PrismaClient()

async function setAdminPassword(email: string, password: string) {
    try {

        // Buscar el usuario
        const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true },
        })

        if (!user) {
            console.error(`❌ Usuario no encontrado: ${email}`)
            process.exit(1)
        }

        console.log(`✅ Usuario encontrado: ${user.name}`)
        console.log(`   Rol actual: ${user.role?.code || 'Sin rol'}`)
        console.log(`   Estado: ${user.active ? 'Activo' : 'Inactivo'}`)

        // Verificar que sea ADMIN
        if (user.role?.code !== UserRole.ADMIN) {
            console.error(
                `❌ Error: El usuario no tiene rol ADMIN. Rol actual: ${user.role?.code}`
            )
            console.log(
                '\n💡 Solo se puede establecer contraseña a usuarios con rol ADMIN'
            )
            process.exit(1)
        }

        // Hashear la contraseña
        console.log('\n🔐 Hasheando contraseña...')
        const hashedPassword = await hashPassword(password)

        // Actualizar usuario
        console.log('💾 Actualizando usuario en base de datos...')
        const updateData: Prisma.UserUpdateInput = {
            password: hashedPassword,
            ssoOnly: false, // Habilitar login con contraseña
        }

        await prisma.user.update({
            where: { idUser: user.idUser },
            data: updateData,
        })

        console.log('\n✅ ¡Contraseña establecida exitosamente!')
        console.log(`   Email: ${email}`)
        console.log(`   SSO Only: false (puede usar email/contraseña)`)
        console.log('\n🔗 Ahora puedes iniciar sesión en:')
        console.log(`   http://localhost:3000/login?superadmin=true`)
    } catch (error) {
        console.error('\n❌ Error al establecer contraseña:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// Obtener argumentos de línea de comandos
const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
    console.log('Uso: npx tsx scripts/set-admin-password.ts <email> <password>')
    console.log('\nEjemplo:')
    console.log(
        '  npx tsx scripts/set-admin-password.ts admin@financieramentecu.com MiPassword123!'
    )
    process.exit(1)
}

// Ejecutar
setAdminPassword(email, password)
