import { defineConfig } from '@playwright/test';

// Existing local stack only: never spawn npm dev with host staging env files.
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['r5.local.spec.mjs', 'r5.calendar.spec.mjs', 'r5.family-calendar.spec.mjs', 'r5.reminders.spec.mjs', 'r5.commercial.spec.mjs', 'r5.support.spec.mjs', 'r5.sessions.spec.mjs', 'r5.offline.spec.mjs', 'r5.conflicts.spec.mjs', 'r5.results.spec.mjs', 'r5.goals.spec.mjs', 'r5.goal-conflicts.spec.mjs', 'r5.dashboard.spec.mjs', 'r5.documents.spec.mjs', 'r5.family-documents.spec.mjs', 'r5.external-access.spec.mjs', 'r5.capture-conflicts.spec.mjs', 'r5.pwa-install.spec.mjs', 'r5.calendar-participants.spec.mjs', 'r5.session-lifecycle-v5.spec.mjs', 'r5.route-profiles.spec.mjs', 'r5.realtime-v5.spec.mjs', 'r5.auth-mail-v5.spec.mjs', 'r5.family-publications-v5.spec.mjs', 'r5.clinic-b-requests-v5.spec.mjs', 'r5.student-aux-v5.spec.mjs', 'r5.team-profile-v5.spec.mjs', 'r5.invite-email-v5.spec.mjs'],
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: `.aba.local/qa/playwright/${process.env.ABA_QA_OFFLINE_UI === '1' ? process.env.ABA_QA_BASE_URL === 'http://localhost:3001' ? 'offline-prod' : 'offline' : process.env.ABA_QA_REMINDERS_UI === '1' ? 'reminders' : process.env.ABA_QA_FAMILY_CALENDAR_UI === '1' ? 'family-calendar' : process.env.ABA_QA_SUPPORT_UI === '1' ? 'support' : process.env.ABA_QA_COMMERCIAL_UI === '1' ? 'commercial' : process.env.ABA_QA_FAMILY_DOCUMENTS_UI === '1' ? 'family-documents' : process.env.ABA_QA_DOCUMENTS_UI === '1' ? 'documents' : process.env.ABA_QA_GOAL_CONFLICT_UI === '1' ? 'goal-conflicts' : process.env.ABA_QA_DASHBOARD_UI === '1' ? 'dashboard' : process.env.ABA_QA_GOALS_UI === '1' ? 'goals' : process.env.ABA_QA_RESULTS_UI === '1' ? 'results' : process.env.ABA_QA_CONFLICT_UI === '1' ? 'conflicts' : process.env.ABA_QA_SESSION_UI === '1' ? 'sessions' : process.env.ABA_QA_CAPTURE_UI === '1' ? 'capture' : 'baseline'}`,
  reporter: 'line',
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  use: { baseURL: process.env.ABA_QA_BASE_URL ?? 'http://localhost:3000', channel: 'chrome', trace: 'off', video: 'off', screenshot: 'off' },
});
