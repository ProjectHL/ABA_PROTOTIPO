import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@/index.css';
import { type Metadata } from 'next';
import { AppProviders } from '@/components/AppProviders';

export const metadata: Metadata = {
    title: 'ABA Clínico',
    description: 'Gestión clínica para terapias ABA',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="es">
            <body><AppProviders>{children}</AppProviders></body>
        </html>
    );
}
