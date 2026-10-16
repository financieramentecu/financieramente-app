export class InvalidProductIdError extends Error {
	constructor(raw: string) {
		super(
			`ID de producto inválido: "${raw}". --product-id debe ser un entero mayor que 0.`
		)
		this.name = 'InvalidProductIdError'
	}
}

export interface RemediationCliArgs {
	readonly apply: boolean
	readonly productId?: number
	readonly operatorEmail?: string
}

/**
 * Reads remediation flags. A present --product-id must be a positive integer.
 * Missing or invalid values must not fall through to "all active products".
 */
export function parseRemediationArgs(argv: readonly string[]): RemediationCliArgs {
	const apply = argv.includes('--apply')
	const operatorArg = argv.find((arg) => arg.startsWith('--operator='))
	const productId = parseProductIdFlag(argv)

	return {
		apply,
		...(productId === undefined ? {} : { productId }),
		...(operatorArg
			? { operatorEmail: operatorArg.slice('--operator='.length) }
			: {}),
	}
}

function parseProductIdFlag(argv: readonly string[]): number | undefined {
	const bareFlag = argv.includes('--product-id')
	const productArg = argv.find((arg) => arg.startsWith('--product-id='))

	if (!bareFlag && !productArg) {
		return undefined
	}

	const raw = productArg?.slice('--product-id='.length) ?? ''
	if (!/^[1-9]\d*$/.test(raw)) {
		throw new InvalidProductIdError(raw)
	}

	return Number(raw)
}
