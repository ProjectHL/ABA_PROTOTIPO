import { describe, expect, it } from 'vitest';
import { getSafeRedirect } from './redirect';

describe('getSafeRedirect', () => {
    it('preserva rutas internas', () => {
        expect(getSafeRedirect('/students/123?tab=general')).toBe('/students/123?tab=general');
    });

    it('descarta rutas externas o inválidas', () => {
        expect(getSafeRedirect('//evil.example')).toBe('/dashboard');
        expect(getSafeRedirect('https://evil.example')).toBe('/dashboard');
        expect(getSafeRedirect('/\\evil.example')).toBe('/dashboard');
        expect(getSafeRedirect('/%0aevil')).toBe('/dashboard');
        expect(getSafeRedirect('/students/1#clinical')).toBe('/students/1#clinical');
        expect(getSafeRedirect(null)).toBe('/dashboard');
    });
});
