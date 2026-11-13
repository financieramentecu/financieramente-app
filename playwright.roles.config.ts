import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

/**
 * Standalone config for the roles/skeleton e2e specs. It deliberately has NO
 * globalSetup: the project setup writes users to the development database.
 * It reuses a running dev server and logs in through the real login form.
 */
export default defineConfig({
	testDir: './e2e/roles',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 180000,
	expect: { timeout: 90000 }, // first hit of a route compiles on the dev server
	reporter: [['list']],
	use: {
		baseURL: process.env.BASE_URL || 'http://localhost:3000',
		navigationTimeout: 90000,
		actionTimeout: 30000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/,
			use: { ...devices['Desktop Chrome'], channel: 'chrome' },
		},
		{
			name: 'chrome',
			// Uses the locally installed Google Chrome (no browser download needed).
			use: {
				...devices['Desktop Chrome'],
				channel: 'chrome',
				storageState: 'e2e/.auth/admin.json',
			},
			dependencies: ['setup'],
			testIgnore: /auth\.setup\.ts/,
		},
	],
})
