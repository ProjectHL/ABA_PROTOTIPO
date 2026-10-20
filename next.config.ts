import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: 'standalone',
    poweredByHeader: false,
    experimental: {
        serverActions: {
            // Transport ceiling: 20 MiB file plus bounded multipart metadata.
            // Services still enforce purpose-specific 5/20 MiB and MIME/content checks.
            bodySizeLimit: 20 * 1024 * 1024 + 64 * 1024,
        },
    },
    ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
