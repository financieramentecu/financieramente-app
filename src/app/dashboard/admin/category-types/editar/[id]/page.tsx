'use client'

import { useParams } from 'next/navigation'
import { CategoryTypeForm } from '@/features/category-types/components/category-type-form'
import { useCategoryType } from '@/features/category-types/hooks/use-category-type'
import { CategoryTypeFormSkeleton } from '@/features/category-types/components/category-type-form-skeleton'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/features/shared/ui/alert'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function EditCategoryTypePage() {
    const params = useParams()
    const id = parseInt(params.id as string)

    const { data, status, error } = useCategoryType(id)

    if (status === 'loading') {
        return (
            <DashboardLayout currentPage="Editar Tipo de Categoría">
                <div className="space-y-6 max-w-2xl mx-auto">
                    <CategoryTypeFormSkeleton />
                </div>
            </DashboardLayout>
        )
    }

    if (status === 'error') {
        return (
            <DashboardLayout currentPage="Editar Tipo de Categoría">
                <div className="space-y-6 max-w-2xl mx-auto">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>
                            {error || 'No se pudo cargar el tipo de categoría'}
                        </AlertDescription>
                    </Alert>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout currentPage="Editar Tipo de Categoría">
            <Link
                href="/dashboard/admin/category-types"
                className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2"
            >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Volver a la lista
            </Link>
            <div className="space-y-6 max-w-2xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Editar Tipo de Categoría
                    </h1>
                    <p className="text-muted-foreground">
                        Modifique los detalles del tipo de categoría
                    </p>
                </div>

                <CategoryTypeForm initialData={data} />
            </div>
        </DashboardLayout>
    )
}
