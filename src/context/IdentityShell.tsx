'use client';
import { useEffect,useRef,useState,type ReactNode } from 'react';
import { AppShell,Burger,Group,NavLink,Text,Avatar,Menu,Box,Badge,Stack,Button,Select,Alert,Loader,Modal } from '@mantine/core';
import { useDisclosure,useMediaQuery } from '@mantine/hooks';
import { Home,Users,FolderOpen,FileCheck,LogOut,Edit,HelpCircle,Sparkles,Mail,ChevronRight,Building2,Stethoscope,CalendarDays,HeartHandshake } from 'lucide-react';
import { usePathname,useRouter,useSearchParams } from 'next/navigation';
import { signOutAction } from '@/modules/auth/actions';
import { useIdentity } from './IdentityContext';
import { ProfileSettings } from '@/features/team/ProfileSettings';
import { saveProfessionalProfile } from '@/features/team/identity.server';
import { useProfileAvatar } from '@/features/team/useProfileAvatar';
import { AuthEmailChange } from '@/features/team/AuthForms';
import { UpgradePlanModal } from '@/components/UpgradePlanModal';
// MainLayout proposal implemented separately for orchestrator integration. No parallel clinical app.
let shellHistorySequence=0;
export interface IdentityShellSlots {
  search?:ReactNode; notifications?:ReactNode; offline?:ReactNode;
  beforeSignOut?:()=>Promise<boolean>; beforeClinicChange?:(id:string)=>Promise<boolean>;
  beforeNavigate?:(path:string)=>Promise<boolean>;
  beforeNativeNavigate?:(path:string)=>boolean;
  support?:ReactNode; plan?:ReactNode;
  planModal?:(opened:boolean,onClose:()=>void)=>ReactNode;
}
export function IdentityShell({children,slots={}}:{children:ReactNode;slots?:IdentityShellSlots}) {
  const {identity,loading,verified,error,refresh,selectClinic}=useIdentity();
  const mobileViewport=useMediaQuery('(max-width: 47.99em)');
  const [opened,{toggle,close}]=useDisclosure();
  const [editOpened,{open:openEdit,close:closeEdit}]=useDisclosure();
  const [upgradeOpened,{open:openUpgrade,close:closeUpgrade}]=useDisclosure();
  const [emailOpened,{open:openEmail,close:closeEmail}]=useDisclosure();
  const avatar=useProfileAvatar(identity?.profile.avatarObjectPath??null);
  const [actionError,setActionError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const router=useRouter();const pathname=usePathname();const searchParams=useSearchParams();
  const historyIndex=useRef<number|null>(null);const restoringHistory=useRef(false);
  const beforeNativeNavigate=slots.beforeNativeNavigate;
  const routeKey=pathname+(searchParams.size?`?${searchParams.toString()}`:'');
  useEffect(()=>{
    const state=window.history.state as Record<string,unknown>|null;
    const existing=typeof state?.__abaHistoryIndex==='number'?state.__abaHistoryIndex:null;
    if(existing!==null){historyIndex.current=existing;shellHistorySequence=Math.max(shellHistorySequence,existing);return;}
    const next=++shellHistorySequence;historyIndex.current=next;
    window.history.replaceState({...state,__abaHistoryIndex:next},'',window.location.href);
  },[routeKey]);
  useEffect(()=>{
    if(!beforeNativeNavigate)return;
    const onPopState=(event:PopStateEvent)=>{
      const targetIndex=typeof event.state?.__abaHistoryIndex==='number'?event.state.__abaHistoryIndex:null;
      if(restoringHistory.current){restoringHistory.current=false;historyIndex.current=targetIndex;event.stopImmediatePropagation();return;}
      const destination=window.location.pathname+window.location.search;
      if(beforeNativeNavigate(destination)){historyIndex.current=targetIndex;return;}
      event.stopImmediatePropagation();restoringHistory.current=true;
      const current=historyIndex.current;
      if(current!==null&&targetIndex!==null&&current!==targetIndex)window.history.go(current-targetIndex);
      else window.history.forward();
    };
    window.addEventListener('popstate',onPopState,{capture:true});
    return()=>window.removeEventListener('popstate',onPopState,{capture:true});
  },[beforeNativeNavigate]);
  const go=async(path:string)=>{if(slots.beforeNavigate&&!await slots.beforeNavigate(path))return;router.push(path);close();};
  const run=async(action:()=>Promise<void>)=>{setActionError(null);setBusy(true);try{await action();}catch(cause){setActionError(cause instanceof Error?cause.message:'No se confirmó la acción.');}finally{setBusy(false);}};
  const signOut=()=>run(async()=>{
    if(slots.beforeSignOut && !await slots.beforeSignOut())return;
    await signOutAction();
    await refresh();router.replace('/login');router.refresh();
  });
  if(loading&&!identity)return <Stack align="center" p="xl"><Loader/><Text>Verificando identidad y permisos…</Text></Stack>;
  if(!identity)return <Alert color="red" title="Acceso no disponible">{error??'Tu sesión no está disponible.'}<Button variant="subtle" onClick={()=>router.replace('/login')}>Iniciar sesión</Button><Button onClick={()=>void refresh()}>Reintentar</Button></Alert>;
  const profile=identity.profile;const role=identity.active?.role;
  const roleColor=role==='admin'?'blue':role==='supervisor'?'indigo':role==='therapist'?'green':role==='family'?'pink':'violet';
  const RoleIcon=role==='admin'?Building2:role==='therapist'?Stethoscope:role==='family'?HeartHandshake:FileCheck;
  // Chat is deliberately outside the current release scope. Its contracts and
  // persistence remain dormant for a later paid upgrade; no live navigation is exposed.
  const clinicalNav=[{icon:Home,label:'Dashboard',path:'/dashboard'},{icon:Users,label:'Mi Equipo',path:'/team'},{icon:FolderOpen,label:'Carpetas de Estudiantes',path:'/students'},{icon:CalendarDays,label:'Agenda',path:'/calendar'},{icon:FileCheck,label:'Accesos Compartidos',path:'/shared-access'}];
  // Each role only gets destinations it can actually use: `/team` is admin-only
  // and an external identity works through explicit resource grants.
  const staffNav=clinicalNav.filter(item=>item.path!=='/team'||role==='admin');
  const nav=role==='family'
    ?[{icon:HeartHandshake,label:'Portal Familiar',path:'/family'},{icon:FileCheck,label:'Invitaciones',path:'/invitations'}]
    :role==='external'
      ?[{icon:FileCheck,label:'Accesos Compartidos',path:'/shared-access'}]
      :staffNav;
  return <AppShell header={{height:70}} navbar={{width:280,breakpoint:'sm',collapsed:{mobile:!opened}}} padding="md">
    <AppShell.Header><Group h="100%" px="md" justify="space-between"><Group><Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm"/><Avatar color={roleColor} radius="sm" size="md"><RoleIcon size={16}/></Avatar><Box><Text fw={700} size="lg">{identity.active?.name??'ABA Clínico'}</Text><Group gap={6}><Text size="xs" c="dimmed">ABA Clínico</Text><Badge color={roleColor} size="xs" variant="light">{role??'Sin clínica activa'}</Badge></Group></Box></Group><Group>
      {slots.search}
      {slots.notifications}
      {slots.offline}
      <Menu shadow="md" width={220}><Menu.Target><Button variant="subtle" color="gray" px={0} aria-label="Menú de perfil"><Group gap="xs"><Avatar src={avatar} color={profile.avatarPreset} radius="xl" size="md">{profile.name.slice(0,2)||'?'}</Avatar><Box visibleFrom="sm"><Text size="sm" fw={500}>{profile.name||identity.email}</Text><Text size="xs" c="dimmed">{profile.profession}</Text></Box></Group></Button></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<Edit size={16}/>} onClick={openEdit} disabled={!identity.active}>Editar Perfil</Menu.Item><Menu.Item onClick={()=>go('/change-password')}>Cambiar contraseña</Menu.Item><Menu.Item onClick={openEmail}>Cambiar correo de acceso</Menu.Item><Menu.Divider/><Menu.Item leftSection={<LogOut size={16}/>} color="red" onClick={()=>void signOut()} disabled={busy}>Cerrar Sesión</Menu.Item></Menu.Dropdown></Menu>
    </Group></Group></AppShell.Header>
    <AppShell.Navbar p="md"><AppShell.Section grow><Select label="Clínica activa" placeholder="Selecciona tu clínica" value={identity.active?.id??null} data={identity.choices.map(choice=>({value:choice.id,label:choice.name}))} disabled={busy||loading} mb="md" onChange={id=>{if(id)void run(async()=>{if(slots.beforeClinicChange&&!await slots.beforeClinicChange(id))return;await selectClinic(id);router.refresh();});}}/>
      {nav.map(item=>{const Icon=item.icon;return <NavLink key={item.path} label={item.label} leftSection={<Icon size={18}/>} active={pathname===item.path||pathname.startsWith(item.path+'/')} onClick={()=>go(item.path)} mb="xs" disabled={!identity.active&&item.path!=='/shared-access'}/>;})}
    </AppShell.Section><AppShell.Section><Stack gap="xs" p="md" style={{borderTop:'1px solid var(--mantine-color-gray-2)'}}><Box><Group gap="sm" mb={4}><Avatar src={avatar} color={profile.avatarPreset} size="md" radius="md">{profile.name.slice(0,2)}</Avatar><Box style={{flex:1}}><Text size="sm" fw={600} lineClamp={1}>{profile.name||identity.email}</Text><Text size="xs" c="dimmed" lineClamp={1}>{profile.title}</Text></Box></Group><Text size="xs" c="dimmed" lineClamp={2} mb="sm">{profile.description}</Text></Box>
      {role==='admin'&&(slots.plan??<Button fullWidth variant="gradient" gradient={{from:'blue',to:'cyan'}} size="xs" leftSection={<Sparkles size={14}/>} onClick={openUpgrade}>Upgrade de plan</Button>)}
      {slots.support??<Menu position={mobileViewport?"top-start":"right-end"} shadow="md" width={200}><Menu.Target><Button fullWidth variant="subtle" color="gray" size="xs" justify="space-between" leftSection={<HelpCircle size={14}/>} rightSection={<ChevronRight size={14}/>}>Soporte</Button></Menu.Target><Menu.Dropdown><Menu.Label>Ayuda y Contacto</Menu.Label><Menu.Item leftSection={<HelpCircle size={14}/>} onClick={()=>go('/help')}>Ayuda</Menu.Item><Menu.Item leftSection={<Mail size={14}/>} onClick={()=>go('/support')}>Contacto</Menu.Item></Menu.Dropdown></Menu>}
    </Stack></AppShell.Section></AppShell.Navbar>
    <AppShell.Main>{error&&<Alert color="yellow" mb="md" title="Revalidación pendiente">{error}<Button variant="subtle" onClick={()=>void refresh()} loading={loading}>Reintentar</Button></Alert>}{!verified&&identity&&<Text c="dimmed" size="xs" mb="sm">Permisos pendientes de revalidación. No se confirma ningún comando desde este estado.</Text>}{actionError&&<Alert color="red" mb="md" withCloseButton onClose={()=>setActionError(null)}>{actionError}</Alert>}{!identity.active&&<Alert color="yellow" mb="md">Selecciona una clínica autorizada. Identidades externas y familiares acceden por recursos específicos, no por una membresía general.</Alert>}{children}</AppShell.Main>
    <Modal opened={editOpened} onClose={closeEdit} title="Editar Mi Perfil" size="lg"><ProfileSettings key={profile.id} profile={profile} clinicId={identity.active?.id??''} onSave={async(payload,operation,expectedVersion,expectedClinicId)=>{await saveProfessionalProfile({clinicId:expectedClinicId,targetUserId:profile.id,expectedVersion,payload,...operation});closeEdit();await refresh();}}/></Modal>
    {slots.planModal?slots.planModal(upgradeOpened,closeUpgrade):<UpgradePlanModal opened={upgradeOpened} onClose={closeUpgrade} onSelect={id=>{closeUpgrade();void go('/plans?plan='+encodeURIComponent(id));}}/>}
    <Modal opened={emailOpened} onClose={closeEmail} title="Cambiar mi correo"><AuthEmailChange email={identity.email}/></Modal>
  </AppShell>;
}
