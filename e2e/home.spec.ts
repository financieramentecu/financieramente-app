import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load and display content', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Financieramente/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should navigate using links', async ({ page }) => {
    await page.goto('/');

    // Test navigation - buscar un link existente en la página
    const link = page.locator('a').first();
    if ((await link.count()) > 0) {
      await link.click();
      // Verificar que se navegó
      await expect(page).not.toHaveURL('/');
    }
  });
});
