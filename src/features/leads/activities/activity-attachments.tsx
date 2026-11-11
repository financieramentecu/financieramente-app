'use client'

import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from '@/features/shared/ui/dialog'
import {
	isActivityImage,
	readActivityAttachments,
	type LeadActivityAttachment,
} from '@/features/leads/activities/lead-activity-attachment'
import type { TimelineActivityDto } from '@/features/leads/activities/lead-timeline.types'

function fileUrl(leadId: number, activityId: number, index: number): string {
	return `/api/leads/${leadId}/activities/${activityId}/files/${index}`
}

export function ActivityAttachments({
	leadId,
	entry,
}: {
	leadId: number
	entry: TimelineActivityDto
}) {
	const attachments = readActivityAttachments(entry.payload)
	const [preview, setPreview] = useState<number | null>(null)
	if (attachments.length === 0) return null
	const open = preview !== null ? attachments[preview] : null

	return (
		<>
			<ul className="mt-2 flex flex-wrap gap-2">
				{attachments.map((file, index) => (
					<li key={`${file.key}-${index}`}>
						{isActivityImage(file.mimeType) ? (
							<button
								type="button"
								className="block overflow-hidden rounded-md border border-border"
								aria-label={`Ampliar ${file.name}`}
								onClick={() => setPreview(index)}
							>
								<img
									src={fileUrl(leadId, entry.idLeadActivity, index)}
									alt={file.name}
									className="h-16 w-16 object-cover"
								/>
							</button>
						) : (
							<a
								href={fileUrl(leadId, entry.idLeadActivity, index)}
								download={file.name}
								className="text-sm text-primary underline-offset-2 hover:underline"
							>
								Descargar {file.name}
							</a>
						)}
					</li>
				))}
			</ul>
			<Dialog open={open !== null} onOpenChange={(next) => !next && setPreview(null)}>
				<DialogContent className="max-w-3xl">
					<DialogTitle>{open?.name ?? 'Archivo'}</DialogTitle>
					{open && preview !== null && (
						<img
							src={fileUrl(leadId, entry.idLeadActivity, preview)}
							alt={open.name}
							className="max-h-[70vh] w-full object-contain"
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	)
}

export type { LeadActivityAttachment }
