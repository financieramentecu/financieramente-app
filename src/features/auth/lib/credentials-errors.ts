import { CredentialsSignin } from 'next-auth'
import { RATE_LIMITED_CODE } from './credentials-error-codes'

/**
 * Thrown by `authorize` when the credentials rate limit is exceeded. Server
 * only: client code must import the constants from `credentials-error-codes`.
 */
export class CredentialsRateLimitedError extends CredentialsSignin {
	code = RATE_LIMITED_CODE
}
