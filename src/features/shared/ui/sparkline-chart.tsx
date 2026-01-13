'use client'

/**
 * Componente de gráfico sparkline simple usando SVG
 * Muestra una línea de tendencia con área degradada
 */

import { cn } from '@/lib/utils'

interface SparklineChartProps {
	data: number[]
	color?: 'orange' | 'green' | 'blue'
	height?: number | string
	width?: number | string
	className?: string
}

const COLORS = {
	orange: {
		stroke: '#F97316',
		fill: '#F97316',
	},
	green: {
		stroke: '#22C55E',
		fill: '#22C55E',
	},
	blue: {
		stroke: '#3B82F6',
		fill: '#3B82F6',
	},
}

// Dimensiones internas fijas para el viewBox del SVG
const VIEWBOX_WIDTH = 120
const VIEWBOX_HEIGHT = 48

/**
 * Gráfico sparkline simple con SVG
 *
 * @example
 * ```tsx
 * <SparklineChart
 *   data={[50, 60, 45, 80, 65, 90]}
 *   color="orange"
 *   width="100%"
 *   height={40}
 * />
 * ```
 */
export function SparklineChart({
	data,
	color = 'orange',
	height = 48,
	width = 120,
	className,
}: SparklineChartProps) {
	if (data.length === 0) {
		return null
	}

	const colorConfig = COLORS[color]
	const padding = 4

	// Calcular min/max para normalizar datos
	const max = Math.max(...data)
	const min = Math.min(...data)
	const range = max - min || 1

	// Calcular puntos para la línea usando dimensiones fijas del viewBox
	const points = data
		.map((value, i) => {
			const x =
				padding + (i / (data.length - 1)) * (VIEWBOX_WIDTH - padding * 2)
			const y =
				padding + ((max - value) / range) * (VIEWBOX_HEIGHT - padding * 2)
			return `${x},${y}`
		})
		.join(' ')

	// Crear path para el área degradada
	const areaPath = [
		`M ${padding},${VIEWBOX_HEIGHT - padding}`,
		...data.map((value, i) => {
			const x =
				padding + (i / (data.length - 1)) * (VIEWBOX_WIDTH - padding * 2)
			const y =
				padding + ((max - value) / range) * (VIEWBOX_HEIGHT - padding * 2)
			return `L ${x},${y}`
		}),
		`L ${VIEWBOX_WIDTH - padding},${VIEWBOX_HEIGHT - padding}`,
		'Z',
	].join(' ')

	const gradientId = `gradient-${color}-${Math.random().toString(36).substr(2, 9)}`

	return (
		<svg
			viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
			className={cn('shrink-0', className)}
			style={{ width, height }}
			preserveAspectRatio="none"
		>
			<defs>
				<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor={colorConfig.fill} stopOpacity={0.3} />
					<stop offset="100%" stopColor={colorConfig.fill} stopOpacity={0} />
				</linearGradient>
			</defs>

			{/* Área con degradado */}
			<path d={areaPath} fill={`url(#${gradientId})`} />

			{/* Línea */}
			<polyline
				fill="none"
				stroke={colorConfig.stroke}
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				points={points}
			/>
		</svg>
	)
}
