export type UserRole = 'admin' | 'supervisor' | 'therapist' | 'family';

export interface RoleContextType {
    currentRole: UserRole | null;
    membershipRole: string | null;
    loading: boolean;
    isAdmin: boolean;
    isSupervisor: boolean;
    isTherapist: boolean; // Aplicador
    isFamily: boolean;
}
