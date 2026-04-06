'use client'

import React from 'react'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/features/shared/ui/card'
import { Badge } from '@/features/shared/ui/badge'
import { cn } from '@/lib/utils'
import { StatsCardProps } from '@/features/shared/ui/types/dashboard.types'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { SparklineChart } from '@/features/shared/ui/sparkline-chart'

export function StatsCard({
	title,
	value,
	change,
	trend = 'neutral',
	icon,
	variant = 'default',
	description,
	monthlyData,
	currencies,
	selectedCurrency,
	onCurrencyChange,
}: StatsCardProps) {
	const getTrendIcon = () => {
		switch (trend) {
			case 'up':
				return <TrendingUp className="h-4 w-4" />
			case 'down':
				return <TrendingDown className="h-4 w-4" />
			default:
				return <Minus className="h-4 w-4" />
		}
	}

	const getTrendColor = () => {
		if (variant !== 'default') {
			return 'bg-white/20 text-white border-white/30'
		}

		switch (trend) {
			case 'up':
				return 'bg-success-muted text-success border-success/30'
			case 'down':
				return 'bg-destructive/10 text-destructive border-destructive/30'
			default:
				return 'bg-muted text-muted-foreground border-border'
		}
	}

	const getVariantClasses = () => {
		switch (variant) {
			case 'indigo':
				return 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-indigo-500/20 shadow-indigo-500/20 shadow-lg'
			case 'green':
				return 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-emerald-500/20 shadow-emerald-500/20 shadow-lg'
			case 'blue':
				return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-500/20 shadow-blue-500/20 shadow-lg'
			case 'teal':
				return 'bg-gradient-to-br from-teal-400 to-cyan-600 text-white border-teal-500/20 shadow-teal-500/20 shadow-lg'
			case 'amber':
				return 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-500/20 shadow-amber-500/20 shadow-lg'
			default:
				return 'bg-card text-card-foreground border-border hover:shadow-md'
		}
	}

	const getSparklineColor = (): 'green' | 'orange' | 'blue' | 'white' => {
		if (variant !== 'default') return 'white'

		switch (trend) {
			case 'up':
				return 'green'
			case 'down':
				return 'orange'
			default:
				return 'blue'
		}
	}

	const handleCurrencyClick = (currencySymbol: string) => {
		if (onCurrencyChange) {
			onCurrencyChange(currencySymbol)
		}
	}

	return (
		<Card className={cn('w-full transition-all duration-200 border-none', getVariantClasses())}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="flex flex-row gap-2 items-center justify-between w-full mb-4">
					<CardTitle className={cn(
						"text-sm font-medium",
						variant === 'default' ? "text-muted-foreground" : "text-white/90"
					)}>
						{title}
					</CardTitle>
					{currencies && currencies.length > 0 && (
						<div className="flex gap-1">
							{currencies.map((currency) => (
								<Badge
									key={currency.symbol}
									variant={
										selectedCurrency === currency.symbol ? 'default' : 'outline'
									}
									className={cn(
										'cursor-pointer text-xs transition-colors',
										selectedCurrency === currency.symbol
											? variant === 'default' ? 'bg-primary text-primary-foreground' : 'bg-white text-primary'
											: variant === 'default' ? 'text-muted-foreground' : 'text-white hover:bg-white/20'
									)}
									onClick={() => handleCurrencyClick(currency.symbol)}
								>
									{currency.symbol}
								</Badge>
							))}
						</div>
					)}
				</div>
				{icon && <div className={cn(variant === 'default' ? "text-muted-foreground" : "text-white/80")}>{icon}</div>}
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between ">
					<div className="flex flex-col gap-2 flex-1">
						<div className="text-2xl font-bold">{value}</div>
						{change !== undefined && (
							<div className="flex items-center gap-1 mt-2">
								<Badge
									variant="outline"
									className={cn('text-xs font-semibold', getTrendColor())}
								>
									{getTrendIcon()}
									<span className="ml-1">
										{change > 0 ? '+' : ''}
										{change}%
									</span>
								</Badge>
							</div>
						)}
						{description && (
							<p className={cn(
								"text-xs mt-1",
								variant === 'default' ? "text-muted-foreground" : "text-white/70"
							)}>
								{description}
							</p>
						)}
					</div>

					{monthlyData && monthlyData.length > 0 && (
						<div className="flex items-center justify-end flex-1 ">
							<SparklineChart
								data={monthlyData}
								color={getSparklineColor()}
								height={80}
								width="100%"
							/>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
