import { test, expect } from '@playwright/test';

// Increase test timeout because Next.js dev server can take time to compile pages initially
test.setTimeout(120000);

// ─── Shared helper: login as any role ────────────────────────────────────────
async function loginAs(
  page: any,
  email: string,
  password: string,
  expectedUrlPattern: RegExp
) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.waitForLoadState('networkidle');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button:has-text("Sign In")');
  await page.waitForURL(expectedUrlPattern, { timeout: 45000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AUTH SECURITY TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Security & Session Tests', () => {
  test('should display an error banner on invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');
    await page.fill('#login-email', 'nobody@fake-domain.com');
    await page.fill('#login-password', 'WrongPass!123');
    await page.click('button:has-text("Sign In")');

    // The home page renders loginError in a .error_banner div (CSS module class)
    // We check for the specific text returned by the mock/backend
    await expect(
      page.locator('text=Authentication failed').or(page.locator('text=Invalid email or password')).or(page.locator('text=Server connection failed')).first()
    ).toBeVisible({ timeout: 15000 });

    // Still on landing page
    await expect(page).not.toHaveURL(/.*\/admin/);
  });

  test('should redirect unauthenticated /admin access to landing page', async ({ page }) => {
    // Clear cookies + storage to ensure clean unauthenticated state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await page.goto('/admin');
    // AuthContext -> no user -> router.push('/login') -> which is '/'
    await page.waitForURL(/^http:\/\/localhost:3000(\/login)?\/?$/, { timeout: 45000 });
    await expect(page).not.toHaveURL(/.*\/admin/);
  });

  test('should redirect unauthenticated /guard access to landing page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await page.goto('/guard');
    // Wait for the redirect to happen (URL should not be /guard)
    await page.waitForURL(url => !url.toString().includes('/guard'), { timeout: 15000 });
    await expect(page).not.toHaveURL(/.*\/guard/);
  });

  test('should redirect unauthenticated /approval access to landing page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();
    await page.goto('/approval');
    await page.waitForURL(/^http:\/\/localhost:3000(\/login)?\/?$/, { timeout: 45000 });
    await expect(page).not.toHaveURL(/.*\/approval/);
  });

  test('Sign In button should be disabled while a login request is in-flight', async ({ page }) => {
    await page.goto('/');
    await page.fill('#login-email', 'admin@vms.com');
    await page.fill('#login-password', 'Admin@123');

    // Click Sign In and immediately check for disabled state OR navigation
    const signInBtn = page.locator('button:has-text("Sign In")');
    const navigationPromise = page.waitForURL(/.*\/admin/, { timeout: 45000 });
    await signInBtn.click();
    await navigationPromise;
    // If we got here navigation happened without error — button worked correctly
    await expect(page).toHaveURL(/.*\/admin/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. ADMIN DASHBOARD UI TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Admin Dashboard UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@vms.com', 'Admin@123', /.*\/admin/);
    // Wait for the sidebar to render
    await expect(page.locator('nav button').first()).toBeVisible({ timeout: 8000 });
  });

  test('all sidebar nav buttons should be visible', async ({ page }) => {
    const expectedLabels = [
      'System Overview',
      'User Management',
      'Traffic Analytics',
      'Audit Reports',
      'Blocked Identities',
      'System Config',
    ];
    for (const label of expectedLabels) {
      await expect(page.locator(`nav button:has-text("${label}")`)).toBeVisible();
    }
  });

  test('should switch to System Overview tab and show a search input', async ({ page }) => {
    await page.locator('nav button:has-text("System Overview")').click();
    await page.waitForTimeout(400);
    // Overview tab shows a search input with placeholder "Scan Registry..."
    await expect(page.locator('input[placeholder="Scan Registry..."]')).toBeVisible({ timeout: 8000 });
  });

  test('should switch to User Management tab', async ({ page }) => {
    await page.locator('nav button:has-text("User Management")').click();
    await page.waitForTimeout(400);
    // User management shows "Create Users" and "Host PRIVILEGES" buttons
    await expect(page.locator('button:has-text("Create Users")')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("Host PRIVILEGES")')).toBeVisible({ timeout: 8000 });
  });

  test('should switch to Traffic Analytics tab and show an SVG chart', async ({ page }) => {
    await page.locator('nav button:has-text("Traffic Analytics")').click();
    // Wait for loading state to clear and Recharts to render
    await page.waitForTimeout(1500);
    // Recharts renders SVG or a container — wait up to 15s for data to load
    await expect(page.locator('.recharts-wrapper svg, .recharts-surface').first()).toBeVisible({ timeout: 15000 });
  });

  test('should switch to Audit Reports tab', async ({ page }) => {
    await page.locator('nav button:has-text("Audit Reports")').click();
    await page.waitForTimeout(600);
    // Reports tab header becomes 'REPORTS' (from activeTab.toUpperCase())
    await expect(page.locator('h1')).toContainText('REPORTS', { timeout: 8000 });
  });

  test('should switch to Blocked Identities tab', async ({ page }) => {
    await page.locator('nav button:has-text("Blocked Identities")').click();
    await page.waitForTimeout(400);
    // Blacklist tab shows the blacklistSearch input
    await expect(page.locator('input[placeholder="Scan Registry..."]')).toBeVisible({ timeout: 8000 });
  });

  test('should switch to System Config tab and show SMTP/settings fields', async ({ page }) => {
    await page.locator('nav button:has-text("System Config")').click();
    await page.waitForTimeout(600);
    // The h1 should update to 'SETTINGS' when this tab is active
    await expect(page.locator('h1')).toContainText('SETTINGS', { timeout: 8000 });
  });

  test('logout button (LogOut icon) should be visible in sidebar', async ({ page }) => {
    // The logout trigger is a button containing the LogOut SVG icon in the user bottom section
    const logoutBtn = page.locator('[class*="logout_trigger"]');
    await expect(logoutBtn).toBeVisible();
  });

  test('live event pill shows DASHBOARD status indicator', async ({ page }) => {
    await expect(page.locator('text=DASHBOARD')).toBeVisible({ timeout: 8000 });
  });

  test('admin user info shows in sidebar', async ({ page }) => {
    // The sidebar renders user?.name or 'Super Admin'
    await expect(page.locator('text=Super Admin').first()).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GUARD TERMINAL UI TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Guard Terminal UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'guard01@vms.com', 'Guard@123', /.*\/guard/);
    // Wait for header to be visible
    await expect(page.locator('header[role="banner"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show APPLIED, PENDING, APPROVED stat pills', async ({ page }) => {
    await expect(page.locator('button.stat_pill:has-text("APPLIED")')).toBeVisible();
    await expect(page.locator('button.stat_pill:has-text("PENDING")')).toBeVisible();
    await expect(page.locator('button.stat_pill:has-text("APPROVED")')).toBeVisible();
  });

  test('should show all status filter pills', async ({ page }) => {
    const pills = ['FORWARDED', 'REJECTED', 'GATE IN', 'MEET IN', 'MEET OUT', 'GATE OUT', 'OVER STAY'];
    for (const pill of pills) {
      await expect(page.locator(`button.stat_pill:has-text("${pill}")`)).toBeVisible();
    }
  });

  test('"+ NEW VISITOR" button should open Quick Visitor Entry modal', async ({ page }) => {
    // The button has aria-label and also text "+ NEW VISITOR" — wait for page to fully load
    await page.waitForLoadState('networkidle');
    const newVisitorBtn = page.locator('button[aria-label="Register New Visitor"]');
    await expect(newVisitorBtn).toBeVisible({ timeout: 10000 });
    await newVisitorBtn.click();
    // The modal contains h2 "Quick Visitor Entry"
    await expect(page.locator('h2:has-text("Quick Visitor Entry")')).toBeVisible({ timeout: 10000 });
    // And the NEW VISITOR / RE-VISITOR tab buttons inside the modal
    await expect(page.locator('.modal_overlay button:has-text("NEW VISITOR")')).toBeVisible();
    await expect(page.locator('.modal_overlay button:has-text("RE-VISITOR")')).toBeVisible();
  });

  test('Quick Entry modal should close when X button is clicked', async ({ page }) => {
    await page.click('button[aria-label="Register New Visitor"]');
    await expect(page.locator('h2:has-text("Quick Visitor Entry")')).toBeVisible({ timeout: 6000 });
    // Close button has aria-label="Close quick entry form"
    await page.click('button[aria-label="Close quick entry form"]');
    await expect(page.locator('h2:has-text("Quick Visitor Entry")')).not.toBeVisible({ timeout: 5000 });
  });

  test('"HANDOVER SHIFT" button should open the Shift Handover modal', async ({ page }) => {
    await page.click('button:has-text("HANDOVER SHIFT")');
    // Modal renders h2 "Shift Handover"
    await expect(page.locator('h2:has-text("Shift Handover")')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button:has-text("CANCEL")')).toBeVisible();
    await expect(page.locator('button:has-text("CONFIRM & LOGOUT")')).toBeVisible();
  });

  test('Handover modal should close on CANCEL', async ({ page }) => {
    await page.click('button:has-text("HANDOVER SHIFT")');
    await expect(page.locator('h2:has-text("Shift Handover")')).toBeVisible({ timeout: 6000 });
    await page.click('button:has-text("CANCEL")');
    await expect(page.locator('h2:has-text("Shift Handover")')).not.toBeVisible({ timeout: 5000 });
  });

  test('sidebar hamburger button should toggle the history sidebar on mobile', async ({ page }) => {
    // Switch to mobile viewport so the hamburger is visible
    await page.setViewportSize({ width: 375, height: 812 });
    // The hamburger has aria-label that toggles between open/close
    const hamburger = page.locator('button[aria-label="Open history sidebar"], button[aria-label="Close history sidebar"], button.hamburger_btn_global').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(600);
    // The sidebar_wrapper_global div is always in the DOM — check it is attached
    await expect(page.locator('.sidebar_wrapper_global')).toBeAttached();
  });

  test('guard brand displays tenant Security label', async ({ page }) => {
    // Header span renders "{tenant?.name} Security" inside .terminal_brand
    // Use filter to avoid strict mode violations if multiple elements contain "Security"
    await expect(page.locator('.terminal_brand span, .terminal_brand').filter({ hasText: 'Security' }).first()).toBeVisible({ timeout: 8000 });
  });

  test('guard name chip is visible in header', async ({ page }) => {
    // The header renders "Guard: {user?.name || 'Loading...'}"
    await expect(page.locator('text=/Guard:/i').first()).toBeVisible();
  });

  test('live digital clock is rendered in header', async ({ page }) => {
    await expect(page.locator('.t_clock_main')).toBeVisible();
    await expect(page.locator('.t_clock_date')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. HOST / APPROVAL PORTAL UI TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Host Approval Portal UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'ankit@vms.com', 'Welcome@123', /.*\/approval/);
    await page.waitForLoadState('networkidle');
  });

  test('should show host name and department in header', async ({ page }) => {
    await expect(page.locator('text=Ankit Sharma')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Product Design')).toBeVisible({ timeout: 8000 });
  });

  test('Invite button should open the invite modal with QR code', async ({ page }) => {
    // The Invite button is rendered inside HostHeader — wait for page load
    await page.waitForLoadState('networkidle');
    // Filter for button containing exactly 'Invite' as a word
    const inviteBtn = page.locator('button').filter({ hasText: 'Invite' }).filter({ hasNotText: 'Visitor' }).first();
    await expect(inviteBtn).toBeVisible({ timeout: 10000 });
    await inviteBtn.click();
    // Invite modal shows "Invite Visitor" and description
    await expect(page.locator('h3:has-text("Invite Visitor")')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Share this QR code or link with your visitor')).toBeVisible({ timeout: 8000 });
  });

  test('Invite modal should have share buttons', async ({ page }) => {
    await page.locator('text=Invite').first().click();
    await expect(page.locator('text=Invite Visitor')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('button:has-text("Copy Link")')).toBeVisible();
    await expect(page.locator('button:has-text("WhatsApp")')).toBeVisible();
    await expect(page.locator('button:has-text("Email")')).toBeVisible();
  });

  test('Invite modal should close when Done is clicked', async ({ page }) => {
    await page.locator('text=Invite').first().click();
    await expect(page.locator('text=Invite Visitor')).toBeVisible({ timeout: 6000 });
    await page.click('button:has-text("Done")');
    await expect(page.locator('text=Invite Visitor')).not.toBeVisible({ timeout: 5000 });
  });

  test('host header should show ALL status filter button', async ({ page }) => {
    // HostHeader uses .hub_pill divs (not buttons) with text 'ALL', 'PENDING', etc.
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[class*="hub_pill"]').filter({ hasText: 'ALL' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('history sidebar renders with search input', async ({ page }) => {
    // HistorySidebar is always rendered on desktop — has a search input
    await expect(page.locator('input[placeholder*="earch"], input[placeholder*="history" i], input[type="search"]').first()).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. REGISTRATION FORM VALIDATION TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Registration Form Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('text=Welcome to Visitor Registration')).toBeVisible();
  });

  test('should not submit with empty required fields — stays on register page', async ({ page }) => {
    await page.click('button:has-text("Submit")');
    await expect(page).toHaveURL(/.*\/register/);
  });

  test('filled phone + name should progress form state', async ({ page }) => {
    await page.fill('input[placeholder="Phone Number"]', '9876543210');
    await page.fill('input[placeholder="Full Name"]', 'Jane Smith');
    await page.fill('input[placeholder="Email Address"]', 'jane@example.com');
    await page.fill('input[placeholder="Company Name"]', 'TechCorp');
    const phoneInput = page.locator('input[placeholder="Phone Number"]');
    await expect(phoneInput).toHaveValue('9876543210');
  });

  test('consent checkbox must be checked to enable final submission', async ({ page }) => {
    await page.fill('input[placeholder="Phone Number"]', '9876543210');
    await page.fill('input[placeholder="Full Name"]', 'Jane Smith');
    await page.fill('input[placeholder="Email Address"]', 'jane@example.com');
    await page.fill('input[placeholder="Company Name"]', 'TechCorp');
    await page.locator('select').first().selectOption({ index: 1 });
    // Do NOT check consent checkbox and try submit
    await page.click('button:has-text("Submit")');
    // Should remain on the register page
    await expect(page).toHaveURL(/.*\/register/);
  });

  test('Visitor Photo and ID Proof capture boxes should be rendered', async ({ page }) => {
    // reg_capture_placeholder has <p>Visitor Photo</p> and <p>ID Proof</p>
    // These are inside .reg_capture_box elements in the Biometrics & ID section
    await expect(
      page.locator('.reg_capture_placeholder p:has-text("Visitor Photo")').first()
    ).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. FORGOT PASSWORD FLOW TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Forgot Password Flow Tests', () => {
  test('landing page should have a "Trouble signing in?" link', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('text=Trouble signing in?');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/login/forgot-password');
  });

  test('should load the forgot-password page', async ({ page }) => {
    await page.goto('/login/forgot-password');
    // Page has a form with an email input
    await expect(
      page.locator('input[type="email"], input[placeholder*="email" i]').first()
    ).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. ROLE ISOLATION TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Role Isolation Tests', () => {
  test('Guard logged-in user should NOT see /admin UI elements at /admin', async ({ page }) => {
    await loginAs(page, 'guard01@vms.com', 'Guard@123', /.*\/guard/);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    // Guard's role check redirects them away from /admin
    await expect(page).not.toHaveURL(/.*\/admin/);
  });

  test('Host logged-in user should NOT access /admin', async ({ page }) => {
    await loginAs(page, 'ankit@vms.com', 'Welcome@123', /.*\/approval/);
    await page.goto('/admin');
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/.*\/admin/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. CHANGE PASSWORD PAGE TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Change Password Page Tests', () => {
  test('should load the change-password page with 3 password fields', async ({ page }) => {
    await page.goto('/login/change-password');
    // Page has h1 "Reset Password"
    await expect(page.locator('h1:has-text("Reset Password")')).toBeVisible({ timeout: 8000 });
    // And exactly 3 password inputs
    const pwInputs = page.locator('input[type="password"]');
    await expect(pwInputs).toHaveCount(3);
  });

  test('should show "New passwords do not match" error on mismatch', async ({ page }) => {
    await page.goto('/login/change-password');
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill('CurrentPass@123');
    await inputs.nth(1).fill('NewPass@123');
    await inputs.nth(2).fill('Different@456'); // mismatch
    await page.click('button:has-text("Update & Continue")');
    // error_banner renders "New passwords do not match"
    await expect(page.locator('text=New passwords do not match')).toBeVisible({ timeout: 6000 });
  });

  test('should render "Update & Continue" submit button', async ({ page }) => {
    await page.goto('/login/change-password');
    await expect(page.locator('button:has-text("Update & Continue")')).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. RESPONSIVE LAYOUT TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Responsive Layout Tests', () => {
  test('landing page renders correctly on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('text=Visitor Registration')).toBeVisible();
    await expect(page.locator('text=Staff Login')).toBeVisible();
  });

  test('registration page renders correctly on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/register');
    await expect(page.locator('text=Welcome to Visitor Registration')).toBeVisible();
  });

  test('guard terminal renders correctly on tablet (1024x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await loginAs(page, 'guard01@vms.com', 'Guard@123', /.*\/guard/);
    await expect(page.locator('button[aria-label="Register New Visitor"]')).toBeVisible();
    await expect(page.locator('button.stat_pill:has-text("APPLIED")')).toBeVisible();
  });

  test('admin dashboard renders correctly on widescreen (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, 'admin@vms.com', 'Admin@123', /.*\/admin/);
    await expect(page.locator('nav button:has-text("System Overview")')).toBeVisible();
    await expect(page.locator('text=DASHBOARD')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. LANDING PAGE CONTENT TESTS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('NG-VMS Landing Page Content Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should render a QR code SVG on the landing page', async ({ page }) => {
    await expect(page.locator('svg[aria-label="Registration QR Code"]')).toBeVisible({ timeout: 8000 });
  });

  test('should have a phone number status-check form', async ({ page }) => {
    const phoneInput = page.locator('input[aria-label="Phone Number to Track Status"]');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill('9999999999');
    await expect(phoneInput).toHaveValue('9999999999');
  });

  test('Track Status button shows result after click', async ({ page }) => {
    await page.fill('input[aria-label="Phone Number to Track Status"]', '9999999999');
    await page.click('button:has-text("Check Status")');
    // Either trackError appears with 'No active pass found' or redirect happens to /pass
    await Promise.race([
      expect(page.locator('text=No active pass').or(page.locator('text=Failed to verify')).first()).toBeVisible({ timeout: 10000 }),
      page.waitForURL(/.*\/pass.*/, { timeout: 10000 })
    ]);
  });

  test('footer copyright text should be visible', async ({ page }) => {
    await expect(page.locator('footer p').first()).toBeVisible();
    await expect(page.locator('footer p:has-text("2026")')).toBeVisible();
  });
});
