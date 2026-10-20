#!/usr/bin/env node
// Creates the first clinic administrator on a fresh database.
// There is no public signup: this is the only way in before an admin exists.
//
//   DATABASE_URL=postgresql://... npm run user:create -- \
//     --email admin@clinica.test --org 'Clínica Demo' \
// (reads ADMIN_PASSWORD when --password is omitted, keeping it out of ps)
//     --name 'Nombre Apellido' --org 'Clínica Demo'
import { hash } from '@node-rs/argon2';
import { Client } from 'pg';

const PASSWORD_RULE = '12 caracteres, minúscula, mayúscula, número y símbolo.';

function isValidPassword(password) {
    return password.length >= 12
        && password.length <= 128
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /[0-9]/.test(password)
        && /[\W_]/.test(password);
}

function parseArgs(argv) {
    const args = {};
    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith('--')) throw new Error(`argumento inesperado: ${token}`);
        const key = token.slice(2);
        const value = argv[index + 1];
        if (value === undefined || value.startsWith('--')) throw new Error(`falta el valor de --${key}`);
        args[key] = value;
        index += 1;
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));
const email = (args.email ?? '').trim().toLowerCase();
const password = args.password ?? process.env.ADMIN_PASSWORD ?? '';
const name = (args.name ?? '').trim();
const organization = (args.org ?? '').trim();

if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new Error('--email es obligatorio y debe ser un correo válido.');
}
if (!isValidPassword(password)) throw new Error(`--password debe cumplir: ${PASSWORD_RULE}`);
if (!organization) throw new Error('--org es obligatorio (nombre de la clínica).');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está definida.');

// Must match src/lib/auth/password.ts so the app can verify this hash.
const encoded = await hash(password, {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
});

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
    await client.query('begin');

    const user = await client.query(
        `insert into auth.users (email, encrypted_password, email_confirmed_at)
         values ($1, $2, now())
         on conflict (lower(email)) do update
            set encrypted_password = excluded.encrypted_password,
                email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
                deleted_at = null,
                banned_until = null,
                updated_at = now()
         returning id`,
        [email, encoded],
    );
    const userId = user.rows[0].id;

    const found = await client.query(
        `select id from public.organizations
          where lower(name) = lower($1) and status = 'active'
          order by created_at limit 1`,
        [organization],
    );
    let organizationId = found.rows[0]?.id;
    if (!organizationId) {
        const created = await client.query(
            'insert into public.organizations (name) values ($1) returning id',
            [organization],
        );
        organizationId = created.rows[0].id;
    }

    await client.query(
        `insert into public.memberships (organization_id, user_id, role, status)
         values ($1, $2, 'admin', 'active')
         on conflict (organization_id, user_id)
         do update set role = 'admin', status = 'active'`,
        [organizationId, userId],
    );

    if (name) {
        await client.query(
            `insert into public.professional_profiles (user_id, name, updated_at)
             values ($1, $2, now())
             on conflict (user_id) do nothing`,
            [userId, name],
        );
    }

    await client.query('commit');
    console.log(`admin listo: ${email}`);
    console.log(`organización: ${organization} (${organizationId})`);
    console.log(`usuario: ${userId}`);
} catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
} finally {
    await client.end();
}
