export const LEAD_LINK_SIDES = {
	INCOMING: 'incoming',
	RELATED: 'related',
} as const

export type LeadLinkSide = (typeof LEAD_LINK_SIDES)[keyof typeof LEAD_LINK_SIDES]

export const LEAD_LINK_SOURCES = {
	AUTO: 'AUTO',
	MANUAL: 'MANUAL',
} as const

export type LeadLinkSourceName = (typeof LEAD_LINK_SOURCES)[keyof typeof LEAD_LINK_SOURCES]

/** One row of the person link, as the open lead sees it. */
export interface LeadRelationSummary {
	idLeadLink: number
	otherLeadId: number
	otherName: string
	originName: string
	side: LeadLinkSide
	source: LeadLinkSourceName
	linkedAt: string
}

export interface LeadCandidate {
	idLead: number
	name: string
	email: string | null
	phone: string | null
	originTag: string | null
}
