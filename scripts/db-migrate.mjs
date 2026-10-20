#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'pg';

const root = path.resolve(import.meta.dirname, '..');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL is required, e.g. postgresql://aba:aba@127.0.0.1:5432/aba');
    process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function apply(label, sql) {
    await client.query('begin');
    try {
        await client.query(sql);
        await client.query('commit');
        console.log(`applied ${label}`);
    } catch (error) {
        await client.query('rollback');
        console.error(`failed ${label}`);
        throw error;
    }
}

try {
    await client.connect();

    await apply('db/bootstrap.sql', await readFile(path.join(root, 'db', 'bootstrap.sql'), 'utf8'));

    await client.query(`
        create table if not exists public.schema_migrations (
            version text primary key,
            applied_at timestamptz not null default now()
        )
    `);

    const directory = path.join(root, 'db', 'migrations');
    const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort();
    const applied = new Set(
        (await client.query('select version from public.schema_migrations')).rows.map(row => row.version),
    );

    for (const file of files) {
        if (applied.has(file)) continue;
        const sql = await readFile(path.join(directory, file), 'utf8');
        await apply(`db/migrations/${file}`, sql);
        await client.query('insert into public.schema_migrations (version) values ($1)', [file]);
    }

    console.log(`database is up to date (${files.length} migrations)`);
} catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
