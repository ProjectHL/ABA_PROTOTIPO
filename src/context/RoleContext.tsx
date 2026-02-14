
import { createContext, useState, type ReactNode } from 'react';
import { type UserRole, type RoleContextType } from '@/types/authUtils';

// Exportamos el Context para que useRole pueda consumirlo
export const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
    const [currentRole, setCurrentRole] = useState<UserRole>('admin');

    const value = {
        currentRole,
        setRole: setCurrentRole,
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
