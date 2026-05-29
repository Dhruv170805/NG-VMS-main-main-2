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
    // /login redirects to / — wait for the redirect to complete
    await page.waitForURL('**/', { timeout: 10000 }).catch(() => {/* already on / */});
    // Wait for DOM to be ready — avoid networkidle which hangs when backend is offline
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // let React hydrate
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
