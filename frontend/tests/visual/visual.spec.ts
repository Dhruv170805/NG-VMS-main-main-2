import { test, expect } from '@playwright/test';

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
      .circle, .circle_1, .circle_2, .circle_3, .hud_scanline, .scanning_line, .qr_bg_glow {
        display: none !important;
      }
    `
  });
};

test.describe('NG-VMS Visual Regression Tests', () => {
  test('landing page visual snapshot', async ({ page }) => {
    await page.goto('/');
    await stabilizePage(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('landing-page.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('login page visual snapshot', async ({ page }) => {
    await page.goto('/login');
    await page.waitForURL('**/');
    await stabilizePage(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.1,
    });
  });

  test('register page visual snapshot', async ({ page }) => {
    await page.goto('/register');
    await stabilizePage(page);
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('register-page.png', {
      maxDiffPixelRatio: 0.1,
    });
  });
});
