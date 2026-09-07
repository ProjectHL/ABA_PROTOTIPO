import { createClient } from '@/lib/supabase/client';
import { type Database } from '@/lib/supabase/database.types';
import { type StudentProfile } from './student.types';

export type ClientRow = Pick<Database['public']['Tables']['clients']['Row'],
    'id' | 'clinical_id' | 'initials' | 'birth_date' | 'status' | 'created_at'>;

function calculateAge(birthDate: string): number {
    const today = new Date();
    const date = new Date(`${birthDate}T00:00:00`);
    let age = today.getFullYear() - date.getFullYear();
    const beforeBirthday = today.getMonth() < date.getMonth()
        || (today.getMonth() === date.getMonth() && today.getDate() < date.getDate());

    if (beforeBirthday) age -= 1;
    return Math.max(age, 0);
}

/**
 * Mapea únicamente columnas existentes y autorizadas de `public.clients`.
 * No completa nombre, RUT, diagnóstico, familiares, medicación ni sesiones
 * con datos inventados; esas verticales tienen contratos propios pendientes.
 */
export function mapClientToStudentProfile(client: ClientRow): StudentProfile {
    return {
        id: client.id,
        fullName: client.initials,
        identityNumber: client.clinical_id,
        dateOfBirth: client.birth_date,
        age: calculateAge(client.birth_date),
        diagnosis: 'No disponible en esta vista',
        consultationReason: 'No disponible en esta vista',
        hasActiveSession: false,
        familyAccessEnabled: false,
        familyMembers: [],
        medications: [],
        legalDocuments: [],
        registrationDate: client.created_at.slice(0, 10),
        status: client.status === 'active' ? 'active' : 'inactive',
    };
}

export async function listStudents(): Promise<StudentProfile[]> {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('clients')
        .select('id, clinical_id, initials, birth_date, status, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapClientToStudentProfile);
}
