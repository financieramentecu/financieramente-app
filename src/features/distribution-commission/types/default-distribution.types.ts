export interface DefaultDistributionLineView {
	readonly id: number
	readonly receiverLevelCode: string
	readonly receiverLevelName: string
	readonly percentage: number
}

export interface DefaultDistributionGroupView {
	readonly configLevelCode: string
	readonly configLevelName: string
	readonly lines: readonly DefaultDistributionLineView[]
}
