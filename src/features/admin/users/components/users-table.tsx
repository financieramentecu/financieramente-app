'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/features/shared/ui/table'
import { Badge } from '@/features/shared/ui/badge'
import { Button } from '@/features/shared/ui/button'
import type { User } from '../types/user.types'

interface UsersTableProps {
    users: User[]
    isLoading?: boolean
}

export function UsersTable({ users, isLoading = false }: UsersTableProps) {
    const router = useRouter()

    if (isLoading) {
        return (
            <div className="rounded-md border p-12">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
                </div>
            </div>
        )
    }

    if (users.length === 0) {
        return (
            <div className="rounded-md border p-8 text-center">
                <p className="text-muted-foreground">No se encontraron usuarios</p>
            </div>
        )
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha Creación</TableHead>
                        <TableHead>Último Acceso</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">
                                {user.name} {user.lastName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {user.email}
                            </TableCell>
                            <TableCell>
                                {user.role ? (
                                    <Badge variant="outline" className="capitalize">
                                        {user.role.name}
                                    </Badge>
                                ) : (
                                    <span className="text-sm text-muted-foreground">Sin rol</span>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.active ? 'default' : 'secondary'}>
                                    {user.active ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {format(new Date(user.createdAt), 'PP', { locale: es })}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                                {user.lastLogin
                                    ? format(new Date(user.lastLogin), 'PPp', { locale: es })
                                    : 'Nunca'}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                                    className="gap-2 cursor-pointer"
                                >
                                    <Eye className="h-4 w-4" />
                                    Ver detalle
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
