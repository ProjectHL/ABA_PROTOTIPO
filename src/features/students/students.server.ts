import { requireSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';
import { mapClientToStudentProfile, type ClientRow } from './students.repository';
import { type StudentProfile } from './student.types';

const studentColumns = 'id, clinical_id, initials, birth_date, status, created_at';

export async function listStudentsOnServer(): Promise<StudentProfile[]> {
    const db = dbAsUser((await requireSessionUser()).id);
    const { data, error } = await db
        .from('clients')
        .select(studentColumns)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as ClientRow[] ?? []).map(mapClientToStudentProfile);
}

export async function getStudentOnServer(studentId: string): Promise<StudentProfile | null> {
    const db = dbAsUser((await requireSessionUser()).id);
    const { data, error } = await db
        .from('clients')
        .select(studentColumns)
        .eq('id', studentId)
        .maybeSingle();

    if (error) throw error;
    return data ? mapClientToStudentProfile(data as ClientRow) : null;
}
