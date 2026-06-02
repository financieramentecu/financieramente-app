'use client'
import { FlagsmithProvider as VendorProvider } from '@flagsmith/flagsmith/react'
import flagsmith from '@flagsmith/flagsmith/isomorphic'
import type { ReactNode } from 'react'
import type { FlagsmithServerState } from '@/features/shared/types/feature-flags.types'

interface FlagsmithProviderProps {
	children: ReactNode
	serverState: FlagsmithServerState
	identity?: string
}

export function FlagsmithProvider({ children, serverState, identity }: FlagsmithProviderProps) {
	return (
		<VendorProvider
			flagsmith={flagsmith}
			serverState={JSON.parse(serverState)}
			options={{
				environmentID: process.env.NEXT_PUBLIC_FLAGSMITH_CLIENT_KEY!,
				preventFetch: process.env.NODE_ENV === 'development',
				...(identity ? { identity } : {}),
			}}
		>
			{children}
		</VendorProvider>
	)
}
