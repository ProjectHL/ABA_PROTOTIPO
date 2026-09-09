import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const supabaseCli = resolve(root, 'node_modules/supabase/dist/supabase.js');
const playwrightCli = resolve(root, 'node_modules/@playwright/test/cli.js');
const generatedConfigFiles = ['next-env.d.ts', 'tsconfig.json'].map((name) => ({
  path: resolve(root, name),
  contents: readFileSync(resolve(root, name)),
}));

function localPublicEnvironment() {
  const output = execFileSync(process.execPath, [supabaseCli, 'status', '-o', 'env'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)="(.*)"$/);
    if (match) values[match[1]] = match[2];
  }
  const url = values.API_URL;
  const publishableKey = values.ANON_KEY ?? values.PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('local_supabase_public_environment_unavailable');
  return { url, publishableKey };
}

let exitCode = 1;
try {
  const local = localPublicEnvironment();
  const result = spawnSync(
    process.execPath,
    [playwrightCli, 'test', '--config=playwright.local.config.ts'],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        ABA_E2E_LOCAL_AUTH: '1',
        NEXT_DIST_DIR: '.next-local-auth',
        NEXT_PUBLIC_SUPABASE_URL: local.url,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.publishableKey,
      },
    },
  );
  exitCode = result.status ?? 1;
} finally {
  try {
    execFileSync(process.execPath, [supabaseCli, 'db', 'reset', '--local'], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
  } catch {
    console.error('No se pudo restablecer Supabase local después del E2E.');
    exitCode = 1;
  }
  for (const file of generatedConfigFiles) writeFileSync(file.path, file.contents);
  rmSync(resolve(root, '.next-local-auth'), { recursive: true, force: true });
}

process.exitCode = exitCode;
