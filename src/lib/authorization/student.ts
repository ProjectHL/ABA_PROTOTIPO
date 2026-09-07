import { createClient } from '@/lib/supabase/server';

export type StudentCapability =
    | 'student.view'
    | 'student.edit'
    | 'program.view'
    | 'record.capture'
    | 'chart.view';

export async function getStudentCapabilities(studentId: string): Promise<string[] | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase.rpc('get_student_capabilities', {
        p_client_id: studentId,
    });

    if (error) return null;
    return data;
}

export async function hasStudentCapability(
    studentId: string,
    capability: StudentCapability,
): Promise<boolean> {
    const capabilities = await getStudentCapabilities(studentId);
    return capabilities?.includes(capability) ?? false;
}
