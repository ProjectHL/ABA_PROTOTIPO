'use client';

import { type ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '@/theme';
import { RoleProvider } from '@/context/RoleContext';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <MantineProvider theme={theme} defaultColorScheme="light">
            <Notifications position="top-right" />
            <RoleProvider>{children}</RoleProvider>
        </MantineProvider>
    );
}
