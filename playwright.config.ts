import { defineConfig } from '@playwright/test';

// The port is configurable so the suite runs when 3000 is already taken.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';
const port = new URL(baseURL).port || '3000';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'public.spec.ts',
  fullyParallel: false,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    // Playwright's bundled Chromium by default; set PLAYWRIGHT_CHANNEL=chrome
    // to reuse a system Chrome instead.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
