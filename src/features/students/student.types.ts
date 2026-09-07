/**
 * Modelo de presentación de la carpeta. No es el contrato de escritura de
 * `public.clients`: los campos no existentes en la BD se representan como
 * vacíos/no disponibles hasta que su vertical clínica esté implementada.
 */
export interface MedicationRecord {
    id: string;
    name: string;
    dose: string;
    frequency: string;
    status: 'active' | 'inactive';
    startDate: string;
    endDate?: string;
    prescribedBy: string;
    notes?: string;
    history?: MedicationRecord[];
}

export interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimaryContact: boolean;
}

export interface LegalDocument {
    id: string;
    name: string;
    type: 'consent' | 'medical' | 'authorization' | 'other';
    uploadDate: string;
    fileUrl: string;
    fileSize: string;
}

export interface StudentProfile {
    id: string;
    avatar?: string;
    /** Solo iniciales clínicas; la tabla clients no conserva nombre completo. */
    fullName: string;
    /** Identificador clínico, no RUT ni documento de identidad. */
    identityNumber: string;
    dateOfBirth: string;
    age: number;
    /** El diagnóstico no se infiere desde los datos disponibles. */
    diagnosis: string;
    consultationReason: string;
    hasActiveSession: boolean;
    familyAccessEnabled: boolean;
    familyMembers: FamilyMember[];
    medications: MedicationRecord[];
    legalDocuments: LegalDocument[];
    registrationDate: string;
    lastSessionDate?: string;
    assignedTherapist?: string;
    status?: 'active' | 'inactive';
}
