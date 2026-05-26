import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const stabilizePage = async (page: any) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: -1s !important;
        animation-duration: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `
  });
};

test.describe('NG-VMS Accessibility Tests', () => {
  test('landing page accessibility check', async ({ page }) => {
    await page.goto('/');
    await stabilizePage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test('login page accessibility check', async ({ page }) => {
    await page.goto('/login');
    await page.waitForURL('**/');
    await page.waitForLoadState('networkidle');
    await stabilizePage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test('register page accessibility check', async ({ page }) => {
    await page.goto('/register');
    await stabilizePage(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
