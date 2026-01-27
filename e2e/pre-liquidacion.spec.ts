import { test, expect } from '@playwright/test'

test.describe('Pre-liquidación Flow', () => {
    // Increase timeout for slower environments (Webkit/Safari)
    test.setTimeout(120000);

    test.beforeEach(async ({ page }) => {
        // Log in first (assuming we can reuse login state or mock it)
        // Login as admin
        await page.goto('/login?superadmin=true', { waitUntil: 'domcontentloaded' })

        // Wait for hydration (critical for Webkit/Safari)
        await page.waitForTimeout(3000)

        // Explicitly wait for input to ensure page is interactive
        const emailInput = page.locator('input[type="email"]')
        await emailInput.waitFor({ state: 'visible' })

        await emailInput.fill('admin@financieramentecu.com')
        await expect(emailInput).toHaveValue('admin@financieramentecu.com')

        const passwordInput = page.locator('input[type="password"]')
        await passwordInput.fill('Admin123!')
        await expect(passwordInput).toHaveValue('Admin123!')

        // Wait for validation to complete and button to be enabled
        const submitButton = page.locator('button[type="submit"]')
        await expect(submitButton).toBeEnabled({ timeout: 15000 })
        await submitButton.click()

        // Wait for dashboard to load completely
        await page.waitForURL(/.*dashboard.*/)
        await page.locator('body').waitFor()

        // Wait for any potential redirect to settle (e.g. to /negocios)
        await page.waitForTimeout(2000)
    })

    test('should show files in LOAD status and allow pre-liquidation', async ({ page, isMobile }) => {
        if (isMobile) {
            test.skip();
        }
        // Mock the files API to ensure we have a file to process
        await page.route('/api/pre-liquidacion/archivos', async route => {
            const json = {
                archivos: [{
                    idFileImport: 999,
                    nombreArchivo: 'Test File E2E.xlsx',
                    fechaCarga: new Date().toISOString(),
                    totalRegistros: 10,
                    sincronizados: 5,
                    rezagados: 5,
                    estado: 'LOAD', // IMPORTANT
                    usuario: 'Admin'
                }],
                resumen: {
                    totalArchivos: 1,
                    totalRegistros: 10,
                    sincronizados: 5,
                    rezagados: 5
                }
            };
            await route.fulfill({ json });
        });

        // Mock the process API
        await page.route('/api/pre-liquidacion/procesar', async route => {
            const json = {
                success: true,
                registrosProcesados: 10,
                mensaje: 'Pre-liquidación completada'
            };
            await route.fulfill({ json });
        });

        // Navigate via Sidebar to avoid race conditions with internal redirects
        // Expand 'Liquidaciones' group
        await page.getByText('Liquidaciones').click()
        // Wait for animation/expansion
        await page.waitForTimeout(1000)
        // Click 'Preliquidación' link - Ensure it's visible first
        const preLiquidacionLink = page.getByText('Preliquidación')
        await expect(preLiquidacionLink).toBeVisible()
        await preLiquidacionLink.click()

        // Verify we are on the right page and file is visible
        await expect(page).toHaveURL(/.*pre-liquidacion/, { timeout: 20000 })
        await expect(page.locator('text=Test File E2E.xlsx')).toBeVisible()

        // Setup dialog handler to dismiss "Por favor selecciona un Mes..." alert
        page.on('dialog', async dialog => {
            console.log(`Alert message: ${dialog.message()}`);
            await dialog.dismiss();
        });

        // Try to click without filters (Should show alert)
        // Use specific selector for the action button in the table
        // Wait for the button to be attached and visible
        const preLiquidarBtn = page.locator('table').getByRole('button', { name: 'Pre-liquidar' })
        await preLiquidarBtn.waitFor()
        await preLiquidarBtn.click()

        // Set filters
        // Select Month (e.g., Enero)
        await page.locator('button[role="combobox"]').filter({ hasText: 'Mes' }).click();
        await page.getByRole('option', { name: 'Enero' }).click();

        // Select Year (e.g., current year)
        const currentYear = new Date().getFullYear().toString();
        await page.locator('button[role="combobox"]').filter({ hasText: 'Año' }).click();
        await page.getByRole('option', { name: currentYear }).click();

        // Click Pre-liquidar again (Valid)
        await preLiquidarBtn.click()

        // Modal should appear
        await expect(page.locator('text=Confirmar Pre-liquidación')).toBeVisible()

        // Confirm
        await page.click('button:has-text("Confirmar")')

        // Success message, increase timeout for slower environments
        await expect(page.locator('text=Pre-liquidación completada')).toBeVisible({ timeout: 20000 })
    })
})
