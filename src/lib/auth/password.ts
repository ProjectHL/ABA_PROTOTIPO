import { hash, verify } from '@node-rs/argon2';

const OPTIONS = {
    // 2 is Argon2id; the package exports it as an ambient const enum, which
    // cannot be read under isolatedModules.
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
};

export const PASSWORD_RULE = '12 caracteres, minúscula, mayúscula, número y símbolo.';

export function isValidPassword(password: string): boolean {
    return password.length >= 12
        && password.length <= 128
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /[0-9]/.test(password)
        && /[\W_]/.test(password);
}

export async function hashPassword(password: string): Promise<string> {
    return hash(password, OPTIONS);
}

export async function verifyPassword(encoded: string | null, password: string): Promise<boolean> {
    if (!encoded) return false;
    try {
        return await verify(encoded, password);
    } catch {
        return false;
    }
}
