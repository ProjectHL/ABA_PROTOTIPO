import { createHash } from 'node:crypto';
import { z } from 'zod';
import { dbAsService, dbAsUser } from '@/lib/db';
import { getObject } from '@/lib/storage';

/**
 * Server-side port of the former `verify-attachment-upload` Edge Function.
 * The constrained verifier is the only actor allowed to move a reservation from
 * `pending-upload` to `available`; it re-reads the stored bytes with an
 * elevated role and compares size, magic number and SHA-256.
 */

const signatures: Record<string, readonly number[]> = {
    'application/pdf': [0x25, 0x50, 0x44, 0x46, 0x2d],
    'image/jpeg': [0xff, 0xd8, 0xff],
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

const targetSchema = z.object({
    actorId: z.uuid(),
    attachmentId: z.uuid(),
    versionId: z.uuid(),
    bucket: z.literal('clinical-attachments'),
    objectKey: z.string().min(1).max(1000),
    mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    byteLength: z.number().int().min(1).max(20 * 1024 * 1024),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export async function verifyStoredAttachment(params: {
    userId: string;
    organizationId: string;
    reservation: unknown;
    confirmation: unknown;
}): Promise<unknown> {
    const { userId, organizationId, reservation, confirmation } = params;

    const targetResult = await dbAsUser(userId).rpc('aba_attachment_verification_target_v2', {
        p_organization_id: organizationId,
        p_reservation: reservation,
        p_confirmation: confirmation,
    });
    if (targetResult.error || !targetResult.data) throw new Error('resource_unavailable');

    const target = targetSchema.parse(targetResult.data);
    if (target.actorId !== userId) throw new Error('actor_mismatch');

    const service = dbAsService();

    let bytes: Buffer;
    try {
        bytes = await getObject(target.bucket, target.objectKey);
    } catch {
        throw new Error('outcome_unknown');
    }

    const digest = createHash('sha256').update(bytes).digest('hex');
    const signature = signatures[target.mimeType];
    const signatureMatches = signature.every((value, index) => bytes[index] === value);

    if (bytes.byteLength !== target.byteLength || !signatureMatches || digest !== target.sha256) {
        await service.rpc('aba_attachment_mark_verification_failed_v2', {
            p_organization_id: organizationId,
            p_actor_user_id: userId,
            p_reservation: reservation,
            p_reason: 'bytes-mismatch',
        });
        throw new Error('bytes_mismatch');
    }

    const confirmed = await service.rpc('aba_attachment_confirm_verified_v2', {
        p_organization_id: organizationId,
        p_actor_user_id: userId,
        p_reservation: reservation,
        p_confirmation: confirmation,
        p_verified_sha256: digest,
    });
    if (confirmed.error || !confirmed.data) throw new Error('outcome_unknown');
    return confirmed.data;
}
