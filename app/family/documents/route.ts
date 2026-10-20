import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { loadIdentity } from '@/features/team/identity.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
const accessSchema = z.object({ actorId: z.uuid(), clinicId: z.uuid(), publicationId: z.uuid(), versionId: z.uuid(), bucket: z.literal('clinical-attachments'), objectKey: z.string().min(1).max(1000), name: z.string().min(1).max(240), mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']), byteLength: z.number().int().min(1).max(20971520), sha256: z.string().regex(/^[a-f0-9]{64}$/) });

/** No bearer URL: each request needs the current session and live publication. */
export async function GET(request: Request) {
  try {
    const input = z.object({ clinicId: z.uuid(), publicationId: z.uuid(), versionId: z.uuid() }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    const identity = await loadIdentity();
    if (identity.active?.id !== input.clinicId || identity.active.role !== 'family') throw new Error('unavailable');
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user || user.id !== identity.userId) throw new Error('unavailable');
    const read = async () => {
      const result = await db.rpc('aba_family_document_read_v2', { p_organization_id: input.clinicId, p_publication_id: input.publicationId, p_version_id: input.versionId });
      if (result.error) throw new Error('unavailable');
      const access = accessSchema.parse(result.data);
      if (access.actorId !== user.id || access.clinicId !== input.clinicId || access.publicationId !== input.publicationId || access.versionId !== input.versionId) throw new Error('unavailable');
      return access;
    };
    const access = await read();
    const download = await db.storage.from(access.bucket).download(access.objectKey);
    if (download.error || !download.data) throw new Error('unavailable');
    const bytes = await download.data.arrayBuffer();
    if (bytes.byteLength !== access.byteLength || createHash('sha256').update(Buffer.from(bytes)).digest('hex') !== access.sha256) throw new Error('unavailable');
    // Fail closed when a link/publication changes while Storage is being read.
    await read();
    const name = Array.from(access.name, character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 || character === '/' || character === '\\' ? '_' : character).join('');
    return new Response(bytes, { headers: { ...headers, 'Content-Type': access.mimeType, 'Content-Length': String(bytes.byteLength), 'Content-Disposition': `attachment; filename="documento"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}` } });
  } catch {
    return Response.json({ error: 'Documento no disponible o acceso revocado. Consulta de nuevo el portal.' }, { status: 403, headers });
  }
}
