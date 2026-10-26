export const PRODUCT_CREATE_ERROR = {
	DUPLICATE_NAME: 'DUPLICATE_NAME',
	COMPANY_NOT_FOUND: 'COMPANY_NOT_FOUND',
	COMPANY_INACTIVE: 'COMPANY_INACTIVE',
	NO_ACTIVE_LEVELS: 'NO_ACTIVE_LEVELS',
	CODE_TOO_LONG: 'CODE_TOO_LONG',
	DEFAULT_DISTRIBUTION_INCOMPLETE: 'DEFAULT_DISTRIBUTION_INCOMPLETE',
} as const

export type ProductCreateErrorCode =
	(typeof PRODUCT_CREATE_ERROR)[keyof typeof PRODUCT_CREATE_ERROR]

export class ProductCreateError extends Error {
	readonly code: ProductCreateErrorCode

	constructor(code: ProductCreateErrorCode, message: string) {
		super(message)
		this.name = 'ProductCreateError'
		this.code = code
	}
}

export function productCreateErrorStatus(error: ProductCreateError): number {
	if (error.code === PRODUCT_CREATE_ERROR.COMPANY_NOT_FOUND) {
		return 404
	}
	if (error.code === PRODUCT_CREATE_ERROR.DUPLICATE_NAME) {
		return 409
	}
	return 400
}
