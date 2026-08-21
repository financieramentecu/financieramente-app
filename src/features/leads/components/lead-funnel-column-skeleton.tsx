/**
 * Loading placeholder shaped like a real `LeadFunnelColumnView` (same
 * header bar color as the sidebar, `#00505c`, for visual consistency)
 * instead of a generic pulsing block — previews the column structure while
 * the board fetches.
 */
export function LeadFunnelColumnSkeleton() {
	return (
		<div
			className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg border-2 border-[#00505c]/25 bg-[#00505c]/5"
			aria-hidden
		>
			<div className="flex items-center justify-between gap-2 border-b-2 border-[#00505c]/25 bg-[#00505c]/40 px-3 py-2.5">
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
