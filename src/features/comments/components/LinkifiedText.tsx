import type { ReactNode } from 'react'
import { parseTextWithUrls } from '../lib/parse-text-with-urls'

interface LinkifiedTextProps {
	text: string
	className?: string
}

/**
 * Renders plain text with http(s)/www URLs as safe external links (new tab).
 */
export function LinkifiedText({ text, className }: LinkifiedTextProps) {
	const segments = parseTextWithUrls(text)
	const nodes: ReactNode[] = segments.map((segment, index) => {
		if (segment.type === 'text') {
			return <span key={index}>{segment.value}</span>
		}
		return (
			<a
				key={index}
				href={segment.href}
				target="_blank"
				rel="noopener noreferrer"
				className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 break-all"
			>
				{segment.value}
			</a>
		)
	})

	return <span className={className}>{nodes}</span>
}
