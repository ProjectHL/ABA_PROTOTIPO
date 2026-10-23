#!/usr/bin/env node
// Loads synthetic demo data into a DEVELOPMENT or TEST environment.
//
//   DEMO_PASSWORD='...' npm run seed:demo
//
// Refuses to run with APP_ENV=production and, in any NODE_ENV=production image
// (the deployed container), only with --force or DEMO_DATA=yes.
import { hash } from '@node-rs/argon2';
import { Client } from 'pg';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = [resolve(here, '../db/seed/demo.sql'), resolve(here, 'seed/demo.sql')]
    .find(candidate => existsSync(candidate));

const force = process.argv.includes('--force') || process.env.DEMO_DATA === 'yes';

if (process.env.APP_ENV === 'production') {
    console.error('seed:demo se niega a correr con APP_ENV=production.');
    process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !force) {
    console.error('Entorno de producción: ejecuta con --force o DEMO_DATA=yes solo en el ambiente de test.');
    process.exit(1);
}
if (!sqlPath) {
    console.error('No se encontró db/seed/demo.sql.');
    process.exit(1);
}
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL no está definida.');
    process.exit(1);
}

const password = process.env.DEMO_PASSWORD ?? 'Demo1234!Segura';
if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    console.error('DEMO_PASSWORD debe tener 12 caracteres, minúscula, mayúscula, número y símbolo.');
    process.exit(1);
}

const demoUsers = [
    { email: 'clinico@demo.test', name: 'Camila Rojas', role: 'clinician' },
    { email: 'lector@demo.test', name: 'Andrés Silva', role: 'viewer' },
];

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
    const organization = await client.query(
        `select o.id
           from public.organizations o
           join public.memberships m on m.organization_id = o.id
          where o.status = 'active' and m.status = 'active' and m.role = 'admin'
          order by o.created_at
          limit 1`,
    );
    if (!organization.rows[0]) {
        throw new Error('No hay una clínica activa con administrador. Completa la configuración inicial primero.');
    }
    const organizationId = organization.rows[0].id;

    for (const demo of demoUsers) {
        const user = await client.query(
            `insert into auth.users (email, encrypted_password, email_confirmed_at)
             values ($1, $2, now())
             on conflict (lower(email)) do update
                set encrypted_password = excluded.encrypted_password,
                    email_confirmed_at = coalesce(auth.users.email_confirmed_at, now()),
                    updated_at = now()
             returning id`,
            [demo.email, encoded],
        );
        const userId = user.rows[0].id;
        await client.query(
            `insert into public.memberships (organization_id, user_id, role, status)
             values ($1, $2, $3, 'active')
             on conflict (organization_id, user_id) do update set role = excluded.role, status = 'active'`,
            [organizationId, userId, demo.role],
        );
        await client.query(
            `insert into public.professional_profiles (user_id, name, profession, updated_at)
             values ($1, $2, 'Psicología', now())
             on conflict (user_id) do nothing`,
            [userId, demo.name],
        );
    }

    // The SQL runs as the admin through the same command the UI uses.
    await client.query(readFileSync(sqlPath, 'utf8'));

    console.log('Datos de demostración cargados.');
    console.log(`organización: ${organizationId}`);
    console.log(`acceso clínico: ${demoUsers[0].email} / ${password}`);
    console.log(`acceso lectura: ${demoUsers[1].email} / ${password}`);
    console.log('6 fichas sintéticas (DEMO-001 … DEMO-006).');
} finally {
    await client.end();
}
