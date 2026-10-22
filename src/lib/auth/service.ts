import { systemQuery } from '@/lib/db';
import { sendMail } from './mailer';
import { hashPassword, isValidPassword, verifyPassword, PASSWORD_RULE } from './password';
import {
    createSession,
    destroyUserSessions,
    getSessionUser,
    requireSessionUser,
} from './session';
import { consumeOneTimeToken, createOneTimeToken, invalidateTokens } from './tokens';

interface UserRow {
    id: string;
    email: string;
    encrypted_password: string | null;
    email_confirmed_at: string | null;
}

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';

export function appUrl(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    if (!configured && process.env.NODE_ENV === 'production') {
        throw new Error('NEXT_PUBLIC_APP_URL es obligatorio en producción.');
    }
    return (configured ?? 'http://localhost:3000').replace(/\/+$/, '');
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

async function findUserByEmail(email: string): Promise<UserRow | null> {
    const rows = await systemQuery<UserRow>(
        `select id, email, encrypted_password, email_confirmed_at::text
           from auth.users
          where lower(email) = lower($1)
            and deleted_at is null
          limit 1`,
        [email],
    );
    return rows[0] ?? null;
}

export async function signInWithPassword(
    email: string,
    password: string,
    meta: { userAgent?: string; ip?: string } = {},
): Promise<{ ok: true } | { ok: false; message: string }> {
    const user = await findUserByEmail(normalizeEmail(email));
    const valid = user ? await verifyPassword(user.encrypted_password, password) : false;

    if (!user || !valid) return { ok: false, message: INVALID_CREDENTIALS };
    if (!user.email_confirmed_at) {
        return { ok: false, message: 'La invitación todavía no fue aceptada. Abre el enlace del correo y define tu contraseña.' };
    }

    await createSession(user.id, meta);
    return { ok: true };
}

export async function requestPasswordReset(email: string): Promise<void> {
    const user = await findUserByEmail(normalizeEmail(email));
    // Never reveal whether an account exists.
    if (!user || !user.email_confirmed_at) return;

    await invalidateTokens(user.id, 'recovery');
    const token = await createOneTimeToken(user.id, 'recovery');
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    try {
        await sendMail({
            to: user.email,
            subject: 'Restablece tu acceso a ABA Clínico',
            text: `Abre este enlace para definir una nueva contraseña: ${link}\n\nEl enlace vence en una hora.`,
        });
    } catch (error) {
        console.error('[auth] no se pudo enviar el correo de recuperación', error instanceof Error ? error.message : error);
    }
}

export async function resetPassword(
    token: string,
    password: string,
    meta: { userAgent?: string; ip?: string } = {},
): Promise<{ ok: true } | { ok: false; message: string }> {
    if (!isValidPassword(password)) return { ok: false, message: `La contraseña debe tener ${PASSWORD_RULE}` };

    const consumed = (await consumeOneTimeToken(token, 'recovery'))
        ?? (await consumeOneTimeToken(token, 'invite'));

    if (!consumed) return { ok: false, message: 'El enlace no es válido o venció. Solicita uno nuevo.' };

    const encoded = await hashPassword(password);
    await systemQuery(
        `update auth.users
            set encrypted_password = $2,
                email_confirmed_at = coalesce(email_confirmed_at, now()),
                updated_at = now()
          where id = $1`,
        [consumed.userId, encoded],
    );
    // Consuming the invitation token is the acceptance act. Invitations create
    // `pending` memberships that grant no access; activating them here is the
    // only transition from "invited" to "member".
    await systemQuery(
        `with activated as (
            update public.memberships set status = 'active'
             where user_id = $1 and status = 'pending'
            returning organization_id
         )
         insert into public.clinic_admin_events(organization_id, actor_user_id, subject_user_id, action)
         select organization_id, $1, $1, 'invitation_accepted' from activated`,
        [consumed.userId],
    );
    await destroyUserSessions(consumed.userId);
    await createSession(consumed.userId, meta);
    return { ok: true };
}

export async function changePassword(
    currentPassword: string,
    nextPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const session = await requireSessionUser();

    const rows = await systemQuery<{ encrypted_password: string | null }>(
        'select encrypted_password from auth.users where id = $1',
        [session.id],
    );
    if (!(await verifyPassword(rows[0]?.encrypted_password ?? null, currentPassword))) {
        return { ok: false, message: 'La contraseña actual no pudo verificarse.' };
    }
    if (!isValidPassword(nextPassword)) {
        return { ok: false, message: `La contraseña debe tener ${PASSWORD_RULE}` };
    }

    const encoded = await hashPassword(nextPassword);
    await systemQuery(
        'update auth.users set encrypted_password = $2, updated_at = now() where id = $1',
        [session.id, encoded],
    );
    await destroyUserSessions(session.id, session.sessionId);
    return { ok: true };
}

export async function requestEmailChange(
    nextEmail: string,
    currentPassword: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
    const session = await requireSessionUser();
    const email = normalizeEmail(nextEmail);
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
        return { ok: false, message: 'El correo no es válido.' };
    }

    const rows = await systemQuery<{ encrypted_password: string | null }>(
        'select encrypted_password from auth.users where id = $1',
        [session.id],
    );
    if (!(await verifyPassword(rows[0]?.encrypted_password ?? null, currentPassword))) {
        return { ok: false, message: 'La contraseña actual no pudo verificarse.' };
    }

    const existing = await findUserByEmail(email);
    if (existing && existing.id !== session.id) {
        return { ok: false, message: 'Ese correo ya está registrado.' };
    }

    await invalidateTokens(session.id, 'email_change');
    const token = await createOneTimeToken(session.id, 'email_change', { email });
    const link = `${appUrl()}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=email_change&next=/team`;

    try {
        await sendMail({
            to: email,
            subject: 'Confirma tu nuevo correo de ABA Clínico',
            text: `Confirma el cambio abriendo este enlace: ${link}\n\nEl enlace vence en 24 horas.`,
        });
    } catch (error) {
        console.error('[auth] no se pudo enviar la confirmación de correo', error instanceof Error ? error.message : error);
        return { ok: false, message: 'No se pudo enviar la confirmación. Revisa la configuración de correo.' };
    }

    return { ok: true };
}

export async function confirmEmailChange(token: string): Promise<boolean> {
    const consumed = await consumeOneTimeToken(token, 'email_change');
    if (!consumed) return false;
    const email = typeof consumed.payload.email === 'string' ? consumed.payload.email : null;
    if (!email) return false;

    await systemQuery(
        'update auth.users set email = $2, updated_at = now() where id = $1',
        [consumed.userId, email],
    );
    return true;
}

export async function sessionIdentity() {
    const user = await getSessionUser();
    if (!user) return null;
    return { userId: user.id, email: user.email };
}
