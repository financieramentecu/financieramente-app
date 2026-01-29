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
		switch (trend) {
			case 'up':
				return 'bg-success-muted text-success border-success/30'
			case 'down':
				return 'bg-destructive/10 text-destructive border-destructive/30'
			default:
				return 'bg-muted text-muted-foreground border-border'
		}
	}

	const getSparklineColor = (): 'green' | 'orange' | 'blue' => {
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
		<Card className="w-full">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<div className="flex flex-row gap-2 items-center justify-between w-full mb-4">
					<CardTitle className="text-sm font-medium text-muted-foreground">
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
											? 'bg-primary text-primary-foreground hover:bg-primary/90'
											: 'text-muted-foreground hover:bg-muted hover:text-foreground'
									)}
									onClick={() => handleCurrencyClick(currency.symbol)}
								>
									{currency.symbol}
								</Badge>
							))}
						</div>
					)}
				</div>
				{icon && <div className="text-muted-foreground">{icon}</div>}
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between ">
					<div className="flex flex-col gap-2 flex-1">
						<div className="text-2xl font-bold">{value}</div>
						{change !== undefined && (
							<div className="flex items-center gap-1 mt-2">
								<Badge
									variant="outline"
									className={cn('text-xs', getTrendColor())}
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
							<p className="text-xs text-muted-foreground mt-1">
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
