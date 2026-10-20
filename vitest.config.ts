import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.{ts,tsx,mjs}', 'tests/database/**/*.test.ts',
            'tests/local/calendar-time.test.mjs', 'tests/local/offline-queue.test.ts',
            'tests/local/offline-sync-engine.test.ts', 'tests/local/session-display-clock.test.mjs'],
        exclude: ['tests/e2e/**', 'node_modules/**', '.aba.local/**', '.runtime.local/**'],
    },
});
