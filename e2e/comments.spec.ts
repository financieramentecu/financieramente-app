import { test, expect } from '@playwright/test'
import { mockAuth } from './fixtures/auth'

/**
 * E2E: contract comment thread — create -> appears in sidebar -> auto-open via
 * ?openComments=true deep link (the same URL shape used by the comment
 * notification's callbackUrl).
 *
 * NOTE: this suite covers the single-session flow (create + sidebar render +
 * auto-open). The cross-user notification round trip (recipient sees bell,
 * clicks it, sidebar opens/scrolls, notification marked read) reuses the
 * existing NotificationDrawer click-to-read behavior end-to-end and should be
 * validated manually/staging with two seeded users of different roles, since
 * it requires coordinating two authenticated browser contexts against a
 * shared negocio.
 */
test.describe('Contract comments', () => {
  test('agent opens the comments sidebar, adds a comment, and sees it in the thread', async ({ page }) => {
    await mockAuth(page, {
      email: 'agente@financieramentecu.com',
      name: 'Agente User',
      id: 'agente-e2e',
    })

    await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/dashboard\/negocios/)

    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await expect(page).toHaveURL(/\/dashboard\/negocios\/\d+/)

    await page.getByRole('button', { name: /comentarios/i }).click()
    await expect(page.getByText('Comentarios del negocio')).toBeVisible()

    const commentTitle = `E2E seguimiento ${Date.now()}`
    await page.getByLabel('Nombre del comentario').fill(commentTitle)
    await page.getByLabel('Detalle').fill('Comentario creado por la prueba e2e')
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(page.getByText(commentTitle)).toBeVisible({ timeout: 15000 })
  })

  test('deep link ?openComments=true auto-opens the sidebar', async ({ page }) => {
    await mockAuth(page, {
      email: 'analista@financieramentecu.com',
      name: 'Analista Soporte',
      id: 'analista-e2e',
    })

    await page.goto('/dashboard/negocios', { waitUntil: 'networkidle' })
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await expect(page).toHaveURL(/\/dashboard\/negocios\/\d+/)

    const url = new URL(page.url())
    await page.goto(`${url.pathname}?openComments=true`, { waitUntil: 'networkidle' })

    await expect(page.getByText('Comentarios del negocio')).toBeVisible({ timeout: 15000 })
  })
})
