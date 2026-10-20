import { z } from 'zod';
import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { getObject } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
    'Cache-Control': 'private, max-age=300',
    Vary: 'Cookie',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
};

export async function GET(
    _request: Request,
    context: { params: Promise<{ userId: string }> },
) {
    try {
        const { userId } = await context.params;
        const target = z.uuid().parse(userId);

        const session = await requireSessionUser();
        const db = dbAsUser(session.id);

        const access = await db.raw<{ allowed: boolean }>(
            'select private.can_access_profile_avatar($1) as allowed',
            [target],
        );
        if (!access[0]?.allowed) throw new Error('unavailable');

        const profile = await db
            .from('professional_profiles')
            .select('avatar_object_path')
            .eq('user_id', target)
            .maybeSingle();
        const objectPath = (profile.data as { avatar_object_path?: string | null } | null)?.avatar_object_path;
        if (!objectPath) throw new Error('unavailable');

        const bytes = await getObject('profile-avatars', objectPath);
        return new Response(new Uint8Array(bytes), {
            headers: {
                ...headers,
                'Content-Type': objectPath.endsWith('.png') ? 'image/png' : 'image/jpeg',
                'Content-Length': String(bytes.byteLength),
            },
        });
    } catch {
        return Response.json({ error: 'Avatar no disponible o acceso revocado.' }, { status: 404, headers });
    }
}
