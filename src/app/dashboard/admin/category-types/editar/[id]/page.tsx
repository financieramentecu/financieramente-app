'use client'

import { useParams } from 'next/navigation'
import { CategoryTypeForm } from '@/features/category-types/components/category-type-form'
import { useCategoryType } from '@/features/category-types/hooks/use-category-type'
import { CategoryTypeFormSkeleton } from '@/features/category-types/components/category-type-form-skeleton'
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
        return <CategoryTypeFormSkeleton />
    }

    if (status === 'error') {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    {error || 'No se pudo cargar el tipo de categoría'}
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <Link
                    href="/dashboard/admin/category-types"
                    className="flex items-center text-sm text-muted-foreground hover:text-primary mb-2"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Volver a la lista
                </Link>
                <h1 className="text-3xl font-bold tracking-tight">
                    Editar Tipo de Categoría
                </h1>
                <p className="text-muted-foreground">
                    Modifique los detalles del tipo de categoría
                </p>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                {data && <CategoryTypeForm initialData={data} />}
            </div>
        </div>
    )
}
