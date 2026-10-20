'use client';

import { useRef, type ReactNode } from 'react';
import { IdentityShell, type IdentityShellSlots } from '@/context/IdentityShell';
import { NotificationsBell } from '@/modules/notifications/NotificationsBell';
import { AuthorizedSearch } from '@/modules/search/AuthorizedSearch';
import { OfflineStatus, useOffline } from '@/modules/offline';
import { useIdentity } from '@/context/IdentityContext';

interface MainLayoutProps {
    children: ReactNode;
    slots?: IdentityShellSlots;
}

export function MainLayout({ children, slots }: MainLayoutProps) {
    const offline = useOffline();
    const { identity } = useIdentity();
    const actorKey = identity?.userId ?? 'signed-out';
    const searchKey = `${actorKey}:${identity?.active?.id ?? 'no-clinic'}`;
    const notificationLeaveGuard = useRef<(() => boolean) | null>(null);
    const beforeNavigate = async (path: string) => {
        if (notificationLeaveGuard.current && !notificationLeaveGuard.current()) return false;
        return slots?.beforeNavigate ? slots.beforeNavigate(path) : true;
    };
    const beforeNativeNavigate = (path: string) => {
        if (notificationLeaveGuard.current && !notificationLeaveGuard.current()) return false;
        return slots?.beforeNativeNavigate ? slots.beforeNativeNavigate(path) : true;
    };
    const beforeSignOut = async () => {
        if (notificationLeaveGuard.current && !notificationLeaveGuard.current()) return false;
        if (slots?.beforeSignOut && !await slots.beforeSignOut()) return false;
        return offline.confirmScopeExit('cerrar sesión');
    };
    const beforeClinicChange = async (id: string) => {
        if (notificationLeaveGuard.current && !notificationLeaveGuard.current()) return false;
        if (slots?.beforeClinicChange && !await slots.beforeClinicChange(id)) return false;
        return offline.confirmScopeExit('cambiar de clínica');
    };
    return <IdentityShell slots={{
        ...slots,
        search: slots?.search ?? <AuthorizedSearch key={`search:${searchKey}`} beforeNavigate={beforeNavigate}/>,
        notifications: slots?.notifications ?? <NotificationsBell key={`notifications:${actorKey}`} beforeNavigate={beforeNavigate} leaveGuard={notificationLeaveGuard}/>,
        offline: slots?.offline ?? <OfflineStatus key={`offline:${searchKey}`}/>,
        beforeSignOut,
        beforeClinicChange,
        beforeNavigate,
        beforeNativeNavigate,
    }}>{children}</IdentityShell>;
}
