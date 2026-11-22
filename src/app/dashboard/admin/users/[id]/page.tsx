'use client'

import { FormSkeleton } from '@/features/shared/ui/loading-skeletons'
import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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
        categoryId?: number | null
        levelId?: number | null
        leaderId?: number | null
        canViewOthersCrm?: boolean
    }) => {
        await updateUser(userId, data)
        refreshUser()
    }

    if (isLoading) {
        return (
            <DashboardLayout currentPage="Usuarios">
                <div className="max-w-2xl space-y-4">
                    <FormSkeleton label="Cargando usuario" fields={4} />
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

                {/* Content - Stacked Layout */}
                <div className="space-y-6">
                    <UserInfoCard user={user} />
                    <UserActionsCard
                        user={user}
                        onUpdate={handleUpdate}
                        isLoading={isSubmitting}
                    />
                </div>
            </div>
        </DashboardLayout>
    )
}
