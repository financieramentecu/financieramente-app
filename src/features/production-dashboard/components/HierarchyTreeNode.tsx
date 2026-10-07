'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useHierarchySelection } from '@/features/production-dashboard/components/HierarchySelectionContext'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/features/shared/ui/tooltip'
import type { HierarchyNode } from '@/features/production-dashboard/types/hierarchy.types'

const GREEN = '#003c45'
const GREEN_MUTED = 'rgba(0,60,69,0.35)'
const GREEN_HOVER = 'rgba(0,60,69,0.06)'
const GREEN_BORDER = 'rgba(0,60,69,0.15)'

function getInitials(fullName: string): string {
	const parts = fullName.trim().split(/\s+/)
	if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
	return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

type HierarchyTreeNodeProps = {
	node: HierarchyNode
	depth?: number
	/** Category IDs from filter context — non-matching nodes are dimmed */
	activeCategoryIds?: number[]
}

export function HierarchyTreeNode({
	node,
	depth = 0,
	activeCategoryIds = [],
}: HierarchyTreeNodeProps) {
	const isCategoryDimmed =
		activeCategoryIds.length > 0 &&
		node.idCategory !== null &&
		!activeCategoryIds.includes(node.idCategory)
	const hasChildren = node.children.length > 0
	const [isExpanded, setIsExpanded] = useState(true)
	const { toggle } = useHierarchySelection()

	const isIndeterminate =
		hasChildren &&
		node.children.some((c) => c.included) &&
		node.children.some((c) => !c.included)

	const initials = getInitials(node.fullName)
	const isActive = node.included

	return (
		<li className="select-none">
			<div
				className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-150 cursor-pointer"
				onMouseEnter={(e) =>
					((e.currentTarget as HTMLDivElement).style.backgroundColor = GREEN_HOVER)
				}
				onMouseLeave={(e) =>
					((e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent')
				}
			>
				{/* Chevron expand/collapse */}
				{hasChildren ? (
					<button
						type="button"
						aria-label={`${isExpanded ? 'Contraer' : 'Expandir'} ${node.fullName}`}
						aria-expanded={isExpanded}
						onClick={() => setIsExpanded((prev) => !prev)}
						className="flex size-4 shrink-0 items-center justify-center rounded transition-colors"
						style={{ color: GREEN_MUTED }}
					>
						{isExpanded ? (
							<ChevronDown className="size-3.5" />
						) : (
							<ChevronRight className="size-3.5" />
						)}
					</button>
				) : (
					<span className="size-4 shrink-0" aria-hidden="true" />
				)}

				{/* Checkbox */}
				<input
					type="checkbox"
					id={`node-${node.userId}`}
					aria-label={`Incluir a ${node.fullName} en el filtro`}
					checked={node.included}
					ref={(el) => {
						if (el) el.indeterminate = isIndeterminate
					}}
					onChange={() => toggle(node.userId)}
					className="size-3.5 shrink-0 cursor-pointer rounded-sm accent-primary"
				/>

				{/* Avatar + name + badge — wrapped in Tooltip */}
				<Tooltip>
					<TooltipTrigger asChild>
						<label
							htmlFor={`node-${node.userId}`}
							className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
							style={{ opacity: isCategoryDimmed ? 0.3 : isActive ? 1 : 0.45 }}
						>
							{/* Initials avatar */}
							<span
								className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
								style={{
									backgroundColor: node.levelColor + '22',
									color: node.levelColor,
									border: `1.5px solid ${node.levelColor}44`,
								}}
								aria-hidden="true"
							>
								{initials}
							</span>

							{/* Name + category column */}
							<span className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span
									className="truncate leading-tight"
									style={{
										fontSize: depth === 0 ? '13px' : '12px',
										fontWeight: depth === 0 ? 600 : 500,
										color: GREEN,
										textDecoration: isActive ? 'none' : 'line-through',
									}}
								>
									{node.fullName}
								</span>

								{node.categoryName && (
									<span
										className="truncate text-[10px] font-medium leading-none"
										style={{ color: node.levelColor }}
									>
										{node.categoryName}
									</span>
								)}
							</span>

							{/* Level color dot */}
							<span
								className="size-2 shrink-0 rounded-full"
								style={{ backgroundColor: node.levelColor }}
								aria-hidden="true"
							/>
						</label>
					</TooltipTrigger>

					<TooltipContent side="right" className="flex flex-col gap-1">
						<span className="font-semibold" style={{ color: GREEN }}>
							{node.fullName}
						</span>
						{node.categoryName && (
							<span
								className="text-[10px] font-medium uppercase tracking-wide"
								style={{ color: node.levelColor }}
							>
								{node.categoryName}
							</span>
						)}
					</TooltipContent>
				</Tooltip>
			</div>

			{/* Children */}
			{hasChildren && isExpanded && (
				<ul
					className="ml-5 mt-0.5 space-y-px pl-2"
					style={{ borderLeft: `1.5px solid ${GREEN_BORDER}` }}
					role="group"
					aria-label={`Subordinados de ${node.fullName}`}
				>
					{node.children.map((child) => (
						<HierarchyTreeNode
							key={child.userId}
							node={child}
							depth={depth + 1}
							activeCategoryIds={activeCategoryIds}
						/>
					))}
				</ul>
			)}
		</li>
	)
}
