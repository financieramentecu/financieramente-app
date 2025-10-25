export const waitForPageLoad = async (page: any) => {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
};

export const getElementByTestId = (page: any, testId: string) => {
  return page.locator(`[data-testid="${testId}"]`);
};
