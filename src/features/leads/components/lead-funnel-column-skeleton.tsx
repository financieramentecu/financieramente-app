/**
 * Loading placeholder shaped like a real `LeadFunnelColumnView`.
 * The header uses the brand primary so the skeleton matches the board.
 */
export function LeadFunnelColumnSkeleton() {
	return (
		<div
			className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-primary/25 bg-primary/5"
			aria-hidden
		>
			<div className="flex items-center justify-between gap-2 border-b-2 border-primary/25 bg-primary/40 px-3 py-2.5">
				<div className="h-4 w-24 animate-pulse rounded bg-white/50" />
				<div className="h-5 w-6 shrink-0 animate-pulse rounded-full bg-white/50" />
			</div>
			<div className="flex flex-col gap-2 p-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<div
						key={index}
						className="h-20 animate-pulse rounded-lg border border-border bg-muted/40"
					/>
				))}
			</div>
		</div>
	)
}
