'use client';
import { createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode } from 'react';
import { sessionIdentityAction } from '@/modules/auth/actions';
import { loadIdentity,selectIdentityClinic } from '@/features/team/identity.server';
import type { IdentityDto } from '@/features/team/identity.types';
import { getOfflineIdentity } from '@/modules/offline/offline-store';
type IdentityState={identity:IdentityDto|null;loading:boolean;verified:boolean;error:string|null;refresh:()=>Promise<void>;selectClinic:(id:string)=>Promise<void>};
const IdentityContext=createContext<IdentityState|undefined>(undefined);
const LAST_USER_KEY='aba:last-user-id';
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
      const session=await sessionIdentityAction();
      if(!live.current||request!==sequence.current)return;
      if(!session) {
        if(identityRef.current)throw new Error('La sesión debe revalidarse. Conserva tu trabajo e inicia sesión nuevamente.');
        identityRef.current=null;setIdentity(null);setVerified(false);return;
      }
      if(identityRef.current&&session.userId!==identityRef.current.userId) {identityRef.current=null;setIdentity(null);setVerified(false);}
      window.localStorage.setItem(LAST_USER_KEY,session.userId);
      const next=await loadIdentity();
      if(live.current&&request===sequence.current) {identityRef.current=next;setIdentity(next);setVerified(!!next);}
    } catch(cause) {
      if(live.current&&request===sequence.current&&typeof navigator!=='undefined'&&!navigator.onLine) {
        const cachedId=window.localStorage.getItem(LAST_USER_KEY);
        const cached=cachedId?await getOfflineIdentity(cachedId):null;
        if(cached&&live.current&&request===sequence.current){identityRef.current=cached;setIdentity(cached);setVerified(false);setError('Modo offline: identidad local coincidente. Los permisos se revalidarán antes de sincronizar.');return;}
      }
      if(live.current&&request===sequence.current) setError(cause instanceof Error?cause.message:'No se pudo verificar tu identidad.');
    } finally {if(live.current&&request===sequence.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    live.current=true;const scheduledTimers=timers.current;const sequenceRef=sequence;
    const schedule=()=>{const timer=setTimeout(()=>{scheduledTimers.delete(timer);void refresh();},0);scheduledTimers.add(timer);};
    schedule();
    // Revalidate when the tab becomes visible or the network returns. The
    // server remains the only authority; there is no client auth subscription.
    const onVisible=()=>{if(document.visibilityState==='visible')schedule();};
    window.addEventListener('online',schedule);
    document.addEventListener('visibilitychange',onVisible);
    return()=>{live.current=false;window.removeEventListener('online',schedule);document.removeEventListener('visibilitychange',onVisible);for(const timer of scheduledTimers)clearTimeout(timer);scheduledTimers.clear();sequenceRef.current++;};
  },[refresh]);
  const selectClinic=useCallback(async(id:string)=>{await selectIdentityClinic(id);await refresh();},[refresh]);
  return <IdentityContext.Provider value={{identity,loading,verified,error,refresh,selectClinic}}>{children}</IdentityContext.Provider>;
}
export function useIdentity() {const value=useContext(IdentityContext);if(!value)throw new Error('IdentityProvider requerido');return value;}
