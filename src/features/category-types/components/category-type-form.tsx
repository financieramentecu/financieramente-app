'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/features/shared/ui/form'
import { Input } from '@/features/shared/ui/input'
import { Button } from '@/features/shared/ui/button'
import { Textarea } from '@/features/shared/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/features/shared/ui/select'
import {
    createCategoryTypeSchema,
    type CreateCategoryTypeFormData,
} from '../lib/category-type-schemas'
import { useCategoryTypeMutations } from '../hooks/use-category-type-mutations'
import { CategoryType } from '../types/category-type.types'
import { toast } from 'sonner'

interface CategoryTypeFormProps {
    initialData?: CategoryType
    onSuccess?: () => void
}

type FormValues = CreateCategoryTypeFormData

export function CategoryTypeForm({
    initialData,
    onSuccess,
}: CategoryTypeFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const isEditing = !!initialData

    const { createCategoryType, updateCategoryType } = useCategoryTypeMutations()

    const form = useForm<FormValues>({
        resolver: zodResolver(createCategoryTypeSchema),
        defaultValues: {
            name: initialData?.name ?? '',
            description: initialData?.description ?? null,
            status: initialData?.status ?? true,
        },
    })

    const onSubmit = async (data: FormValues) => {
        setIsLoading(true)
        try {
            const success = initialData
                ? await updateCategoryType(initialData.id, data)
                : await createCategoryType(data)

            if (success) {
                toast.success(
                    initialData
                        ? 'Tipo de categoría actualizado exitosamente'
                        : 'Tipo de categoría creado exitosamente'
                )
                form.reset()
                onSuccess?.()
                router.push('/dashboard/admin/category-types')
                router.refresh()
            } else {
                toast.error('Error al guardar el tipo de categoría')
            }
        } catch (error) {
            console.error('Error saving category type:', error)
            toast.error('Error al guardar el tipo de categoría')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                                <Input placeholder="Ej. MMS, Aliado, etc." {...field} />
                            </FormControl>
                            <FormDescription>
                                El nombre único para este tipo de categoría.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Opcional: Describa el propósito de este tipo"
                                    className="resize-none"
                                    {...field}
                                    value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select
                                onValueChange={(value) => field.onChange(value === 'active')}
                                defaultValue={field.value ? 'active' : 'inactive'}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un estado" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isLoading}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
