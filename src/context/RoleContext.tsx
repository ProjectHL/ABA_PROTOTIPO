
import { useEffect, useState, type ReactNode } from 'react';
import { type UserRole } from '@/types/authUtils';
import { RoleContext } from './roleContextDefinition';
import { createClient } from '@/lib/supabase/client';

export function RoleProvider({ children }: { children: ReactNode }) {
    const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
    const [membershipRole, setMembershipRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        const supabase = createClient();

        const loadAuthorization = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                if (mounted) {
                    setCurrentRole(null);
                    setMembershipRole(null);
                    setLoading(false);
                }
                return;
            }

            const { data, error } = await supabase
                .from('memberships')
                .select('role')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!mounted) return;

            if (error || !data) {
                setCurrentRole(null);
                setMembershipRole(null);
                setLoading(false);
                return;
            }

            const uiRole: UserRole = data.role === 'admin'
                ? 'admin'
                : data.role === 'supervisor'
                    ? 'supervisor'
                    : data.role === 'clinician' || data.role === 'therapist'
                        ? 'therapist'
                        : 'family';

            setMembershipRole(data.role);
            setCurrentRole(uiRole);
            setLoading(false);
        };

        void loadAuthorization();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => void loadAuthorization());

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const value = {
        currentRole,
        membershipRole,
        loading,
        isAdmin: currentRole === 'admin',
        isSupervisor: currentRole === 'supervisor',
        isTherapist: currentRole === 'therapist',
        isFamily: currentRole === 'family',
    };

    return (
        <RoleContext.Provider value={value}>
            {children}
        </RoleContext.Provider>
    );
}

// Eliminamos useRole de aquí ya que lo movimos a src/hooks/useRole.ts
