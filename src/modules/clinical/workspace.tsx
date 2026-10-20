'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert,Badge,Button,Container,Group,Modal,Paper,Select,SimpleGrid,Stack,Tabs,Text,Textarea,TextInput,Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/lib/supabase/client';
import { SessionResultsPanel } from '@/modules/program-session';
import type { ProgramSessionPageData } from '@/modules/program-session';
import { ProgramManagementV2 } from '@/features/programs';
import { clinicalCommand,selectClinic } from './actions';
import { type ClinicalCommand,type StudentInput } from './contracts';
import type { WorkspaceData } from './page';
import type { Json } from '@/lib/supabase/database.types';

type Run=(command:ClinicalCommand,confirmation?:{title:string;message:string})=>Promise<Json|undefined>;
const field=(form:FormData,key:string)=>String(form.get(key)??'');
const roles={admin:'Admin / clínica',supervisor:'Profesional / supervisor',therapist:'Profesional / técnico',clinician:'Profesional'};
function Panel({title,children}:{title:string;children:ReactNode}) {return <Paper p="lg" withBorder><Stack><Title order={3}>{title}</Title>{children}</Stack></Paper>;}
function DateField({name,label,value=''}:{name:string;label:string;value?:string|null}){return <TextInput name={name} label={label} type="date" defaultValue={value??''}/>;}

export function ClinicalWorkspace({data,programSession,initialTab='record'}:{data:WorkspaceData;programSession:ProgramSessionPageData|null;initialTab?:string}) {
    const router=useRouter(); const [busy,setBusy]=useState(false); const [createOpen,setCreateOpen]=useState(false);
    const [error,setError]=useState('');
    const [statusDialog,setStatusDialog]=useState<'active'|'archived'|null>(null);
    const run:Run=async (command,confirmation)=>{
        setBusy(true);setError('');
        try {
            const result=await clinicalCommand(command);
            if(result.error){setError(result.error);return;}
            notifications.show({title:confirmation?.title??'Cambio confirmado',message:confirmation?.message??'El servidor confirmó el cambio.',color:'green'});
            router.refresh();return result.data??null;
        } catch {setError('No se pudo confirmar el cambio. Conserva los datos y vuelve a intentar.');}
        finally{setBusy(false);}
    };
    const student=data.student, canEdit=data.capabilities.includes('student.edit');
    const edit=canEdit&&student?.status!=='archived';
    const admin=data.active?.role==='admin';
    const activeStudents=data.students.filter(s=>s.status==='active');
    const archivedStudents=data.students.filter(s=>s.status==='archived');
    return <Container size="xl" py="xl"><Stack gap="lg">
        <Group justify="space-between"><div><Title order={1}>ABA Clínico</Title><Text size="sm" c="dimmed">{data.email} · {data.active?roles[data.active.role as keyof typeof roles]??'Sin perfil':''}</Text></div>
            <Button variant="outline" disabled={busy} onClick={async()=>{
                setBusy(true);
                try{const {error}=await createClient().auth.signOut();if(error){setError('No se pudo cerrar la sesión. Reintenta.');return;}router.replace('/login');router.refresh();}
                catch{setError('No se pudo cerrar la sesión. Reintenta.');}finally{setBusy(false);}
            }}>Cerrar sesión</Button></Group>
        <Select label="Clínica activa" placeholder="Selecciona tu clínica" value={data.active?.id??null} data={data.choices.map(c=>({value:c.id,label:c.name}))} onChange={async id=>{
            if(!id)return;const result=await selectClinic(id);if(result.error)setError(result.error);else{router.replace('/students');router.refresh();}
        }}/>
        {!data.choices.length&&<Alert color="yellow">Tu cuenta no tiene una membresía activa habilitada. Contacta al administrador.</Alert>}
        {error&&<Alert color="red" title="Revisa el resultado" withCloseButton onClose={()=>setError('')}>{error}</Alert>}
        {data.active&&<>
            <Group><Button component="a" href="/students" variant="light">Carpetas</Button>{admin&&<Button component="a" href="/team" variant="light">Administración</Button>}
                {['admin','supervisor'].includes(data.active.role)&&<Button onClick={()=>setCreateOpen(true)}>Nuevo estudiante</Button>}</Group>
            {!student?<>
                <Title order={2}>Carpetas autorizadas</Title>
                {data.students.length===0&&<Alert>No hay estudiantes registrados o asignados en esta clínica.</Alert>}
                {activeStudents.length>0&&<><Title order={3}>Fichas activas ({activeStudents.length})</Title><SimpleGrid cols={{base:1,sm:2,md:3}}>{activeStudents.map(s=><Paper key={s.id} withBorder p="lg"><Stack gap="xs"><Title order={3}>{s.initials}</Title><Text>ID clínico: {s.clinical_id}</Text><Badge color="green">Vigente</Badge><Button component="a" href={`/students/${s.id}`} variant="light">Abrir ficha</Button></Stack></Paper>)}</SimpleGrid></>}
                {archivedStudents.length>0&&<><Title order={3}>Fichas archivadas ({archivedStudents.length})</Title><Alert color="gray">Las fichas archivadas se conservan para consulta y pueden reactivarse desde su ficha.</Alert><SimpleGrid cols={{base:1,sm:2,md:3}}>{archivedStudents.map(s=><Paper key={s.id} withBorder p="lg"><Stack gap="xs"><Title order={3}>{s.initials}</Title><Text>ID clínico: {s.clinical_id}</Text><Badge color="gray">Archivado</Badge><Button component="a" href={`/students/${s.id}`} variant="light">Abrir ficha</Button></Stack></Paper>)}</SimpleGrid></>}
                {admin&&<Team data={data} run={run} busy={busy}/>}
            </>:<>
                <Group justify="space-between"><Title order={2}>{student.initials} · {student.clinical_id}</Title><Group><Badge color={student.status==='active'?'green':'gray'}>{student.status==='active'?'Vigente':'Archivado'}</Badge>{canEdit&&<Button color={student.status==='active'?'orange':'green'} variant="light" disabled={busy} onClick={()=>setStatusDialog(student.status==='active'?'archived':'active')}>{student.status==='active'?'Archivar ficha':'Reactivar ficha'}</Button>}</Group></Group>
                <Tabs defaultValue={initialTab} keepMounted={false}><Tabs.List><Tabs.Tab value="record">Ficha y familiares</Tabs.Tab><Tabs.Tab value="history">Historial y medicación</Tabs.Tab><Tabs.Tab value="programs">Programas</Tabs.Tab><Tabs.Tab value="sessions">Sesiones y resultados</Tabs.Tab>{admin&&<Tabs.Tab value="assignments">Asignaciones</Tabs.Tab>}</Tabs.List>
                    <Tabs.Panel value="record" pt="lg"><Stack>
                        <StudentForm key={student.updated_at} data={data} run={run} busy={busy} readOnly={!edit}/>
                        <Panel title="Contexto"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'context',clientId:student.id,expected:data.context?.version,home:field(f,'home'),school:field(f,'school'),adaptations:field(f,'adaptations')});}}>
                            <Stack><Textarea name="home" label="Adaptaciones del hogar" defaultValue={data.context?.home_adaptations??''} readOnly={!edit}/><Textarea name="school" label="Escolaridad" defaultValue={data.context?.schooling??''} readOnly={!edit}/><Textarea name="adaptations" label="Adaptaciones escolares" defaultValue={data.context?.school_adaptations??''} readOnly={!edit}/>{!data.context&&<Text c="dimmed">Contexto todavía no registrado.</Text>}{edit&&<Button type="submit" loading={busy}>Guardar contexto</Button>}</Stack></form></Panel>
                        <Consents data={data} run={run} busy={busy} readOnly={!edit}/>
                    </Stack></Tabs.Panel>
                    <Tabs.Panel value="history" pt="lg"><History data={data} run={run} busy={busy} edit={edit}/></Tabs.Panel>
                    <Tabs.Panel value="programs" pt="lg">{programSession
                        ? <ProgramManagementV2 data={programSession}
                            onRegisterData={()=>router.push(`/session/${programSession.studentId}`)}
                            onViewChart={()=>setError('Los gráficos clínicos se habilitarán desde el módulo A6; no se muestran datos provisionales.')} />
                        : <Alert color="yellow">La programación V2 no está disponible para esta ficha.</Alert>}
                    </Tabs.Panel>
                    <Tabs.Panel value="sessions" pt="lg"><SessionResultsPanel data={data}/></Tabs.Panel>
                    {admin&&<Tabs.Panel value="assignments" pt="lg"><Assignments data={data} run={run} busy={busy}/></Tabs.Panel>}
                </Tabs>
            </>}
        </>}
        <Modal opened={createOpen} onClose={()=>setCreateOpen(false)} title="Nuevo estudiante" size="lg"><StudentForm data={{...data,student:null,guardians:[],siblings:[]}} busy={busy} run={async c=>{const result=await run(c);if(result!==undefined){setCreateOpen(false);const id=(result as {id?:string})?.id;if(id)router.push(`/students/${id}`);}return result;}}/></Modal>
        <Modal opened={statusDialog!==null} onClose={()=>setStatusDialog(null)} title={statusDialog==='archived'?'Archivar ficha':'Reactivar ficha'} centered>
            <Stack>{statusDialog==='archived'?<Text>La ficha dejará de figurar entre las activas, pero sus datos clínicos se conservarán para consulta.</Text>:<Text>La ficha volverá a figurar entre las activas sin eliminar su historial.</Text>}<Group justify="flex-end"><Button variant="default" onClick={()=>setStatusDialog(null)}>Cancelar</Button><Button color={statusDialog==='archived'?'orange':'green'} loading={busy} onClick={async()=>{if(!student||!statusDialog)return;const next=statusDialog;const result=await run({op:'student-status',clientId:student.id,expected:student.updated_at,status:next},{title:next==='archived'?'Ficha archivada':'Ficha reactivada',message:next==='archived'?'El servidor confirmó el archivado de la ficha.':'El servidor confirmó la reactivación de la ficha.'});if(result!==undefined)setStatusDialog(null);}}>{statusDialog==='archived'?'Confirmar archivado':'Confirmar reactivación'}</Button></Group></Stack>
        </Modal>
    </Stack></Container>;
}

function StudentForm({data,run,busy,readOnly=false}:{data:WorkspaceData;run:Run;busy:boolean;readOnly?:boolean}) {
    const s=data.student;
    const [guardians,setGuardians]=useState(data.guardians.map(g=>({initials:g.initials,birth_date:g.birth_date??'',relationship:g.relationship??'',phone:g.phone??''})));
    const [siblings,setSiblings]=useState(data.siblings.map(g=>({initials:g.initials,birth_date:g.birth_date??''})));
    return <Panel title="Identificación y familiares"><form onSubmit={e=>{
        e.preventDefault();const f=new FormData(e.currentTarget);const payload:StudentInput={clinical_id:field(f,'clinical_id'),initials:field(f,'initials'),birth_date:field(f,'birth_date'),primary_language:field(f,'primary_language'),living_arrangement:field(f,'living_arrangement'),guardians,siblings};
        void run({op:'student',id:s?.id??null,expected:s?.updated_at??null,payload});
    }}><Stack><SimpleGrid cols={{base:1,sm:2}}>
        <TextInput name="clinical_id" label="Identificador clínico" required maxLength={64} defaultValue={s?.clinical_id??''} readOnly={readOnly}/><TextInput name="initials" label="Iniciales del estudiante" required maxLength={12} defaultValue={s?.initials??''} readOnly={readOnly}/>
        <TextInput name="birth_date" type="date" label="Fecha de nacimiento" required defaultValue={s?.birth_date??''} readOnly={readOnly}/><TextInput name="primary_language" label="Idioma principal" required defaultValue={s?.primary_language??'Español'} readOnly={readOnly}/>
    </SimpleGrid><Textarea name="living_arrangement" label="Convivencia" defaultValue={s?.living_arrangement??''} readOnly={readOnly}/>
        <Title order={4}>Responsables</Title>{!guardians.length&&<Text c="dimmed">Sin responsables registrados.</Text>}
        {guardians.map((g,i)=><Paper key={i} withBorder p="sm"><SimpleGrid cols={2}>{(['initials','birth_date','relationship','phone'] as const).map((key,k)=><TextInput key={key} label={['Iniciales','Nacimiento','Relación','Teléfono'][k]} type={key==='birth_date'?'date':'text'} value={g[key]} readOnly={readOnly} required={key==='initials'} onChange={e=>{const value=e.currentTarget.value;setGuardians(prev=>prev.map((x,j)=>j===i?{...x,[key]:value}:x));}}/>)}</SimpleGrid>{!readOnly&&<Button variant="subtle" color="red" onClick={()=>setGuardians(prev=>prev.filter((_,j)=>j!==i))}>Retirar responsable</Button>}</Paper>)}
        {!readOnly&&<Button variant="light" onClick={()=>setGuardians(prev=>[...prev,{initials:'',birth_date:'',relationship:'',phone:''}])}>Añadir responsable</Button>}
        <Title order={4}>Hermanos</Title>{!siblings.length&&<Text c="dimmed">Sin hermanos registrados.</Text>}
        {siblings.map((g,i)=><Group key={i}><TextInput label="Iniciales" required value={g.initials} readOnly={readOnly} onChange={e=>{const value=e.currentTarget.value;setSiblings(prev=>prev.map((x,j)=>j===i?{...x,initials:value}:x));}}/><TextInput type="date" label="Nacimiento" value={g.birth_date} readOnly={readOnly} onChange={e=>{const value=e.currentTarget.value;setSiblings(prev=>prev.map((x,j)=>j===i?{...x,birth_date:value}:x));}}/>{!readOnly&&<Button variant="subtle" color="red" onClick={()=>setSiblings(prev=>prev.filter((_,j)=>j!==i))}>Retirar</Button>}</Group>)}
        {!readOnly&&<><Button variant="light" onClick={()=>setSiblings(prev=>[...prev,{initials:'',birth_date:''}])}>Añadir hermano</Button><Button type="submit" loading={busy}>{s?'Guardar ficha':'Crear estudiante'}</Button></>}
    </Stack></form></Panel>;
}

function History({data,run,busy,edit}:{data:WorkspaceData;run:Run;busy:boolean;edit:boolean}) {
    const [kind,setKind]=useState<'reported_diagnosis'|'assessment'|'procedure'|'medication'>('medication');
    const [prior,setPrior]=useState<string|null>(null);const old=data.history.find(x=>x.id===prior);
    return <Stack><Panel title="Historial clínico">{!data.history.length&&<Text>No hay entradas registradas.</Text>}{data.history.map(h=><Paper key={h.id} withBorder p="sm"><Text fw={600}>{h.descriptor} · {h.kind==='medication'?'Medicación':h.kind}</Text><Text size="sm">{h.dose} {h.prescriber_descriptor} · {h.status==='superseded'?'Corregido':h.ended_on?'Finalizado':'Vigente'} {h.started_on} {h.ended_on&&` → ${h.ended_on}`}</Text><Text size="xs">Registro: {h.created_at.slice(0,10)}{h.supersedes_id?' · reemplaza una entrada anterior':''}</Text></Paper>)}</Panel>
        {edit&&<Panel title="Añadir o corregir entrada"><Select label="Tipo" value={kind} data={[{value:'medication',label:'Medicación'},{value:'reported_diagnosis',label:'Diagnóstico reportado'},{value:'assessment',label:'Evaluación'},{value:'procedure',label:'Procedimiento'}]} onChange={v=>{setKind(v as typeof kind);setPrior(null);}}/>
            <Select clearable label="Corregir entrada existente (opcional)" value={prior} data={data.history.filter(h=>h.status==='active'&&h.kind===kind).map(h=>({value:h.id,label:h.descriptor}))} onChange={setPrior}/>
            <form key={prior??kind} onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);await run({op:'history',clientId:data.student!.id,kind,descriptor:field(f,'descriptor'),occurred:field(f,'occurred'),dose:field(f,'dose'),prescriber:field(f,'prescriber'),started:field(f,'started'),ended:field(f,'ended'),supersedes:prior??undefined});}}><Stack>
                <TextInput name="descriptor" label={kind==='medication'?'Medicamento':'Descripción'} required defaultValue={old?.descriptor??''}/><DateField name="occurred" label="Fecha del antecedente" value={old?.occurred_on}/>
                {kind==='medication'&&<><TextInput name="dose" label="Dosis y frecuencia indicadas" defaultValue={old?.dose??''}/><TextInput name="prescriber" label="Descriptor del prescriptor" defaultValue={old?.prescriber_descriptor??''}/><DateField name="started" label="Inicio" value={old?.started_on}/><DateField name="ended" label="Fin (si corresponde)" value={old?.ended_on}/></>}
                <Button type="submit" loading={busy}>Guardar entrada</Button>
            </Stack></form></Panel>}
    </Stack>;
}

function Consents({data,run,busy,readOnly=false}:{data:WorkspaceData;run:Run;busy:boolean;readOnly?:boolean}) {
    const [prior,setPrior]=useState<string|null>(null);const old=data.consents.find(c=>c.id===prior);
    return <Panel title="Referencias de consentimiento">{data.consents.map(c=><Text key={c.id}>{c.purpose_code} · aviso {c.notice_version} · {c.status} · {c.evidence_reference??'Sin referencia externa'}</Text>)}
        {!data.consents.length&&<Text>No hay consentimiento registrado.</Text>}
        {!readOnly&&data.capabilities.includes('authorization.decide')&&<><Select clearable label="Actualizar referencia previa" value={prior} data={data.consents.filter(c=>c.status!=='superseded').map(c=>({value:c.id,label:`${c.purpose_code} · ${c.status}`}))} onChange={setPrior}/>
        <form key={prior??'new'} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'consent',clientId:data.student!.id,purpose:field(f,'purpose'),notice:field(f,'notice'),grantor:field(f,'grantor'),channel:field(f,'channel'),reference:field(f,'reference'),status:field(f,'status') as 'valid',supersedes:prior??undefined});}}><Stack>
            <TextInput name="purpose" label="Finalidad" required defaultValue={old?.purpose_code??''}/><TextInput name="notice" label="Versión del aviso" required defaultValue={old?.notice_version??''}/><TextInput name="grantor" label="Descriptor de quien otorga" required defaultValue={old?.grantor_descriptor??''}/><TextInput name="channel" label="Canal" required defaultValue={old?.channel??''}/><TextInput name="reference" label="Referencia de evidencia (sin adjuntar archivo)" defaultValue={old?.evidence_reference??''}/><Select name="status" label="Estado" defaultValue={old?.status??"pending_review"} data={[{value:'pending_review',label:'Pendiente de revisión'},{value:'valid',label:'Válido'},{value:'revoked',label:'Revocado'},{value:'expired',label:'Expirado'}]}/><Button type="submit" loading={busy}>Guardar referencia</Button>
        </Stack></form></>}
    </Panel>;
}

function Team({data,run,busy}:{data:WorkspaceData;run:Run;busy:boolean}) {
    const roleOptions=Object.entries(roles).filter(([r])=>r!=='clinician').map(([value,label])=>({value,label}));
    return <Panel title="Administración de clínica"><Stack gap="sm"><Alert color="blue" title="Cambio de perfil persistido">Cada guardado usa la acción administrativa de la clínica y sólo confirma cuando el servidor responde. El perfil nuevo se comprueba tras cerrar sesión e iniciar una sesión nueva.</Alert><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'invite',operationId:crypto.randomUUID(),email:field(f,'email'),role:field(f,'role') as 'supervisor'});}}><Group align="end"><TextInput name="email" type="email" label="Correo de la nueva cuenta" required/><Select name="role" label="Perfil inicial" defaultValue="supervisor" data={roleOptions}/><Button type="submit" loading={busy}>Invitar</Button></Group></form>{data.team.map(m=>{const isCurrentUser=m.user_id===data.userId;return <form key={m.user_id+ m.role+m.status} onSubmit={e=>{e.preventDefault();if(isCurrentUser)return;const f=new FormData(e.currentTarget);void run({op:'member',userId:m.user_id,role:field(f,'role') as 'admin',status:field(f,'status') as 'active'});}}><Group align="end"><Stack gap={0}><Text>{m.email}{isCurrentUser?' (tu sesión actual)':''}</Text>{isCurrentUser&&<Text size="xs" c="dimmed">Otro admin activo debe cambiar este perfil; así se evita perder el último acceso administrativo.</Text>}</Stack><Select name="role" label="Perfil" defaultValue={m.role} data={roleOptions} disabled={isCurrentUser}/><Select name="status" label="Membresía" defaultValue={m.status} data={[{value:'active',label:'Activa'},{value:'inactive',label:'Suspendida'}]} disabled={isCurrentUser}/><Button type="submit" loading={busy} disabled={isCurrentUser}>Guardar perfil</Button></Group></form>;})}</Stack></Panel>;
}
function Assignments({data,run,busy}:{data:WorkspaceData;run:Run;busy:boolean}) {
    return <Panel title="Asignaciones del estudiante">{data.assignments.map(a=><Text key={a.id}>{data.team.find(m=>m.user_id===a.user_id)?.email??a.user_id} · {a.role} · {a.status}{a.is_primary?' · principal':''}</Text>)}
        <form onSubmit={(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'assignment',clientId:data.student!.id,userId:field(f,'user'),role:field(f,'role') as 'supervisor',status:field(f,'status') as 'active'});}}><Stack><Select name="user" label="Profesional" required data={data.team.filter(m=>m.status==='active').map(m=>({value:m.user_id,label:m.email}))}/><Select name="role" label="Asignación" defaultValue="therapist" data={[{value:'supervisor',label:'Supervisor'},{value:'therapist',label:'Técnico'}]}/><Select name="status" label="Estado" defaultValue="active" data={[{value:'active',label:'Activa'},{value:'inactive',label:'Retirar asignación'}]}/><Button type="submit" loading={busy}>Actualizar asignación</Button></Stack></form>
    </Panel>;
}
