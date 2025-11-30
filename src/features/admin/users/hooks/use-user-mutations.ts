'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { userApi } from '../lib/user-api'
import type { UpdateUserInput } from '../types/user.types'

export function useUserMutations() {
    const [isSubmitting, setIsSubmitting] = useState(false)

    const updateUser = async (id: number, data: UpdateUserInput) => {
        try {
            setIsSubmitting(true)
            const updatedUser = await userApi.updateUser(id, data)
            toast.success('Usuario actualizado exitosamente')
            return updatedUser
        } catch (error) {
            const message =
                error instanceof Error ? error.message : 'Error al actualizar usuario'
            toast.error(message)
            throw error
        } finally {
            setIsSubmitting(false)
        }
    }

    return {
        updateUser,
        isSubmitting,
    }
}
