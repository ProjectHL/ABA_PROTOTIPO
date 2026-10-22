import { dbAsService, dbAsUser, systemQuery } from '@/lib/db';
import { appUrl } from '@/lib/auth/service';
import { sendMail } from '@/lib/auth/mailer';
import { invalidateTokens, createOneTimeToken } from '@/lib/auth/tokens';

/**
 * Server-side port of the former Supabase Edge Functions
 * `invite-clinic-member` and `resend-clinic-invitation`.
 *
 * The durable delivery ledger (reserve/claim/finish) is unchanged: the caller
 * keeps its user-scoped transaction for the membership, the worker claims under
 * service_role, and an ambiguous SMTP outcome stays `unknown` instead of being
 * reported as sent.
 */

interface MembershipReceipt {
    operation_id: string;
    status: 'pending' | 'completed';
    user_id: string | null;
    role: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function membership(raw: unknown, role: string): MembershipReceipt {
    if (!raw || typeof raw !== 'object') throw new Error('invalid_receipt');
    const value = raw as Record<string, unknown>;
    if (!UUID.test(String(value.operation_id)) || !['pending', 'completed'].includes(String(value.status))
        || value.role !== role
        || (value.status === 'completed' && !UUID.test(String(value.user_id)))
        || (value.status === 'pending' && value.user_id !== null)) {
        throw new Error('invalid_receipt');
    }
    return value as unknown as MembershipReceipt;
}

export async function ensureInvitedUser(email: string): Promise<string> {
    const normalized = email.trim().toLowerCase();
    // `auth.users` is unique on lower(email) regardless of deleted_at, so a
    // soft-deleted address cannot be inserted again. Reuse and revive it.
    const existing = await systemQuery<{ id: string; deleted_at: string | null }>(
        `select id, deleted_at::text
           from auth.users
          where lower(email) = lower($1)
          order by deleted_at nulls first
          limit 1`,
        [normalized],
    );
    if (existing[0]) {
        if (existing[0].deleted_at) {
            await systemQuery(
                'update auth.users set deleted_at = null, updated_at = now() where id = $1',
                [existing[0].id],
            );
        }
        return existing[0].id;
    }

    try {
        const created = await systemQuery<{ id: string }>(
            'insert into auth.users (email) values ($1) returning id',
            [normalized],
        );
        return created[0].id;
    } catch (cause) {
        // A concurrent invitation may have created the identity first.
        if ((cause as { code?: string }).code !== '23505') throw cause;
        const raced = await systemQuery<{ id: string }>(
            'select id from auth.users where lower(email) = lower($1) limit 1',
            [normalized],
        );
        if (!raced[0]) throw cause;
        return raced[0].id;
    }
}

export async function userIsConfirmed(userId: string): Promise<boolean> {
    const rows = await systemQuery<{ confirmed: boolean }>(
        'select (email_confirmed_at is not null) as confirmed from auth.users where id = $1',
        [userId],
    );
    return rows[0]?.confirmed === true;
}

function deliveryError(message: string): string {
    if (message.includes('already_accepted')) return 'invitation_already_accepted';
    if (message.includes('idempotency_conflict')) return 'delivery_idempotency_conflict';
    if (message.includes('requires_resolution')) return 'delivery_requires_resolution';
    if (message.includes('target_changed')) return 'invitation_target_changed';
    return 'delivery_not_reserved';
}

function classifySmtpFailure(error: unknown): { outcome: 'failed' | 'unknown'; errorCode: 'auth-rejected' | 'transport-unknown' } {
    const code = (error as { code?: string })?.code;
    // Only definitive server-side refusals become `failed`; anything ambiguous
    // (timeout, 5xx, dropped connection) must stay `unknown` so no duplicate is
    // sent automatically.
    if (code === 'EAUTH' || code === 'EENVELOPE' || code === 'EMESSAGE') {
        return { outcome: 'failed', errorCode: 'auth-rejected' };
    }
    return { outcome: 'unknown', errorCode: 'transport-unknown' };
}

async function sendInvitationMail(userId: string, recipient: string): Promise<void> {
    await invalidateTokens(userId, 'invite');
    const token = await createOneTimeToken(userId, 'invite');
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    const result = await sendMail({
        to: recipient,
        subject: 'Te invitaron a ABA Clínico: define tu contraseña',
        text: `Abre este enlace para definir tu contraseña y entrar a la clínica: ${link}\n\nEl enlace vence en 7 días. Si no esperabas esta invitación, ignora este mensaje.`,
    });
    if (!result.accepted) throw new Error('smtp_not_accepted');
}

export interface DeliveryResult {
    delivery: unknown | null;
    deliveryError: 'outcome-not-confirmed' | null;
}

/**
 * Reserves, claims, sends and finishes one durable delivery. Never throws for
 * SMTP problems: the caller receives the ledger state or an explicit
 * `outcome-not-confirmed` marker.
 */
export async function deliverInvitation(params: {
    actorId: string;
    organizationId: string;
    invitationId: string;
    operationId: string;
    idempotencyKey: string;
}): Promise<DeliveryResult> {
    const { actorId, organizationId, invitationId, operationId, idempotencyKey } = params;

    const reserved = await dbAsUser(actorId).rpc('aba_reserve_team_invitation_delivery', {
        p_org: organizationId,
        p_invite: invitationId,
        p_operation: operationId,
        p_key: idempotencyKey,
    });
    if (reserved.error) {
        const code = deliveryError(reserved.error.message);
        throw new Error(code);
    }

    const pending = reserved.data as { deliveryId?: string } | null;
    if (!pending?.deliveryId) throw new Error('delivery_not_reserved');

    const service = dbAsService();
    const claimed = await service.rpc<Record<string, unknown>>('aba_claim_team_invitation_delivery', {
        p_org: organizationId,
        p_delivery: pending.deliveryId,
        p_actor: actorId,
    });
    if (claimed.error) return { delivery: null, deliveryError: 'outcome-not-confirmed' };

    const claim = claimed.data;
    if (!claim || claim.send === false) {
        return { delivery: claim?.delivery ?? null, deliveryError: null };
    }

    const subjectUserId = String(claim.subjectUserId ?? '');
    const recipient = String(claim.recipient ?? '');
    const claimToken = String(claim.claimToken ?? '');
    if (!UUID.test(subjectUserId) || !UUID.test(claimToken) || !/^\S+@\S+\.\S+$/.test(recipient)) {
        return { delivery: null, deliveryError: 'outcome-not-confirmed' };
    }

    let outcome: 'sent' | 'failed' | 'unknown' = 'unknown';
    let errorCode: 'auth-rejected' | 'transport-unknown' | null = 'transport-unknown';

    if (!(await userIsConfirmed(subjectUserId))) {
        try {
            await sendInvitationMail(subjectUserId, recipient);
            outcome = 'sent';
            errorCode = null;
        } catch (error) {
            const classified = classifySmtpFailure(error);
            outcome = classified.outcome;
            errorCode = classified.errorCode;
            console.error('[invite] smtp send failed', {
                organizationId,
                deliveryId: pending.deliveryId,
                outcome,
                errorCode,
                code: (error as { code?: string })?.code ?? null,
                message: error instanceof Error ? error.message : String(error),
            });
        }
    } else {
        outcome = 'failed';
        errorCode = 'auth-rejected';
    }

    const finished = await service.rpc('aba_finish_team_invitation_delivery', {
        p_org: organizationId,
        p_delivery: pending.deliveryId,
        p_actor: actorId,
        p_claim: claimToken,
        p_outcome: outcome,
        p_error: errorCode,
    });
    if (finished.error) return { delivery: null, deliveryError: 'outcome-not-confirmed' };

    return { delivery: finished.data, deliveryError: null };
}

export interface InvitationEnvelope {
    operationId: string;
    requestedOperationId: string;
    status: 'completed';
    userId: string;
    role: string;
    invited: boolean;
    replayed: boolean;
    alreadyAccepted: boolean;
    delivery: unknown | null;
    deliveryError: 'outcome-not-confirmed' | 'initial-owner-required' | null;
}

export async function inviteClinicMember(params: {
    actorId: string;
    organizationId: string;
    operationId: string;
    email: string;
    role: 'admin' | 'supervisor' | 'therapist';
    ownerId?: string | null;
}): Promise<InvitationEnvelope> {
    const { actorId, organizationId, operationId, role } = params;
    const email = params.email.trim().toLowerCase();

    const userDb = dbAsUser(actorId);
    const begun = await userDb.rpc('mvp_begin_clinic_invitation', {
        p_organization_id: organizationId,
        p_operation_id: operationId,
        p_email: email,
        p_role: role,
    });
    if (begun.error) {
        if (begun.error.code === '42501') throw new Error('clinic_admin_required');
        throw new Error(begun.error.message.includes('use_resend')
            ? 'existing_membership_use_resend'
            : 'invitation_not_started');
    }

    const started = membership(begun.data, role);
    const canonical = started.operation_id;

    let completed = await userDb.rpc('mvp_complete_clinic_invitation', {
        p_organization_id: organizationId,
        p_operation_id: canonical,
    });

    if (completed.error?.message.includes('invited_auth_user_not_found')) {
        await ensureInvitedUser(email);

        // Re-assert the active-admin boundary before privileged account creation.
        const checked = await userDb.rpc('mvp_begin_clinic_invitation', {
            p_organization_id: organizationId,
            p_operation_id: canonical,
            p_email: email,
            p_role: role,
        });
        if (checked.error) throw new Error('clinic_admin_required');

        completed = await userDb.rpc('mvp_complete_clinic_invitation', {
            p_organization_id: organizationId,
            p_operation_id: canonical,
        });
    }

    if (completed.error) {
        if (completed.error.code === '42501') throw new Error('clinic_admin_required');
        throw new Error(completed.error.message.includes('conflict')
            ? 'existing_membership_conflict_use_team_management'
            : 'membership_not_confirmed');
    }

    const saved = membership(completed.data, role);
    if (saved.status !== 'completed' || saved.operation_id !== canonical || !saved.user_id) {
        throw new Error('invalid_receipt');
    }

    const alreadyAccepted = await userIsConfirmed(saved.user_id);

    let delivery: unknown | null = null;
    let deliveryError: 'outcome-not-confirmed' | null = null;
    // A confirmed identity has no invitation link to redeem: the ledger refuses
    // the delivery (`invitation_already_accepted`), so do not report a bogus
    // uncertain outcome for a mail that was never going to be sent.
    if (!alreadyAccepted) {
        try {
            const result = await deliverInvitation({
                actorId,
                organizationId,
                invitationId: canonical,
                operationId: canonical,
                idempotencyKey: canonical,
            });
            delivery = result.delivery;
            deliveryError = result.deliveryError;
        } catch (cause) {
            // Never swallow the cause: without it the administrator only sees a
            // generic "uncertain" message and cannot diagnose the SMTP boundary.
            console.error('[invite] delivery failed', {
                organizationId,
                operationId: canonical,
                message: cause instanceof Error ? cause.message : String(cause),
            });
            deliveryError = 'outcome-not-confirmed';
        }
    }
    const deliveryState = (delivery as { state?: string } | null)?.state;
    const confirmationSource = (delivery as { confirmationSource?: string | null } | null)?.confirmationSource;

    return {
        operationId: canonical,
        requestedOperationId: operationId,
        status: 'completed',
        userId: saved.user_id,
        role,
        invited: started.status === 'pending' && deliveryState === 'sent' && confirmationSource === 'auth',
        replayed: started.status === 'completed',
        alreadyAccepted,
        delivery,
        deliveryError,
    };
}

export async function resendClinicInvitation(params: {
    actorId: string;
    organizationId: string;
    invitationId: string;
    operationId: string;
    idempotencyKey: string;
}): Promise<unknown> {
    const result = await deliverInvitation({
        actorId: params.actorId,
        organizationId: params.organizationId,
        invitationId: params.invitationId,
        operationId: params.operationId,
        idempotencyKey: params.idempotencyKey,
    });
    if (result.deliveryError || !result.delivery) throw new Error('delivery_outcome_not_confirmed');
    return result.delivery;
}
