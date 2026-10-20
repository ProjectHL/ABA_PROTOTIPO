'use client';
import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { loadIdentity,selectIdentityClinic } from '@/features/team/identity.server';
import type { IdentityDto } from '@/features/team/identity.types';
import { getOfflineIdentity } from '@/modules/offline/offline-store';
type IdentityState={identity:IdentityDto|null;loading:boolean;verified:boolean;error:string|null;refresh:()=>Promise<void>;selectClinic:(id:string)=>Promise<void>};
const IdentityContext=createContext<IdentityState|undefined>(undefined);
export function IdentityProvider({children}:{children:ReactNode}) {
  const [identity,setIdentity]=useState<IdentityDto|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [verified,setVerified]=useState(false);
  const sequence=useRef(0);
  const identityRef=useRef<IdentityDto|null>(null);
  const live=useRef(true);
  const timers=useRef(new Set<ReturnType<typeof setTimeout>>());
  const refresh=useCallback(async()=>{
    if(!live.current)return;
    const request=++sequence.current; setLoading(true);setVerified(false); setError(null);
    try {
      const {data:{user},error:authError}=await createClient().auth.getUser();
      if(!live.current||request!==sequence.current)return;
      if(user&&identityRef.current&&user.id!==identityRef.current.userId) {identityRef.current=null;setIdentity(null);setVerified(false);}
      if(authError)throw new Error('No se pudo revalidar la sesión. Tu trabajo permanece visible, pero nuevos comandos requieren conexión y permisos vigentes.');
      if(!user&&identityRef.current)throw new Error('La sesión debe revalidarse. Conserva tu trabajo e inicia sesión nuevamente.');
      const next=!authError&&user?await loadIdentity():null;
      if(live.current&&request===sequence.current) {identityRef.current=next;setIdentity(next);setVerified(!!next);}
    } catch(cause) {
      if(live.current&&request===sequence.current&&typeof navigator!=='undefined'&&!navigator.onLine) {
        const {data:{session}}=await createClient().auth.getSession();
        const cached=session?.user.id?await getOfflineIdentity(session.user.id):null;
        if(cached&&live.current&&request===sequence.current){identityRef.current=cached;setIdentity(cached);setVerified(false);setError('Modo offline: identidad local coincidente. Los permisos se revalidarán antes de sincronizar.');return;}
      }
      if(live.current&&request===sequence.current) setError(cause instanceof Error?cause.message:'No se pudo verificar tu identidad.');
    } finally {if(live.current&&request===sequence.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    live.current=true;const db=createClient();const scheduledTimers=timers.current;const sequenceRef=sequence;
    const schedule=()=>{const timer=setTimeout(()=>{scheduledTimers.delete(timer);void refresh();},0);scheduledTimers.add(timer);};
    schedule();
    const {data:{subscription}}=db.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT') {sequence.current++;identityRef.current=null;setIdentity(null);setVerified(false);setLoading(false);return;}
      if(session?.user.id&&identityRef.current&&session.user.id!==identityRef.current.userId) {sequence.current++;identityRef.current=null;setIdentity(null);setVerified(false);}
      // Refreshing the SAME identity must never unmount clinical forms or pending captures.
      schedule();
    });
    // A cached offline identity is deliberately unverified. Revalidate it as
    // soon as transport returns so the durable queue can synchronize safely.
    window.addEventListener('online',schedule);
    return()=>{live.current=false;window.removeEventListener('online',schedule);for(const timer of scheduledTimers)clearTimeout(timer);scheduledTimers.clear();sequenceRef.current++;subscription.unsubscribe();};
  },[refresh]);
  const selectClinic=useCallback(async(id:string)=>{await selectIdentityClinic(id);await refresh();},[refresh]);
  return <IdentityContext.Provider value={{identity,loading,verified,error,refresh,selectClinic}}>{children}</IdentityContext.Provider>;
}
export function useIdentity() {const value=useContext(IdentityContext);if(!value)throw new Error('IdentityProvider requerido');return value;}
