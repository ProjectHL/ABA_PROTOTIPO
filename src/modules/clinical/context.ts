import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { dbAsUser } from '@/lib/db';

export async function clinicalContext() {
    const currentUser=await getSessionUser();if(!currentUser)redirect('/login');const db=dbAsUser(currentUser.id);
    const user=currentUser;
    
    const memberships=await db.from('memberships').select('organization_id,role,status').eq('user_id',user.id).eq('status','active');
    if(memberships.error) throw new Error('No se pudo verificar tu membresía.');
    const organizations=await db.from('organizations').select('id,name').eq('status','active');
    if(organizations.error) throw new Error('No se pudo consultar la clínica.');
    const choices=(memberships.data??[]).filter(m=>['admin','supervisor','therapist','clinician'].includes(m.role))
        .flatMap(m=>(organizations.data??[]).filter(o=>o.id===m.organization_id).map(o=>({...o,role:m.role})));
    const cookie=(await cookies()).get('aba-clinic')?.value;
    const active=choices.find(c=>c.id===cookie)??(choices.length===1?choices[0]:null);
    return {db,user,choices,active};
}
