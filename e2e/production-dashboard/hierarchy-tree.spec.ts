import { test, expect } from '@playwright/test'
import { mockAuth } from '../fixtures/auth'

const HIERARCHY_TREE_API = '**/api/production-dashboard/hierarchy-tree'

const MOCK_NODES_RESPONSE = {
	data: {
		nodes: [
			{
				userId: 1,
				fullName: 'MIA User',
				levelCode: 'MIA',
				levelName: 'MIA',
				levelColor: '#FF0000',
				included: true,
				children: [
					{
						userId: 2,
						fullName: 'Team Leader',
						levelCode: 'TL',
						levelName: 'Team Leader',
						levelColor: '#00FF00',
						included: true,
						children: [],
					},
				],
			},
		],
	},
	error: null,
}

const EMPTY_NODES_RESPONSE = {
	data: { nodes: [] },
	error: null,
}

/**
 * E2E Spec: Production Dashboard — Hierarchy Filter Tree
 *
 * Scenario (a): Authenticated user navigates to /dashboard and sees shell (not redirect)
 * Scenario (b): MS Junior user — hierarchy panel not rendered (empty nodes)
 * Scenario (c): Non-MS-Junior user — hierarchy panel visible with tree nodes
 *
 * NOTE: These tests require a running dev server. If no server is available,
 * tests are skipped via the `webServer` config in playwright.config.ts.
 */
test.describe('Production Dashboard — Hierarchy Filter Tree', () => {
	test('(a) authenticated user navigates to /dashboard and sees shell — not a redirect', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'admin@financieramentecu.com',
			name: 'Admin User',
			id: 'admin-e2e',
		})

		// Mock hierarchy tree API to return some nodes so the panel renders
		await page.route(HIERARCHY_TREE_API, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(MOCK_NODES_RESPONSE),
			})
		})

		await page.goto('/dashboard', { waitUntil: 'networkidle' })

		// Shell renders at /dashboard — no redirect to /dashboard/negocios or /dashboard/agente
		await expect(page).toHaveURL('/dashboard', { timeout: 15000 })

		// Page is the shell, not a redirect-only page — some content is present
		await page.waitForLoadState('networkidle', { timeout: 15000 })
		await expect(page.locator('body')).not.toBeEmpty()
	})

	test('(b) MS Junior user — hierarchy tree panel is NOT rendered', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'msjunior@financieramentecu.com',
			name: 'MS Junior User',
			id: 'msjunior-e2e',
		})

		// API returns empty nodes for MS Junior — panel should be hidden
		await page.route(HIERARCHY_TREE_API, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(EMPTY_NODES_RESPONSE),
			})
		})

		await page.goto('/dashboard', { waitUntil: 'networkidle' })
		await expect(page).toHaveURL('/dashboard', { timeout: 15000 })

		// Panel is not rendered when nodes is empty — the nav element should not exist
		await expect(
			page.locator('[aria-label="Filtro de jerarquía"]')
		).toHaveCount(0, { timeout: 10000 })
	})

	test('(c) non-MS-Junior user — hierarchy tree panel visible with tree nodes', async ({
		page,
	}) => {
		await mockAuth(page, {
			email: 'mia@financieramentecu.com',
			name: 'MIA User',
			id: 'mia-e2e',
		})

		// API returns populated nodes for MIA user
		await page.route(HIERARCHY_TREE_API, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(MOCK_NODES_RESPONSE),
			})
		})

		await page.goto('/dashboard', { waitUntil: 'networkidle' })
		await expect(page).toHaveURL('/dashboard', { timeout: 15000 })

		// Hierarchy tree panel renders with the tree navigation
		await expect(
			page.locator('[aria-label="Filtro de jerarquía"]')
		).toBeVisible({ timeout: 15000 })

		// Tree nodes are visible — each node has a checkbox (role="checkbox")
		await expect(page.getByRole('checkbox')).toHaveCount(
			MOCK_NODES_RESPONSE.data.nodes.length +
				MOCK_NODES_RESPONSE.data.nodes[0].children.length,
			{ timeout: 10000 }
		)
	})
})
