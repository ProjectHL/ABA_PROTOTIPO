export function getSafeRedirect(redirectTo: string | null, fallback = '/dashboard'): string {
    if (!redirectTo?.startsWith('/') || redirectTo.startsWith('//') || redirectTo.includes('\\')) return fallback;
    try {
        const decoded = decodeURIComponent(redirectTo);
        if ([...decoded].some(character => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) return fallback;
        const base = new URL('https://aba.invalid');
        const target = new URL(redirectTo, base);
        return target.origin === base.origin ? `${target.pathname}${target.search}${target.hash}` : fallback;
    } catch {
        return fallback;
    }
}
