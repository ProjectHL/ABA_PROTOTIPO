'use client';

import { type ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '@/theme';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <MantineProvider theme={theme} defaultColorScheme="light">
            <Notifications position="top-right" />
            {children}
        </MantineProvider>
    );
}
