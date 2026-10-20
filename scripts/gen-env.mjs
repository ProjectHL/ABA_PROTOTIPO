#!/usr/bin/env node
// Generates infra/.env from infra/.env.example with real random secrets.
// Secrets are never committed: the file is ignored by git.
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'infra/.env');
const force = process.argv.includes('--force');

if (existsSync(target) && !force) {
    console.error(`refusing to overwrite ${target}; pass --force to replace it`);
    process.exit(1);
}

const template = readFileSync(resolve(root, 'infra/.env.example'), 'utf8');
const values = {
    // hex keeps the value safe inside DATABASE_URL without percent-encoding
    POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
    AUTH_SECRET: randomBytes(48).toString('base64'),
    NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
};

let output = template;
for (const [key, value] of Object.entries(values)) {
    const line = new RegExp(`^${key}=.*$`, 'm');
    if (!line.test(output)) throw new Error(`${key} is missing from infra/.env.example`);
    output = output.replace(line, `${key}=${value}`);
}

writeFileSync(target, output, { mode: 0o600 });
chmodSync(target, 0o600);
console.log(`wrote ${target}`);
console.log('edit SMTP_* and NEXT_PUBLIC_APP_URL before deploying');
