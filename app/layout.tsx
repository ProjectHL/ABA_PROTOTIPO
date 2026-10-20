import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@/index.css';
import { type Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';
import { RecoveryHashBridge } from '@/modules/clinical/recovery-hash-bridge';

export const metadata: Metadata = {
    title: 'ABA Clínico',
    description: 'Gestión clínica para terapias ABA',
    manifest: '/manifest.webmanifest',
    applicationName: 'ABA Clínico',
    appleWebApp: { capable: true, title: 'ABA Clínico', statusBarStyle: 'default' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="es">
            <body><AppProviders><RecoveryHashBridge />{children}</AppProviders></body>
        </html>
    );
}
