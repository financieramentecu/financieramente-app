import { Page } from '@playwright/test';

export const waitForPageLoad = async (page: Page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
};

export const getElementByTestId = (page: Page, testId: string) => {
  return page.locator(`[data-testid="${testId}"]`);
};
