import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
	output: 'standalone',
	outputFileTracingRoot: __dirname,
	outputFileTracingIncludes: {
		'/': ['./prisma/**/*'],
	},

	// External packages for server components
	serverExternalPackages: ['@prisma/client'],

	// Skip type checking and ESLint during build (already done in CI/CD tests)
	// This reduces build time and memory usage in resource-constrained environments
	typescript: {
		// Always ignore build errors in Docker builds (type checking done in CI)
		ignoreBuildErrors: true,
	},
	eslint: {
		// Always ignore ESLint during builds (linting done in CI)
		ignoreDuringBuilds: true,
	},

	// Environment variables
	env: {
		CUSTOM_KEY: process.env.CUSTOM_KEY,
	},

	// Headers for security
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'Referrer-Policy',
						value: 'origin-when-cross-origin',
					},
				],
			},
		]
	},
}

export default nextConfig
