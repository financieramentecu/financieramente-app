import { Metadata } from 'next'
import { CategoryTypesTable } from '@/features/category-types/components/category-types-table'
import Link from 'next/link'
import { Button } from '@/features/shared/ui/button'
import { Plus } from 'lucide-react'

export const metadata: Metadata = {
    title: 'Tipos de Categoría | Administración',
    description: 'Administrar los tipos de categoría del sistema',
}

export default function CategoryTypesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Tipos de Categoría
                    </h1>
                    <p className="text-muted-foreground">
                        Gestione los tipos de categoría disponibles (ej. MMS, Aliado) que se
                        pueden asignar a las categorías.
                    </p>
                </div>
                <Link href="/dashboard/admin/category-types/crear">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Tipo
                    </Button>
                </Link>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
                <CategoryTypesTable />
            </div>
        </div>
    )
}
