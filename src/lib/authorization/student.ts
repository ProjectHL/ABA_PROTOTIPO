import { getSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';

export type StudentCapability =
    | 'student.view'
    | 'student.edit'
    | 'program.view'
    | 'program.create'
    | 'program.edit'
    | 'record_config.view'
    | 'record_config.create'
    | 'record_config.edit'
    | 'record.view'
    | 'record.capture'
    | 'record.submit'
    | 'chart.view'
    | 'chart.configure'
    | 'result.download'
    | 'authorization.request'
    | 'authorization.decide'
    | 'authorization.revoke';

export async function getStudentCapabilities(studentId: string): Promise<string[] | null> {
    const currentUser=await getSessionUser();if(!currentUser)return null;const db=dbAsUser(currentUser.id);

    const { data, error } = await db.rpc('get_student_capabilities', {
        p_client_id: studentId,
    });

    if (error) return null;
    return data as unknown as string[] | null;
}

export async function hasStudentCapability(
    studentId: string,
    capability: StudentCapability,
): Promise<boolean> {
    const capabilities = await getStudentCapabilities(studentId);
    return capabilities?.includes(capability) ?? false;
}
