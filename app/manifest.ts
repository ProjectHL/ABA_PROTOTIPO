import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'ABA Clínico',
        short_name: 'ABA Clínico',
        description: 'Gestión clínica ABA con captura durable y sincronización controlada.',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        background_color: '#f8f9fa',
        theme_color: '#1971c2',
        lang: 'es-CL',
        icons: [
            { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
