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
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <FileImage className="h-4 w-4" />
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
