'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCommissionRules } from '@/features/distribution-commission/hooks/use-commission-rules'
import { CommissionRulesTable } from '@/features/distribution-commission/components/commission-rules-table'
import { Button } from '@/features/shared/ui/button'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from '@/features/shared/ui/card'
import { useProductConfigurationByCode } from '@/features/product-configuration/hooks/use-product-configuration-by-code'

function CommissionRulesBody({
	productConfigId,
	distributionBasePath,
}: {
	productConfigId: number
	distributionBasePath: string
}) {
	const router = useRouter()
	const { data, isLoading, isError, error, setSearch, reload } =
		useCommissionRules(productConfigId)

	return (
		<>
			<div className="flex items-center justify-between">
				<div />
				<Button
					disabled={data.some((r) => r.active)}
					onClick={() => {
						if (data.some((r) => r.active)) {
							toast.error('Acción bloqueada', {
								description:
									'Ya existe una distribución activa. Desactívala antes de crear una nueva.',
							})
							return
						}
						router.push(`${distributionBasePath}/reglas/crear`)
					}}
				>
					<Plus className="mr-2 h-4 w-4" />
					Nueva Distribución
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardDescription>
						Listado de distribuciones de comisión activas e inactivas.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{isLoading ? (
						<div className="flex h-24 items-center justify-center">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : isError ? (
						<div className="flex h-24 items-center justify-center text-destructive">
							Error: {error}
						</div>
					) : (
						<CommissionRulesTable
							data={data}
							productConfigId={productConfigId}
							distributionBasePath={distributionBasePath}
							onAssignmentSuccess={reload}
							onSearchChange={setSearch}
							searchPlaceholder="Buscar por descripción..."
						/>
					)}
				</CardContent>
			</Card>
		</>
	)
}

export default function CommissionRulesByCodePage() {
	const params = useParams()
	const code = typeof params.code === 'string' ? params.code : ''

	const resolveState = useProductConfigurationByCode(code)

	if (resolveState.status === 'loading') {
		return (
			<div className="flex h-40 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		)
	}

	if (resolveState.status === 'error') {
		return <p className="text-destructive">{resolveState.error}</p>
	}

	if (resolveState.status !== 'success') {
		return null
	}

	const { id, code: resolvedCode } = resolveState.data
	const distributionBasePath = `/dashboard/config-distribucion-comisiones/${encodeURIComponent(resolvedCode)}`

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Distribución de comisión
					</h2>
					<p className="text-muted-foreground">
						Código producto: {resolvedCode}
					</p>
				</div>
				<Button variant="outline" size="sm" className="shrink-0" asChild>
					<Link href="/dashboard/config-distribucion-comisiones">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Buscar nueva distribución
					</Link>
				</Button>
			</div>

			<CommissionRulesBody
				productConfigId={id}
				distributionBasePath={distributionBasePath}
			/>
		</div>
	)
}
