'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface ConfigurationDistributionStepperProps {
	readonly currentStep: 1 | 2
	readonly className?: string
}

const STEPS = [
	{ id: 1 as const, label: 'Configuración' },
	{ id: 2 as const, label: 'Distribución' },
]

/**
 * Two-step indicator for RF-11: product configuration → commission distribution.
 */
export function ConfigurationDistributionStepper({
	currentStep,
	className,
}: ConfigurationDistributionStepperProps) {
	return (
		<div
			className={cn(
				'flex w-full flex-col items-center text-center',
				className
			)}
		>
			<p className="text-muted-foreground mb-3 text-sm">
				Paso {currentStep} de 2
			</p>
			<nav
				aria-label="Progreso: configuración y distribución de comisiones"
				className="flex w-full justify-center"
			>
				<ol className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
					{STEPS.map((step, index) => {
						const isCurrent = currentStep === step.id
						const isDone = currentStep > step.id
						return (
							<li
								key={step.id}
								className="flex items-center gap-2 sm:gap-4"
								aria-current={isCurrent ? 'step' : undefined}
							>
								<div className="flex items-center gap-2">
									<span
										className={cn(
											'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
											isCurrent &&
												'border-primary bg-primary text-primary-foreground',
											isDone &&
												'border-primary bg-primary text-primary-foreground',
											!isCurrent &&
												!isDone &&
												'border-muted-foreground/40 text-muted-foreground'
										)}
									>
										{isDone ? (
											<Check className="h-4 w-4" aria-hidden />
										) : (
											<span>{step.id}</span>
										)}
									</span>
									<span
										className={cn(
											'text-sm font-medium',
											isCurrent && 'text-foreground',
											!isCurrent && 'text-muted-foreground'
										)}
									>
										{step.label}
									</span>
								</div>
								{index < STEPS.length - 1 && (
									<span
										className="bg-border hidden h-px w-6 shrink-0 sm:block"
										aria-hidden
									/>
								)}
							</li>
						)
					})}
				</ol>
			</nav>
		</div>
	)
}
