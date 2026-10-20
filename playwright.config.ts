import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Public routes run here; authenticated coverage uses playwright.local.config.ts.
  testMatch: 'public.spec.ts',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
