import { Metadata } from 'next'
import { CategoryTypeForm } from '@/features/category-types/components/category-type-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Crear Tipo de Categoría | Administración',
}

export default function CreateCategoryTypePage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <Link
                        href="/dashboard/admin/category-types"
                        className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Volver a tipos de categoría
                    </Link>
                    <h2 className="text-3xl font-bold tracking-tight">Nuevo Tipo de Categoría</h2>
                    <p className="text-muted-foreground">
                        Crea un nuevo tipo para organizar tus categorías.
                    </p>
                </div>
            </div>
            <div className="max-w-2xl mx-auto py-8">
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <CategoryTypeForm />
                </div>
            </div>
        </div>
    )
}
