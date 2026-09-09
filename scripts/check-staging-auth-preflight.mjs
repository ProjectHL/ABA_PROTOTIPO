import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedProjectRef = process.env.ABA_STAGING_PROJECT_REF ?? 'arfwuctpwnnuhdgjtxaa';

function localEnvironment() {
  const values = {};
  try {
    for (const line of readFileSync(resolve(projectRoot, '.env.local'), 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match) continue;
      values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch {
    // CI/operator environments may provide the values without a local file.
  }

  const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? values.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!apiUrl || !publishableKey) throw new Error('staging_public_context_missing');
  return { apiUrl, publishableKey };
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    // Negative gateway responses may not include JSON.
  }
  return { status: response.status, body };
}

const checks = {
  expected_staging_project: false,
  auth_settings_reachable: false,
  public_signup_disabled: false,
  email_provider_enabled: false,
  email_confirmation_required: false,
  edge_anonymous_rejected: false,
};

const statuses = {
  auth_settings: null,
  edge_anonymous: null,
};

try {
  const { apiUrl, publishableKey } = localEnvironment();
  const parsedUrl = new URL(apiUrl);
  checks.expected_staging_project = parsedUrl.hostname === `${expectedProjectRef}.supabase.co`;
  if (!checks.expected_staging_project) throw new Error('unexpected_remote_project');

  const [settings, anonymousEdge] = await Promise.all([
    jsonRequest(`${apiUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey },
    }),
    jsonRequest(`${apiUrl}/functions/v1/invite-clinic-member`, {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: '10000000-0000-4000-8000-000000000001',
        operationId: '00000000-0000-4000-8000-000000000001',
        email: 'anonymous-preflight@example.test',
        role: 'supervisor',
      }),
    }),
  ]);

  statuses.auth_settings = settings.status;
  statuses.edge_anonymous = anonymousEdge.status;
  checks.auth_settings_reachable = settings.status === 200;
  checks.public_signup_disabled = settings.body?.disable_signup === true;
  checks.email_provider_enabled = settings.body?.external?.email === true;
  checks.email_confirmation_required = settings.body?.mailer_autoconfirm === false;
  checks.edge_anonymous_rejected = anonymousEdge.status === 401;
} catch {
  process.exitCode = 1;
}

const allPassed = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ checks, statuses }, null, 2));
if (!allPassed) process.exitCode = 1;
