'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { Container,Title,Text,Stack,Alert,Button,Loader } from '@mantine/core';
import { MainLayout } from '@/components/MainLayout';
import { useIdentity } from '@/context/IdentityContext';
import { TeamManagement } from '@/features/team/TeamManagement';
import { loadTeam } from '@/features/team/identity.server';
import type { TeamMember } from '@/features/team/identity.types';
export default function TeamPage() {
  const {identity,verified,refresh:refreshIdentity}=useIdentity();const [members,setMembers]=useState<TeamMember[]>([]);const [error,setError]=useState<string|null>(null);const [loading,setLoading]=useState(true);const sequence=useRef(0);
  const scope=`${identity?.userId??''}:${identity?.active?.id??''}`;
  const clinicId=identity?.active?.id??'';
  const previousScope=useRef(scope);
  const refresh=useCallback(async()=>{const request=++sequence.current;setLoading(true);setError(null);try{const result=await loadTeam(clinicId);if(request===sequence.current)setMembers(result);}catch(cause){if(request===sequence.current)setError(cause instanceof Error?cause.message:'No se pudo actualizar el equipo. Los cambios ya confirmados siguen guardados.');}finally{if(request===sequence.current)setLoading(false);}},[clinicId]);
  useEffect(()=>{if(previousScope.current!==scope){sequence.current++;setMembers([]);setError(null);previousScope.current=scope;}},[scope]);
  useEffect(()=>{if(!verified||!clinicId||identity?.active?.role!=='admin')return;const cleanupSequence=sequence;const timer=setTimeout(()=>void refresh(),0);return()=>{clearTimeout(timer);cleanupSequence.current++;};},[refresh,verified,clinicId,identity?.active?.role]);
  return <MainLayout><Container size="xl"><Stack gap="xl"><div><Title order={2}>Gestión de Equipo Terapéutico</Title><Text c="dimmed" size="sm">Administra los perfiles de tu equipo y supervisa su desempeño</Text></div>
    {identity?.active?.role!=='admin'?<Alert color="yellow">La administración de equipo está limitada a administradores de la clínica activa. Tu perfil se edita desde la cabecera.</Alert>:<>{loading&&<Loader size="sm"/>}{error&&<Alert color="red">{error}<Button variant="subtle" onClick={()=>void refresh()}>Reintentar lectura</Button></Alert>}<TeamManagement key={scope} clinicId={clinicId} members={previousScope.current===scope?members:[]} onRefresh={refresh} onIdentityRefresh={refreshIdentity}/></>}</Stack></Container></MainLayout>;
}
