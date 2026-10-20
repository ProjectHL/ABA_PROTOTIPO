'use server';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { createClient } from '@/lib/supabase/server';
import { dashboardSnapshotSchema, type DashboardSnapshot } from './contracts';
type RpcResult={data:unknown;error:{code?:string;message:string}|null};
export async function loadDashboardSnapshot(clinicIdRaw:string):Promise<DashboardSnapshot>{const clinicId=z.uuid().parse(clinicIdRaw);const identity=await loadIdentity();if(identity.active?.id!==clinicId)throw new Error('La clínica cambió; vuelve a cargar el panel.');if(identity.active.role==='family'||identity.active.role==='external')throw new Error('El panel clínico requiere un rol profesional vigente.');const db=await createClient();const rpc=db.rpc.bind(db) as unknown as (name:string,args:Record<string,unknown>)=>PromiseLike<RpcResult>;const result=await rpc('aba_dashboard_read_v2',{p_organization_id:clinicId});if(result.error||!result.data)throw new Error(result.error?.code==='42501'?'No tienes acceso vigente al panel de esta clínica.':'No se pudo recuperar la proyección persistida del panel.');const snapshot=dashboardSnapshotSchema.parse(result.data);if(snapshot.actorId!==identity.userId||snapshot.clinicId!==clinicId)throw new Error('La proyección no corresponde a la identidad autenticada.');return snapshot;}
