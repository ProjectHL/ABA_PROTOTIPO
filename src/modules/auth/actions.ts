'use server';

import { headers } from 'next/headers';
import {
    changePassword,
    requestEmailChange,
    requestPasswordReset,
    resetPassword,
    sessionIdentity,
    signInWithPassword,
} from '@/lib/auth/service';
import { destroyCurrentSession } from '@/lib/auth/session';

async function requestMeta() {
    const store = await headers();
    return {
        userAgent: store.get('user-agent') ?? undefined,
        ip: store.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    };
}

export async function signInAction(input: { email: string; password: string }) {
    return signInWithPassword(input.email, input.password, await requestMeta());
}

export async function signOutAction(): Promise<void> {
    await destroyCurrentSession();
}

export async function requestPasswordResetAction(email: string) {
    await requestPasswordReset(email);
    return {
        ok: true as const,
        message: 'Si la cuenta está habilitada, recibirás un enlace para restablecer el acceso.',
    };
}

export async function resetPasswordAction(input: { token: string; password: string }) {
    return resetPassword(input.token, input.password, await requestMeta());
}

export async function changePasswordAction(input: { currentPassword: string; nextPassword: string }) {
    return changePassword(input.currentPassword, input.nextPassword);
}

export async function requestEmailChangeAction(input: { nextEmail: string; currentPassword: string }) {
    return requestEmailChange(input.nextEmail, input.currentPassword);
}

export async function sessionIdentityAction() {
    return sessionIdentity();
}
