import { test, expect } from '@playwright/test';

test.describe('NG-VMS Critical User Journey (CUJ)', () => {
  test('Visitor flow: register, capture biometrics, and submit registration successfully', async ({ page }) => {
    // 1. Go to register page
    await page.goto('/register');
    await expect(page.locator('text=Welcome to Visitor Registration')).toBeVisible();

    // 2. Fill Identity details
    await page.fill('input[placeholder="Phone Number"]', '9999999999');
    await page.fill('input[placeholder="Full Name"]', 'John Doe');
    await page.fill('input[placeholder="Email Address"]', 'john.doe@example.com');
    await page.fill('input[placeholder="Company Name"]', 'Acme Corporation');

    // 3. Fill Logistics/Visit details
    // Select first available purpose and host
    await page.locator('select').first().selectOption({ index: 1 });
    await page.locator('select').nth(1).selectOption({ index: 0 });

    // 4. Biometrics and ID capture
    await page.waitForTimeout(1000);

    // If ID Proof capture box is visible (Aadhaar feature disabled), capture it
    const idProofBox = page.locator('.reg_capture_box:has-text("ID Proof")');
    if (await idProofBox.isVisible()) {
      await idProofBox.click();
      await page.waitForTimeout(500);
      await page.click('button:has-text("Capture")');
      await page.waitForTimeout(500);
    }

    // Switch to Visitor Photo capture
    await page.click('text=Visitor Photo');
    await page.waitForTimeout(500);

    // Capture Visitor Photo
    await page.click('button:has-text("Capture")');
    await page.waitForTimeout(500);

    // Select PAN Card as the ID Type
    await page.locator('div.reg_field:has-text("ID TYPE") select').selectOption('PAN');
    await page.waitForTimeout(500);

    // Enter PAN ID Number
    await page.fill('input[placeholder="Enter ID Number"]', 'ABCDE1234F');

    // 5. Consent checkbox
    await page.check('input[type="checkbox"]');

    // 6. Submit the form
    await page.click('button:has-text("Submit")');

    // 7. Verify registration success screen shows the success message and QR code
    await expect(page.locator('text=Your visit request has been sent')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=View My Digital Pass')).toBeVisible({ timeout: 15000 });
  });
});
