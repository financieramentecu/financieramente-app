import React from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Mail, Calendar, Clock, User as UserIcon } from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import type { User } from '../types/user.types'

interface UserInfoCardProps {
    user: User
}

export function UserInfoCard({ user }: UserInfoCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-2xl">
                            {user.name} {user.lastName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                            <Mail className="h-4 w-4" />
                            {user.email}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                            {user.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {user.role && (
                            <Badge variant="outline" className="capitalize">
                                {user.role.name}
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-muted-foreground">ID de Usuario</p>
                            <p className="font-medium">{user.id}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-muted-foreground">Fecha de Registro</p>
                            <p className="font-medium">
                                {format(new Date(user.createdAt), 'PPP', { locale: es })}
                            </p>
                        </div>
                    </div>

                    {user.lastLogin && (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Último Acceso</p>
                                <p className="font-medium">
                                    {format(new Date(user.lastLogin), 'PPp', { locale: es })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
