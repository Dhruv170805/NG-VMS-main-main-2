import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Test tiers:
 *  - smoke/   → no backend needed (static pages only)
 *  - a11y/    → no backend needed (static pages only)
 *  - e2e/     → requires backend running on BACKEND_URL (default: http://localhost:5000)
 *
 * To run all tests (with backend):
 *   BACKEND_URL=http://localhost:5000 npx playwright test
 *
 * To run only smoke/a11y tests (no backend):
 *   npx playwright test tests/smoke tests/a11y
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Reasonable timeout so tests fail fast on missing backend rather than hanging
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
          ],
        },
      },
    },
    /*
     * WebKit and Firefox are commented out due to severe network download constraints
     * in the testing environment which prevented their browser binaries from installing.
     * Chromium is fully installed and verified.
     */
    /*
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    */
  ],

  webServer: {
    // next.config.js uses output: 'standalone' — cannot use "next start"
    // Use the standalone server directly when running the production build,
    // or fall back to dev server for local development.
    command: process.env.CI
      ? 'node .next/standalone/server.js'
      : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      // Point frontend at the backend for E2E tests
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:5000/api/v1`,
      NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000',
    },
  },
});
