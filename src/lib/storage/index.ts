import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { systemQuery } from '@/lib/db';

/**
 * Private object storage on a mounted volume. Buckets are directories, object
 * keys are relative paths. Authorization always happens in the caller; this
 * module never serves bytes to a browser directly.
 */
function storageRoot(): string {
    return process.env.STORAGE_ROOT
        ? path.resolve(process.env.STORAGE_ROOT)
        : path.resolve(process.cwd(), '.runtime.local', 'storage');
}

function resolveObject(bucket: string, objectKey: string): string {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(bucket)) throw new Error('invalid_bucket');

    const normalized = path.posix.normalize(objectKey);
    if (!normalized || normalized === '.' || normalized.startsWith('../')
        || normalized.includes('/../') || path.isAbsolute(normalized)) {
        throw new Error('invalid_object_key');
    }

    const root = storageRoot();
    const target = path.resolve(root, bucket, ...normalized.split('/'));
    if (!target.startsWith(`${path.resolve(root, bucket)}${path.sep}`)) throw new Error('invalid_object_key');
    return target;
}

export async function putObject(
    bucket: string,
    objectKey: string,
    bytes: Uint8Array,
    ownerId?: string,
): Promise<void> {
    const target = resolveObject(bucket, objectKey);
    await mkdir(path.dirname(target), { recursive: true });
    // flag "wx": a duplicate object must fail exactly like Storage's upsert:false.
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
    await systemQuery(
        `insert into storage.objects (bucket_id, name, owner)
         values ($1, $2, $3)
         on conflict (bucket_id, name) do nothing`,
        [bucket, objectKey, ownerId ?? null],
    );
}

export async function getObject(bucket: string, objectKey: string): Promise<Buffer> {
    return readFile(resolveObject(bucket, objectKey));
}

export async function objectExists(bucket: string, objectKey: string): Promise<boolean> {
    try {
        const info = await stat(resolveObject(bucket, objectKey));
        return info.isFile();
    } catch {
        return false;
    }
}
