export interface PolicyholderSearchResult {
	idPolicyholder: number
	name: string
	lastName: string
	typeIdentity: string
	identityNumber: string
	email: string
	phone: string
}

export interface PolicyholderInput {
	typeIdentity: string
	identityNumber: string
	email: string
	name: string
	lastName: string
	phone: string
}

export interface PolicyholderUpsertResult {
	idPolicyholder: number
	created: boolean
}
