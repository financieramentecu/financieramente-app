import { Metadata } from 'next'
import { CategoryTypeForm } from '@/features/category-types/components/category-type-form'
import { ChevronLeft } from 'lucide-react'
import { DashboardLayout } from '@/features/shared/layout/DashboardLayout'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Crear Tipo de Categoría | Administración',
}

export default function CreateCategoryTypePage() {
    return (
        <DashboardLayout currentPage="Nuevo Tipo de Categoría">
            <Link
                href="/dashboard/admin/category-types"
                className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
            >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Volver a tipos de categoría
            </Link>
            <div className="space-y-4 max-w-xl mx-auto">
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Nuevo Tipo de Categoría</h2>
                        <p className="text-muted-foreground">
                            Crea un nuevo tipo para organizar tus categorías.
                        </p>
                    </div>
                </div>
                <CategoryTypeForm />
            </div>
        </DashboardLayout>
    )
}
