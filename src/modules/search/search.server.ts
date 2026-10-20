'use server';
import { z } from 'zod';
import { loadIdentity } from '@/features/team/identity.server';
import { createClient } from '@/lib/supabase/server';
import { searchQuerySchema,searchResultSchema,type SearchResult } from './contracts';
type RpcResult={data:unknown;error:{code?:string;message:string}|null};
export async function searchAuthorizedResources(raw:unknown):Promise<SearchResult[]>{const request=z.object({clinicId:z.uuid(),query:searchQuerySchema}).strict().parse(raw);const identity=await loadIdentity();if(identity.active?.id!==request.clinicId)throw new Error('La clínica cambió; vuelve a abrir la búsqueda.');const db=await createClient();const rpc=db.rpc.bind(db) as unknown as (name:string,args:Record<string,unknown>)=>PromiseLike<RpcResult>;const result=await rpc('aba_authorized_search_v2',{p_organization_id:request.clinicId,p_query:request.query,p_limit:30});if(result.error)throw new Error(result.error.code==='42501'?'No tienes acceso vigente a esta clínica.':'No se pudo completar la búsqueda autorizada.');return z.array(searchResultSchema).parse(result.data);}
