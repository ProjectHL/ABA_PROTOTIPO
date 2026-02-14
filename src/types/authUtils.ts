export type UserRole = 'admin' | 'supervisor' | 'therapist' | 'family';

export interface RoleContextType {
    currentRole: UserRole;
    setRole: (role: UserRole) => void;
    isAdmin: boolean;
    isSupervisor: boolean;
    isTherapist: boolean; // Aplicador
    isFamily: boolean;
}
