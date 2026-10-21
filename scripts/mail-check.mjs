#!/usr/bin/env node
// Diagnoses the SMTP configuration used for invitations and password recovery.
//
//   npm run mail:check
//   npm run mail:check -- --to=you@example.com
//
// In a deployed stack:
//   docker compose --env-file infra/.env -f infra/docker-compose.yml \
//     run --rm --no-deps app node /app/mail-check.mjs --to=you@example.com
//
// Credentials are never printed. Exit code is non-zero when verification or
// sending fails, so it can gate a deployment smoke test.
import { existsSync } from 'node:fs';
import nodemailer from 'nodemailer';

const envFile = ['infra/.env', '.env.local', '.env'].find(file => existsSync(file));
if (envFile) {
    try {
        process.loadEnvFile(envFile);
        console.log(`env: ${envFile}`);
    } catch {
        console.warn(`env: ${envFile} exists but could not be loaded; using the process environment`);
    }
} else {
    console.log('env: process environment');
}

const args = process.argv.slice(2);
const to = args.find(arg => arg.startsWith('--to='))?.slice('--to='.length).trim();
const host = process.env.SMTP_HOST?.trim();
const port = Number(process.env.SMTP_PORT ?? 587);
const secure = process.env.SMTP_SECURE === 'true' || port === 465;
const from = process.env.SMTP_FROM ?? 'ABA Clínico <no-reply@aba.local>';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
const userConfigured = Boolean(process.env.SMTP_USER);

console.log('configuration:');
console.log(`  SMTP_HOST: ${host || '<empty>'}`);
console.log(`  SMTP_PORT: ${port}`);
console.log(`  SMTP_SECURE: ${secure}`);
console.log(`  SMTP_EHLO_NAME: ${process.env.SMTP_EHLO_NAME?.trim() || host || '<empty>'}`);
const passwordConfigured = Boolean(process.env.SMTP_PASS);
console.log(`  SMTP_USER: ${userConfigured ? process.env.SMTP_USER.trim() : '<none>'}`);
console.log(`  SMTP_PASS: ${passwordConfigured ? '<configured>' : '<empty>'}`);
console.log(`  SMTP_FROM: ${from}`);
console.log(`  NEXT_PUBLIC_APP_URL: ${appUrl || '<empty>'}`);

if (!host) {
    console.error('\nSMTP_HOST is empty. In production every invitation and recovery mail fails');
    console.error('with "smtp_not_configured"; in development the message is only logged.');
    process.exit(1);
}
if (userConfigured && !passwordConfigured) {
    console.warn('\nwarning: SMTP_USER is set but SMTP_PASS is empty; the server will reject the authentication.');
}
if (!appUrl) {
    console.warn('\nwarning: NEXT_PUBLIC_APP_URL is empty; links fall back to http://localhost:3000 in development and fail in production.');
} else if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(appUrl)) {
    console.warn(`\nwarning: NEXT_PUBLIC_APP_URL points to ${appUrl}; recipients cannot open invitation links there.`);
}

const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    name: process.env.SMTP_EHLO_NAME?.trim() || host,
    auth: userConfigured ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
    ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
    tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false' },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
});

function explain(error) {
    const code = error?.code;
    const response = error?.response;
    const known = {
        EAUTH: 'The server rejected the SMTP_USER/SMTP_PASS credentials.',
        EENVELOPE: 'The server rejected the sender (SMTP_FROM) or the recipient address.',
        ECONNECTION: 'No TCP connection to the host/port. Check DNS, firewall and outbound port 25.',
        ETIMEDOUT: 'Connection timed out. Many VPS providers block outbound port 25; ask them to unblock it.',
        ESOCKET: 'The connection dropped while sending. Check the server logs.',
        ETLS: 'TLS negotiation failed. Check the certificate or set SMTP_TLS_REJECT_UNAUTHORIZED=false only for a trusted private CA.',
        EDNS: 'The hostname could not be resolved.',
    };
    return response || known[code] || error?.message || String(error);
}

try {
    console.log('\nverifying the connection...');
    await transport.verify();
    console.log('verify: ok (the server accepted the connection)');
} catch (error) {
    console.error(`verify: failed [${error?.code ?? 'unknown'}] ${explain(error)}`);
    process.exit(1);
}

if (!to) {
    console.log('\nNo --to address: connection verified, nothing sent.');
    console.log('Send a real test with: npm run mail:check -- --to=you@example.com');
    process.exit(0);
}

try {
    console.log(`\nsending a test message to ${to}...`);
    const info = await transport.sendMail({
        from,
        to,
        subject: '[ABA Clínico] Prueba de correo',
        text: `Este es un correo de prueba de ABA Clínico.\n\nOrigen configurado: ${appUrl || '(sin NEXT_PUBLIC_APP_URL)'}\nFecha: ${new Date().toISOString()}\n\nSi lo recibís, el SMTP de la aplicación está operativo.`,
    });
    console.log(`send: ok messageId=${info.messageId}`);
    console.log(`  accepted: ${(info.accepted ?? []).join(', ') || '<none>'}`);
    console.log(`  rejected: ${(info.rejected ?? []).join(', ') || '<none>'}`);
    console.log(`  response: ${info.response ?? '<none>'}`);
} catch (error) {
    console.error(`send: failed [${error?.code ?? 'unknown'}] ${explain(error)}`);
    process.exit(1);
}
