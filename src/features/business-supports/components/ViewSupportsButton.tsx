'use client'

import { useState } from 'react'
import { Button } from '@/features/shared/ui/button'
import { FileImage } from 'lucide-react'
import { ViewComprobantesSheet } from './BusinessSupportsSheet'
import { UserRole } from '@/features/auth/lib/roles'

interface ViewSupportsButtonProps {
  businessId: number
  userRole?: UserRole
}

export function ViewSupportsButton({ businessId, userRole }: ViewSupportsButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
      >
        <FileImage className="h-3.5 w-3.5" />
        Ver Soportes
      </Button>

      {open && (
        <ViewComprobantesSheet
          businessId={businessId}
          userRole={userRole}
          open={open}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
