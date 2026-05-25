import { test, expect } from '@playwright/test';

test.describe('NG-VMS Multi-Role Portal Authentication & Navigation Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Log browser console messages to the test output
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    // Log page errors
    page.on('pageerror', err => {
      console.log(`[BROWSER PAGE ERROR]: ${err.message}`);
    });

    // Navigate to landing page, clear local storage to ensure fresh login state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('Super Admin role: login and navigate to Admin Dashboard', async ({ page }) => {
    await page.fill('#login-email', 'admin@vms.com');
    await page.fill('#login-password', 'Admin@123');
    await page.click('button:has-text("Sign In")');

    // Wait for redirect to Admin Dashboard
    await page.waitForURL('**/admin');
    await expect(page).toHaveURL(/.*\/admin/);

    // Verify Admin Dashboard specific components
    await expect(page.locator('text=System Overview')).toBeVisible();
    await expect(page.locator('text=User Management')).toBeVisible();
    await expect(page.locator('text=Traffic Analytics')).toBeVisible();
    await expect(page.locator('text=Audit Reports')).toBeVisible();
    await expect(page.locator('text=Blocked Identities')).toBeVisible();
    await expect(page.locator('text=System Config')).toBeVisible();

    // Verify user profile footer
    await expect(page.locator('text=Super Admin')).toBeVisible();
    await expect(page.locator('text="ADMIN"')).toBeVisible();
  });

  test('Security Guard role: login and navigate to Guard Operational Terminal', async ({ page }) => {
    await page.fill('#login-email', 'guard01@vms.com');
    await page.fill('#login-password', 'Guard@123');
    await page.click('button:has-text("Sign In")');

    // Wait for redirect to Guard Operational Terminal
    await page.waitForURL('**/guard');
    await expect(page).toHaveURL(/.*\/guard/);

    // Verify Guard Terminal UI
    await expect(page.locator('text=Security').first()).toBeVisible();
    await expect(page.locator('text=Security Guard 01').first()).toBeVisible();
    await expect(page.locator('text=NEW VISITOR')).toBeVisible();
    await expect(page.locator('text=END SHIFT')).toBeVisible();

    // Verify stats header counters
    await expect(page.locator('text=APPLIED')).toBeVisible();
    await expect(page.locator('text=PENDING')).toBeVisible();
    await expect(page.locator('text=APPROVED')).toBeVisible();
  });

  test('Staff/Host role: login and navigate to Visitor Approval Portal', async ({ page }) => {
    await page.fill('#login-email', 'ankit@vms.com');
    await page.fill('#login-password', 'Welcome@123');
    await page.click('button:has-text("Sign In")');

    // Wait for redirect to Visitor Approval Portal
    await page.waitForURL('**/approval');
    await expect(page).toHaveURL(/.*\/approval/);

    // Verify Host Approval Dashboard specific elements
    await expect(page.locator('text=Ankit Sharma')).toBeVisible();
    await expect(page.locator('text=Product Design')).toBeVisible();
    await expect(page.locator('text=Invite').first()).toBeVisible();
  });
});
