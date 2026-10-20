import { systemQuery, systemTransaction } from '@/lib/db';
import { hashPassword, isValidPassword, PASSWORD_RULE } from './password';

export interface FirstAdminInput {
    email: string;
    password: string;
    name: string;
    organization: string;
}

export type FirstAdminResult =
    | { ok: true; userId: string; organizationId: string }
    | { ok: false; message: string };

/** True only while the instance has no accounts at all. */
export async function needsSetup(): Promise<boolean> {
    const rows = await systemQuery<{ pending: boolean }>(
        'select not exists (select 1 from auth.users) as pending',
    );
    return rows[0]?.pending ?? false;
}

function normalize(value: string): string {
    return value.trim();
}

/**
 * Creates the first administrator and their clinic in one transaction.
 * The advisory lock plus the in-transaction check make a second concurrent
 * submission fail instead of creating a second admin.
 */
export async function createFirstAdmin(input: FirstAdminInput): Promise<FirstAdminResult> {
    const email = normalize(input.email).toLowerCase();
    const name = normalize(input.name);
    const organization = normalize(input.organization);

    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
        return { ok: false, message: 'El correo no es válido.' };
    }
    if (!isValidPassword(input.password)) {
        return { ok: false, message: `La contraseña debe tener ${PASSWORD_RULE}` };
    }
    if (name.length > 160) return { ok: false, message: 'El nombre es demasiado largo.' };
    if (organization.length < 1 || organization.length > 120) {
        return { ok: false, message: 'El nombre de la clínica debe tener entre 1 y 120 caracteres.' };
    }

    const encoded = await hashPassword(input.password);

    return systemTransaction(async client => {
        // Released at commit or rollback; serialises concurrent setup posts.
        await client.query("select pg_advisory_xact_lock(hashtext('aba.first-admin'))");

        const existing = await client.query('select 1 from auth.users limit 1');
        if ((existing.rowCount ?? 0) > 0) {
            return { ok: false, message: 'La configuración inicial ya fue completada. Inicia sesión.' };
        }

        const user = await client.query<{ id: string }>(
            `insert into auth.users (email, encrypted_password, email_confirmed_at)
             values ($1, $2, now())
             returning id`,
            [email, encoded],
        );
        const userId = user.rows[0].id;

        const org = await client.query<{ id: string }>(
            'insert into public.organizations (name) values ($1) returning id',
            [organization],
        );
        const organizationId = org.rows[0].id;

        await client.query(
            `insert into public.memberships (organization_id, user_id, role, status)
             values ($1, $2, 'admin', 'active')`,
            [organizationId, userId],
        );

        if (name) {
            await client.query(
                `insert into public.professional_profiles (user_id, name, updated_at)
                 values ($1, $2, now())`,
                [userId, name],
            );
        }

        return { ok: true as const, userId, organizationId };
    });
}
