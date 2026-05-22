'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/features/shared/ui/dialog'
import { Button } from '@/features/shared/ui/button'
import { Checkbox } from '@/features/shared/ui/checkbox'
import { ScrollArea } from '@/features/shared/ui/scroll-area'
import { Label } from '@/features/shared/ui/label'
import { Input } from '@/features/shared/ui/input'
import { Search } from 'lucide-react'
import { useCompanies } from '@/features/company/hooks/use-companies'
import { useProducts } from '@/features/product/hooks/use-products'
import { useClientOrigins } from '@/features/origins/hooks/use-client-origins'

interface AdvancedFiltersModalProps {
	isOpen: boolean
	onClose: () => void
	initialCompanyIds: number[]
	initialProductIds: number[]
	initialOriginIds: number[]
	onApplyFilters: (filters: {
		companyIds: number[]
		productIds: number[]
		originIds: number[]
	}) => void
}

export function AdvancedFiltersModal({
	isOpen,
	onClose,
	initialCompanyIds,
	initialProductIds,
	initialOriginIds,
	onApplyFilters,
}: AdvancedFiltersModalProps) {
	const [companyIds, setCompanyIds] = useState<number[]>([])
	const [productIds, setProductIds] = useState<number[]>([])
	const [originIds, setOriginIds] = useState<number[]>([])

	const [companySearch, setCompanySearch] = useState('')
	const [productSearch, setProductSearch] = useState('')
	const [originSearch, setOriginSearch] = useState('')

	useEffect(() => {
		if (isOpen) {
			setCompanyIds(initialCompanyIds)
			setProductIds(initialProductIds)
			setOriginIds(initialOriginIds)
		}
	}, [isOpen, initialCompanyIds, initialProductIds, initialOriginIds])

	const { state: companiesState } = useCompanies({ pageSize: 100 })
	const { state: productsState } = useProducts({ pageSize: 100 })
	const { state: originsState } = useClientOrigins({ pageSize: 100 })

	const handleApply = () => {
		onApplyFilters({ companyIds, productIds, originIds })
		onClose()
	}

	const handleClear = () => {
		setCompanyIds([])
		setProductIds([])
		setOriginIds([])
		setCompanySearch('')
		setProductSearch('')
		setOriginSearch('')
	}

	const toggleItem = (
		id: number,
		currentIds: number[],
		setIds: React.Dispatch<React.SetStateAction<number[]>>
	) => {
		if (currentIds.includes(id)) {
			setIds(currentIds.filter((item) => item !== id))
		} else {
			setIds([...currentIds, id])
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-md w-full">
				<DialogHeader>
					<DialogTitle>Filtros Avanzados</DialogTitle>
				</DialogHeader>

				<div className="grid gap-6 py-4">
					{/* Filtro de Compañías */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium leading-none">Compañía</h4>
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Buscar compañía..."
								className="pl-8"
								value={companySearch}
								onChange={(e) => setCompanySearch(e.target.value)}
							/>
						</div>
						<ScrollArea className="h-32 border rounded-md p-2">
							{companiesState.status === 'loading' ? (
								<p className="text-sm text-muted-foreground p-2">Cargando...</p>
							) : companiesState.status === 'success' &&
							  companiesState.data.companies.length > 0 ? (
								<div className="space-y-2">
									{(() => {
										const filteredCompanies = companiesState.data.companies.filter((company) =>
											company.name.toLowerCase().includes(companySearch.toLowerCase())
										)
										if (filteredCompanies.length === 0) {
											return <p className="text-sm text-muted-foreground p-2">No se encontraron resultados.</p>
										}
										return filteredCompanies.map((company) => (
											<div key={company.idCompany} className="flex items-center space-x-2">
												<Checkbox
													id={`company-${company.idCompany}`}
													checked={companyIds.includes(company.idCompany)}
													onCheckedChange={() =>
														toggleItem(company.idCompany, companyIds, setCompanyIds)
													}
												/>
												<Label htmlFor={`company-${company.idCompany}`} className="font-normal cursor-pointer">
													{company.name}
												</Label>
											</div>
										))
									})()}
								</div>
							) : (
								<p className="text-sm text-muted-foreground p-2">No hay opciones disponibles.</p>
							)}
						</ScrollArea>
					</div>

					{/* Filtro de Productos */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium leading-none">Producto</h4>
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Buscar producto..."
								className="pl-8"
								value={productSearch}
								onChange={(e) => setProductSearch(e.target.value)}
							/>
						</div>
						<ScrollArea className="h-32 border rounded-md p-2">
							{productsState.status === 'loading' ? (
								<p className="text-sm text-muted-foreground p-2">Cargando...</p>
							) : productsState.status === 'success' &&
							  productsState.data.products.length > 0 ? (
								<div className="space-y-2">
									{(() => {
										const filteredProducts = productsState.data.products.filter((product) =>
											product.name.toLowerCase().includes(productSearch.toLowerCase())
										)
										if (filteredProducts.length === 0) {
											return <p className="text-sm text-muted-foreground p-2">No se encontraron resultados.</p>
										}
										return filteredProducts.map((product) => (
											<div key={product.idProduct} className="flex items-center space-x-2">
												<Checkbox
													id={`product-${product.idProduct}`}
													checked={productIds.includes(product.idProduct)}
													onCheckedChange={() =>
														toggleItem(product.idProduct, productIds, setProductIds)
													}
												/>
												<Label htmlFor={`product-${product.idProduct}`} className="font-normal cursor-pointer">
													{product.name}
												</Label>
											</div>
										))
									})()}
								</div>
							) : (
								<p className="text-sm text-muted-foreground p-2">No hay opciones disponibles.</p>
							)}
						</ScrollArea>
					</div>

					{/* Filtro de Origen */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium leading-none">Origen</h4>
						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Buscar origen..."
								className="pl-8"
								value={originSearch}
								onChange={(e) => setOriginSearch(e.target.value)}
							/>
						</div>
						<ScrollArea className="h-32 border rounded-md p-2">
							{originsState.status === 'loading' ? (
								<p className="text-sm text-muted-foreground p-2">Cargando...</p>
							) : originsState.status === 'success' &&
							  originsState.data.origins.length > 0 ? (
								<div className="space-y-2">
									{(() => {
										const filteredOrigins = originsState.data.origins.filter((origin) =>
											origin.name.toLowerCase().includes(originSearch.toLowerCase())
										)
										if (filteredOrigins.length === 0) {
											return <p className="text-sm text-muted-foreground p-2">No se encontraron resultados.</p>
										}
										return filteredOrigins.map((origin) => (
											<div key={origin.idClientOrigin} className="flex items-center space-x-2">
												<Checkbox
													id={`origin-${origin.idClientOrigin}`}
													checked={originIds.includes(origin.idClientOrigin)}
													onCheckedChange={() =>
														toggleItem(origin.idClientOrigin, originIds, setOriginIds)
													}
												/>
												<Label htmlFor={`origin-${origin.idClientOrigin}`} className="font-normal cursor-pointer">
													{origin.name}
												</Label>
											</div>
										))
									})()}
								</div>
							) : (
								<p className="text-sm text-muted-foreground p-2">No hay opciones disponibles.</p>
							)}
						</ScrollArea>
					</div>
				</div>

				<DialogFooter className="flex flex-row justify-between sm:justify-between items-center w-full">
					<Button type="button" variant="ghost" onClick={handleClear}>
						Limpiar
					</Button>
					<div className="flex gap-2">
						<Button type="button" variant="outline" onClick={onClose}>
							Cancelar
						</Button>
						<Button type="button" onClick={handleApply}>
							Aplicar Filtros
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
