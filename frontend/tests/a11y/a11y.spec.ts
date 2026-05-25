import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('NG-VMS Accessibility Tests', () => {
  test('landing page accessibility check', async ({ page }) => {
    await page.goto('/');
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
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const seriousOrCritical = results.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
