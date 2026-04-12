'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { getAppLocale } from '@/features/shared/lib/app-locale'
import {
	formatNumberForPercentInput,
	parsePercentPaste,
	normalizePercentPaste,
	getDecimalSeparator,
} from '@/features/shared/lib/format-percent'

export interface PercentageFieldProps
	extends Omit<
		React.ComponentProps<'input'>,
		'type' | 'value' | 'onChange' | 'onBlur'
	> {
	value: number | undefined
	onChange: (value: number | undefined) => void
	onBlur?: React.FocusEventHandler<HTMLInputElement>
	locale?: string
}

function sanitizeTyping(
	raw: string,
	decimalSep: string,
	maxFractionDigits: number
): string {
	let out = ''
	let sepSeen = false
	let frac = 0
	for (const ch of raw) {
		if (/\d/.test(ch)) {
			if (sepSeen) {
				if (frac >= maxFractionDigits) continue
				frac++
			}
			out += ch
			continue
		}
		if (ch === decimalSep) {
			if (!sepSeen) {
				out += decimalSep
				sepSeen = true
			}
			continue
		}
	}
	return out
}

export const PercentageField = React.forwardRef<
	HTMLInputElement,
	PercentageFieldProps
>(function PercentageField(
	{
		className,
		value,
		onChange,
		onBlur,
		locale = getAppLocale(),
		disabled,
		id,
		...rest
	},
	ref
) {
	const [text, setText] = React.useState(() =>
		value === undefined ? '' : formatNumberForPercentInput(value, locale)
	)

	React.useEffect(() => {
		if (value === undefined) {
			setText('')
		} else {
			setText(formatNumberForPercentInput(value, locale))
		}
	}, [value, locale])

	const decimalSep = getDecimalSeparator(locale)

	const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
		const trimmed = text.trim()
		if (trimmed === '') {
			onChange(undefined)
			setText('')
			onBlur?.(e)
			return
		}
		const n = parsePercentPaste(trimmed, locale)
		if (n === null || !Number.isFinite(n)) {
			onChange(undefined)
			setText(value === undefined ? '' : formatNumberForPercentInput(value, locale))
			onBlur?.(e)
			return
		}
		onChange(n)
		setText(formatNumberForPercentInput(n, locale))
		onBlur?.(e)
	}

	const handlePaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
		e.preventDefault()
		const pasted = e.clipboardData.getData('text')
		const normalized = normalizePercentPaste(pasted, locale)
		if (normalized === '') return
		const n = parsePercentPaste(pasted, locale)
		if (n !== null && Number.isFinite(n)) {
			setText(normalized)
			onChange(n)
		}
	}

	return (
		<div className="relative flex w-full items-center">
			<input
				{...rest}
				id={id}
				ref={ref}
				type="text"
				inputMode="decimal"
				disabled={disabled}
				autoComplete="off"
				className={cn(
					'border-input h-9 w-full min-w-0 rounded-md border bg-transparent py-1 pl-3 pr-8 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm',
					'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
					'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
					'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
					className
				)}
				value={text}
				onChange={(e) => {
					const next = sanitizeTyping(e.target.value, decimalSep, 4)
					setText(next)
					const trimmed = next.trim()
					if (trimmed === '') {
						onChange(undefined)
						return
					}
					const n = parsePercentPaste(trimmed, locale)
					if (n !== null && Number.isFinite(n)) {
						onChange(n)
					}
				}}
				onBlur={handleBlur}
				onPaste={handlePaste}
			/>
			<span
				className="pointer-events-none absolute right-3 text-sm text-muted-foreground"
				aria-hidden
			>
				%
			</span>
		</div>
	)
})

PercentageField.displayName = 'PercentageField'
