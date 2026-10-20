import { createHash } from 'node:crypto';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { createClient } from '@/lib/supabase/server';
import { attachmentResourceSchema, attachmentVersionSchema } from '@/domain/attachments/attachment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** An URL alone grants nothing: the current session, permission and version are checked twice. */
export async function GET(request: Request) {
  try {
    const input = z.object({
      resource: z.string().min(1).max(500),
      versionId: z.uuid(),
      expiresAt: z.coerce.number().int().positive(),
    }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    const now = Date.now();
    if (input.expiresAt <= now || input.expiresAt > now + 300_000) throw new Error('unavailable');
    const resource = attachmentResourceSchema.parse(JSON.parse(input.resource));
    const identity = await loadIdentity();
    if (!identity.active || identity.active.role === 'family' || identity.active.role === 'external') throw new Error('unavailable');
    const clinicId = resource.kind === 'professional' ? identity.active.id : resource.clinicId;
    if (identity.active.id !== clinicId) throw new Error('unavailable');
    const db = await createClient();
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user || user.id !== identity.userId) throw new Error('unavailable');
    const read = async () => {
      const result = await db.rpc('aba_attachment_read_v2', {
        p_organization_id: clinicId,
        p_resource: resource,
        p_version_id: input.versionId,
      });
      if (result.error) throw new Error('unavailable');
      const version = attachmentVersionSchema.parse(result.data);
      if (version.id !== input.versionId || version.state !== 'available' ||
        JSON.stringify(version.resource) !== JSON.stringify(resource) || version.bucket !== 'clinical-attachments') throw new Error('unavailable');
      return version;
    };
    const version = await read();
    const download = await db.storage.from(version.bucket).download(version.objectKey);
    if (download.error || !download.data) throw new Error('unavailable');
    const bytes = await download.data.arrayBuffer();
    if (bytes.byteLength !== version.upload.byteLength ||
      createHash('sha256').update(Buffer.from(bytes)).digest('hex') !== version.upload.sha256) throw new Error('unavailable');
    const current = await read();
    if (current.objectKey !== version.objectKey || current.upload.sha256 !== version.upload.sha256 || Date.now() >= input.expiresAt) throw new Error('unavailable');
    return new Response(bytes, { headers: {
      ...headers,
      'Content-Type': version.upload.mimeType,
      'Content-Length': String(bytes.byteLength),
      'Content-Disposition': `inline; filename="archivo"; filename*=UTF-8''${encodeURIComponent(version.upload.fileName).replace(/['()*]/g, character => '%' + character.charCodeAt(0).toString(16))}`,
    } });
  } catch {
    return Response.json({ error: 'Archivo no disponible o acceso revocado. Consulta de nuevo el recurso.' }, { status: 403, headers });
  }
}
