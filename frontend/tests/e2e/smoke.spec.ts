import { test, expect } from '@playwright/test';

test.describe('NG-VMS Smoke Tests', () => {
  test('should load the landing page successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NG-VMS/i);
    // Verify key landing page components exist
    await expect(page.locator('text=Visitor Registration')).toBeVisible();
    await expect(page.locator('text=Staff Login')).toBeVisible();
  });

  test('should load the register page successfully', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('text=Welcome to Visitor Registration')).toBeVisible();
  });

  test('should load the login page successfully', async ({ page }) => {
    await page.goto('/login');
    // LoginPage redirects to root '/'
    await expect(page).toHaveURL(/http:\/\/localhost:3000\/?$/);
    await expect(page.locator('text=Staff Login')).toBeVisible();
  });

  test('should load the pass page structure', async ({ page }) => {
    await page.goto('/pass');
    await expect(page.locator('body')).toBeVisible();
  });
});
