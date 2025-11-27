'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import { Button } from '@/features/shared/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/features/shared/ui/card'
import { UserInfoCard } from '@/features/admin/users/components/user-info-card'
import { UserActionsCard } from '@/features/admin/users/components/user-actions-card'
import { useUser } from '@/features/admin/users/hooks/use-user'
import { useUserMutations } from '@/features/admin/users/hooks/use-user-mutations'

export default function UserDetailPage() {
    const params = useParams()
    const router = useRouter()
    const userId = parseInt(params.id as string)

    const { user, isLoading, error, refreshUser } = useUser(userId)
    const { updateUser, isSubmitting } = useUserMutations()

    const handleUpdate = async (data: {
        active?: boolean
        roleId?: number | null
    }) => {
        await updateUser(userId, data)
        refreshUser()
    }

    if (isLoading) {
        return (
            <DashboardLayout currentPage="Usuarios">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground">Cargando información del usuario...</p>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    if (error || !user) {
        return (
            <DashboardLayout currentPage="Usuarios">
                <div className="space-y-6">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard/admin/users')}
                        className="gap-2 cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Usuarios
                    </Button>

                    <Card className="border-destructive">
                        <CardHeader>
                            <CardTitle>Error al cargar usuario</CardTitle>
                            <CardDescription>
                                {error?.message || 'No se pudo encontrar el usuario solicitado'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={() => router.push('/dashboard/admin/users')}
                                className="cursor-pointer"
                            >
                                Volver a la lista de usuarios
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout currentPage="Usuarios">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/dashboard/admin/users')}
                        className="gap-2 cursor-pointer"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a Usuarios
                    </Button>
                </div>

                {/* Content Grid */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <UserInfoCard user={user} />
                    </div>
                    <div className="lg:col-span-1">
                        <UserActionsCard
                            user={user}
                            onUpdate={handleUpdate}
                            isLoading={isSubmitting}
                        />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
