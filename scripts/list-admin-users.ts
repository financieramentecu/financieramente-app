/**
 * Script para listar usuarios ADMIN en la base de datos
 * Uso: npx tsx scripts/list-admin-users.ts
 */

import { PrismaClient } from '@prisma/client'
import { UserRole } from '../src/lib/auth/roles'

const prisma = new PrismaClient()

async function listAdminUsers() {
    try {
        console.log('\n🔍 Buscando usuarios ADMIN...\n')

        const adminUsers = await prisma.user.findMany({
            where: {
                role: {
                    code: UserRole.ADMIN,
                },
            },
            include: {
                role: true,
            },
            orderBy: {
                email: 'asc',
            },
        })

        if (adminUsers.length === 0) {
            console.log('❌ No se encontraron usuarios ADMIN')
            return
        }


        adminUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name}`)
            console.log(`   Email: ${user.email}`)
            console.log(`   Estado: ${user.active ? '✅ Activo' : '❌ Inactivo'}`)
            console.log(
                `   Contraseña: ${user.password ? '✅ Configurada' : '❌ No configurada'}`
            )
            console.log(`   SSO Only: ${user.ssoOnly ? '✅ Sí' : '❌ No'}`)
            console.log(
                `   Puede usar email/password: ${!user.ssoOnly && user.password ? '✅ Sí' : '❌ No'}\n`
            )
        })

        console.log('\n💡 Para establecer contraseña a un usuario ADMIN, usa:')
        console.log(
            '   npx tsx scripts/set-admin-password.ts <email> <password>\n'
        )
    } catch (error) {
        console.error('\n❌ Error al listar usuarios:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// Ejecutar
listAdminUsers()
