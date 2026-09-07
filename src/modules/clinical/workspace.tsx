'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Alert,Badge,Button,Container,Group,Modal,NumberInput,Paper,Select,SimpleGrid,Stack,Table,Tabs,Text,Textarea,TextInput,Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { createClient } from '@/lib/supabase/client';
import { clinicalCommand,selectClinic } from './actions';
import { measurement,metric,type ClinicalCommand,type StudentInput } from './contracts';
import type { SessionRecord,WorkspaceData } from './page';
import type { Json } from '@/lib/supabase/database.types';

type Run=(command:ClinicalCommand)=>Promise<Json|undefined>;
const field=(form:FormData,key:string)=>String(form.get(key)??'');
const lines=(value:string)=>value.split('\n').map(x=>x.trim()).filter(Boolean);
const roles={admin:'Admin / clínica',supervisor:'Profesional / supervisor',therapist:'Profesional / técnico',clinician:'Profesional'};
function Panel({title,children}:{title:string;children:ReactNode}) {return <Paper p="lg" withBorder><Stack><Title order={3}>{title}</Title>{children}</Stack></Paper>;}
function DateField({name,label,value=''}:{name:string;label:string;value?:string|null}){return <TextInput name={name} label={label} type="date" defaultValue={value??''}/>;}

export function ClinicalWorkspace({data,initialTab='record'}:{data:WorkspaceData;initialTab?:string}) {
    const router=useRouter(); const [busy,setBusy]=useState(false); const [createOpen,setCreateOpen]=useState(false);
    const [capture,setCapture]=useState<{record?:SessionRecord}|null>(null); const [error,setError]=useState('');
    const run:Run=async command=>{
        setBusy(true);setError('');
        try {
            const result=await clinicalCommand(command);
            if(result.error){setError(result.error);return;}
            notifications.show({title:'Cambio confirmado',message:'El servidor confirmó el cambio.',color:'green'});
            router.refresh();return result.data??null;
        } catch {setError('No se pudo confirmar el cambio. Conserva los datos y vuelve a intentar.');}
        finally{setBusy(false);}
    };
    const student=data.student, edit=data.capabilities.includes('student.edit');
    const admin=data.active?.role==='admin';
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
                <Title order={2}>Carpetas autorizadas ({data.students.length})</Title>
                {data.students.length===0&&<Alert>No hay estudiantes registrados o asignados en esta clínica.</Alert>}
                <SimpleGrid cols={{base:1,sm:2,md:3}}>{data.students.map(s=><Paper key={s.id} withBorder p="lg"><Stack gap="xs"><Title order={3}>{s.initials}</Title><Text>ID clínico: {s.clinical_id}</Text><Badge>{s.status==='active'?'Vigente':'Archivado'}</Badge><Button component="a" href={`/students/${s.id}`} variant="light">Abrir ficha</Button></Stack></Paper>)}</SimpleGrid>
                {admin&&<Team data={data} run={run} busy={busy}/>}
            </>:<>
                <Group justify="space-between"><Title order={2}>{student.initials} · {student.clinical_id}</Title><Badge>{student.status}</Badge></Group>
                <Tabs defaultValue={initialTab} keepMounted={false}><Tabs.List><Tabs.Tab value="record">Ficha y familiares</Tabs.Tab><Tabs.Tab value="history">Historial y medicación</Tabs.Tab><Tabs.Tab value="programs">Programas</Tabs.Tab><Tabs.Tab value="sessions">Sesiones y resultados</Tabs.Tab>{admin&&<Tabs.Tab value="assignments">Asignaciones</Tabs.Tab>}</Tabs.List>
                    <Tabs.Panel value="record" pt="lg"><Stack>
                        <StudentForm key={student.updated_at} data={data} run={run} busy={busy} readOnly={!edit}/>
                        <Panel title="Contexto"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'context',clientId:student.id,expected:data.context?.version,home:field(f,'home'),school:field(f,'school'),adaptations:field(f,'adaptations')});}}>
                            <Stack><Textarea name="home" label="Adaptaciones del hogar" defaultValue={data.context?.home_adaptations??''} readOnly={!edit}/><Textarea name="school" label="Escolaridad" defaultValue={data.context?.schooling??''} readOnly={!edit}/><Textarea name="adaptations" label="Adaptaciones escolares" defaultValue={data.context?.school_adaptations??''} readOnly={!edit}/>{!data.context&&<Text c="dimmed">Contexto todavía no registrado.</Text>}{edit&&<Button type="submit" loading={busy}>Guardar contexto</Button>}</Stack></form></Panel>
                        {edit?<Consents data={data} run={run} busy={busy}/>:<Alert>La gestión de consentimiento está disponible para el supervisor y la clínica.</Alert>}
                    </Stack></Tabs.Panel>
                    <Tabs.Panel value="history" pt="lg"><History data={data} run={run} busy={busy} edit={edit}/></Tabs.Panel>
                    <Tabs.Panel value="programs" pt="lg"><Programs data={data} run={run} busy={busy}/></Tabs.Panel>
                    <Tabs.Panel value="sessions" pt="lg"><Stack>
                        {data.capabilities.includes('record.capture')&&<Button onClick={()=>setCapture({})}>Nueva captura</Button>}
                        {!data.sessions.length&&<Alert>No hay sesiones registradas.</Alert>}
                        {data.sessions.map(s=><Panel key={s.id} title={`Sesión ${s.occurred_on} · ${s.status==='draft'?'Borrador':s.status==='completed'?'Finalizada':'Archivada'}`}>
                            {data.records.filter(r=>r.session_id===s.id).map(r=>{
                                const parsed=measurement.safeParse({dimension:r.dimension,payload:r.payload});const m=parsed.success?metric(parsed.data):null;
                                return <Group key={r.id} justify="space-between"><div><Text>{data.versions.find(v=>v.id===r.program_version_id)?.title??'Programa'} · v{data.versions.find(v=>v.id===r.program_version_id)?.version}</Text><Text size="sm">{m?.value==null?'Sin observaciones completas':`${m.value.toFixed(1)} ${m.unit}`} · {r.submitted?'Enviado':'Borrador'}</Text></div>
                                    {!r.submitted&&r.actor_user_id&&data.capabilities.includes('record.capture')&&<Button variant="light" onClick={()=>setCapture({record:r})}>Reabrir borrador</Button>}</Group>;
                            })}
                            {s.status==='draft'&&data.capabilities.includes('record.submit')&&<Button loading={busy} onClick={()=>void run({op:'finish',clientId:student.id,sessionId:s.id})}>Finalizar sesión</Button>}
                        </Panel>)}
                        <Results data={data}/>
                    </Stack></Tabs.Panel>
                    {admin&&<Tabs.Panel value="assignments" pt="lg"><Assignments data={data} run={run} busy={busy}/></Tabs.Panel>}
                </Tabs>
            </>}
        </>}
        <Modal opened={createOpen} onClose={()=>setCreateOpen(false)} title="Nuevo estudiante" size="lg"><StudentForm data={{...data,student:null,guardians:[],siblings:[]}} busy={busy} run={async c=>{const result=await run(c);if(result!==undefined){setCreateOpen(false);const id=(result as {id?:string})?.id;if(id)router.push(`/students/${id}`);}return result;}}/></Modal>
        <Modal opened={capture!==null} onClose={()=>setCapture(null)} title="Captura clínica" size="lg" closeOnClickOutside={false}>
            {capture&&student&&<Capture key={capture.record?.id??'new'} data={data} record={capture.record} run={run} busy={busy} onClose={()=>setCapture(null)}/>}
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

function Consents({data,run,busy}:{data:WorkspaceData;run:Run;busy:boolean}) {
    const [prior,setPrior]=useState<string|null>(null);const old=data.consents.find(c=>c.id===prior);
    return <Panel title="Referencias de consentimiento">{data.consents.map(c=><Text key={c.id}>{c.purpose_code} · aviso {c.notice_version} · {c.status} · {c.evidence_reference??'Sin referencia externa'}</Text>)}
        {!data.consents.length&&<Text>No hay consentimiento registrado.</Text>}
        {data.capabilities.includes('authorization.decide')&&<><Select clearable label="Actualizar referencia previa" value={prior} data={data.consents.filter(c=>c.status!=='superseded').map(c=>({value:c.id,label:`${c.purpose_code} · ${c.status}`}))} onChange={setPrior}/>
        <form key={prior??'new'} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'consent',clientId:data.student!.id,purpose:field(f,'purpose'),notice:field(f,'notice'),grantor:field(f,'grantor'),channel:field(f,'channel'),reference:field(f,'reference'),status:field(f,'status') as 'valid',supersedes:prior??undefined});}}><Stack>
            <TextInput name="purpose" label="Finalidad" required defaultValue={old?.purpose_code??''}/><TextInput name="notice" label="Versión del aviso" required defaultValue={old?.notice_version??''}/><TextInput name="grantor" label="Descriptor de quien otorga" required defaultValue={old?.grantor_descriptor??''}/><TextInput name="channel" label="Canal" required defaultValue={old?.channel??''}/><TextInput name="reference" label="Referencia de evidencia (sin adjuntar archivo)" defaultValue={old?.evidence_reference??''}/><Select name="status" label="Estado" defaultValue="pending_review" data={[{value:'pending_review',label:'Pendiente de revisión'},{value:'valid',label:'Válido'},{value:'revoked',label:'Revocado'},{value:'expired',label:'Expirado'}]}/><Button type="submit" loading={busy}>Guardar referencia</Button>
        </Stack></form></>}
    </Panel>;
}

const acquisitionFields=[['goal','Objetivo'],['skillArea','Área de habilidad'],['antecedent','Antecedente'],['steps','Pasos (uno por línea)'],['teachingProcedure','Procedimiento de enseñanza'],['sets','Conjuntos (uno por línea)'],['promptLevels','Niveles de ayuda (uno por línea)'],['errorCorrection','Corrección de errores'],['masteryCriterion','Criterio de dominio']];
const behaviorFields=[['topography','Topografía'],['operationalDefinition','Definición operacional'],['hypothesizedFunction','Función hipotetizada'],['replacementBehavior','Conducta alternativa'],['preventionStrategy','Estrategia preventiva'],['responseStrategy','Estrategia de respuesta'],['masteryCriterion','Criterio de dominio']];
function Programs({data,run,busy}:{data:WorkspaceData;run:Run;busy:boolean}) {
    const [kind,setKind]=useState<'acquisition'|'behavior'>('acquisition');const [predecessor,setPredecessor]=useState<string|null>(null);
    const old=data.versions.find(v=>v.id===predecessor);const design=(old?.design??{}) as Record<string,Json>;
    const edit=data.capabilities.includes('program.edit');
    return <Stack>{!data.programs.length&&<Alert>No hay programas registrados.</Alert>}{data.programs.map(p=><Panel key={p.id} title={`${data.versions.find(v=>v.program_id===p.id)?.title??'Programa'} · ${p.status}`}>
        {data.versions.filter(v=>v.program_id===p.id).map(v=><Group key={v.id} justify="space-between"><Text>Versión {v.version} · {v.version_state}</Text>{edit&&v.version_state==='draft'&&<Button loading={busy} onClick={()=>void run({op:'transition',clientId:data.student!.id,programId:p.id,versionId:v.id,status:'active'})}>Activar versión</Button>}{edit&&v.version_state==='released'&&<Button variant="light" onClick={()=>{setKind(v.program_type as typeof kind);setPredecessor(v.id);}}>Preparar nueva versión</Button>}</Group>)}
        {edit&&p.current_version_id&&<Group>{(['paused','achieved','discontinued'] as const).map((status,i)=><Button key={status} variant="subtle" loading={busy} onClick={()=>void run({op:'transition',clientId:data.student!.id,programId:p.id,versionId:p.current_version_id!,status})}>{['Pausar','Marcar logrado','Discontinuar'][i]}</Button>)}</Group>}
    </Panel>)}{edit&&<Panel title={predecessor?'Nueva versión del programa':'Nuevo programa'}>
        <Select label="Tipo" value={kind} disabled={!!predecessor} data={[{value:'acquisition',label:'Adquisición · porcentaje'},{value:'behavior',label:'Conducta · frecuencia o intervalos'}]} onChange={v=>setKind(v as typeof kind)}/>
        {predecessor&&<Button variant="subtle" onClick={()=>setPredecessor(null)}>Volver a crear programa</Button>}
        <form key={predecessor??kind} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const draft:Record<string,Json>={kind};for(const [name] of kind==='acquisition'?acquisitionFields:behaviorFields)draft[name]=['steps','sets','promptLevels'].includes(name)?lines(field(f,name)):field(f,name);if(kind==='behavior')draft.measurementUnit=field(f,'measurementUnit');void run({op:'program',clientId:data.student!.id,title:field(f,'title'),design:draft as unknown as Extract<ClinicalCommand,{op:'program'}>['design'],predecessor:predecessor??undefined});}}><Stack>
            <TextInput name="title" label="Nombre del programa" required defaultValue={old?.title??''}/>
            {(kind==='acquisition'?acquisitionFields:behaviorFields).map(([name,label])=><Textarea key={name} name={name} label={label} required defaultValue={Array.isArray(design[name])?(design[name] as string[]).join('\n'):String(design[name]??'')}/>)}
            {kind==='behavior'&&<Select name="measurementUnit" label="Medición" defaultValue={String(design.measurementUnit??'frequency')} data={[{value:'frequency',label:'Frecuencia'},{value:'interval',label:'Intervalos'}]}/>}
            <Button type="submit" loading={busy}>Guardar borrador de programa</Button>
        </Stack></form>
    </Panel>}</Stack>;
}

function Capture({data,record,run,busy,onClose}:{data:WorkspaceData;record?:SessionRecord;run:Run;busy:boolean;onClose:()=>void}) {
    const [id]=useState(()=>record?.id??crypto.randomUUID());const [sessionId]=useState(()=>record?.session_id??crypto.randomUUID());const [versionId,setVersionId]=useState<string|null>(record?.program_version_id??null);const [expected,setExpected]=useState(record?.version??0);
    const old=record?.payload as Record<string,Json>|undefined;
    const [trials,setTrials]=useState<boolean[]>((old?.trials as boolean[])??[]);const [intervals,setIntervals]=useState<(boolean|null)[]>((old?.intervals as (boolean|null)[])??Array(10).fill(null));
    const [count,setCount]=useState(Number(old?.count??0));const [duration,setDuration]=useState(Number(old?.duration_seconds??60));const [type,setType]=useState(String(old?.type??'whole'));
    const version=data.versions.find(v=>v.id===versionId);const dimension=version?.program_type==='acquisition'?'percentage':(version?.design as Record<string,Json>)?.measurementUnit;
    async function save(submit:boolean){
        if(!versionId)return;
        const value=dimension==='percentage'?{dimension,payload:{trials}}:dimension==='frequency'?{dimension,payload:{count,duration_seconds:duration}}:{dimension,payload:{intervals,type,duration_seconds:duration}};
        const parsed=measurement.safeParse(value);if(!parsed.success){notifications.show({color:'red',message:'Completa las observaciones y una duración válida.'});return;}
        if(submit&&parsed.data.dimension==='interval'&&parsed.data.payload.intervals.includes(null)){notifications.show({color:'red',message:'Quedan intervalos sin observar; guarda un borrador o complétalos.'});return;}
        const result=await run({op:'record',clientId:data.student!.id,id,sessionId,versionId,expected,submit,measurement:parsed.data});
        if(result!==undefined){setExpected((result as unknown as SessionRecord).version);if(submit)onClose();}
    }
    return <Stack><Alert>Se requiere conexión. Guardar borrador permite reabrir los datos confirmados; cerrar descarta los cambios aún no guardados.</Alert>
        <Select label="Programa y versión" disabled={expected>0} value={versionId} onChange={setVersionId} data={data.versions.filter(v=>v.id===record?.program_version_id||data.programs.some(p=>p.status==='active'&&p.current_version_id===v.id)).map(v=>({value:v.id,label:`${v.title} · v${v.version}`}))}/>
        {dimension==='percentage'&&<><Text>Ensayos independientes: {trials.filter(Boolean).length} / {trials.length}</Text><Group><Button onClick={()=>setTrials(p=>[...p,true])}>Logrado sin ayuda</Button><Button color="orange" onClick={()=>setTrials(p=>[...p,false])}>No logrado sin ayuda</Button><Button variant="subtle" onClick={()=>setTrials(p=>p.slice(0,-1))}>Deshacer último</Button></Group></>}
        {dimension==='frequency'&&<><NumberInput label="Eventos observados" min={0} value={count} onChange={v=>setCount(Number(v))}/><Group><Button onClick={()=>setCount(n=>n+1)}>+ Evento</Button><Button variant="subtle" onClick={()=>setCount(n=>Math.max(0,n-1))}>− Evento</Button></Group><NumberInput label="Duración observada (segundos)" min={1} value={duration} onChange={v=>setDuration(Number(v))}/></>}
        {dimension==='interval'&&<><Select label="Método de intervalo" value={type} onChange={v=>setType(v??'whole')} data={[{value:'whole',label:'Total'},{value:'partial',label:'Parcial'},{value:'momentary',label:'Momentáneo'}]}/><NumberInput label="Duración de cada intervalo (segundos)" min={1} value={duration} onChange={v=>setDuration(Number(v))}/><NumberInput label="Cantidad de intervalos" min={1} max={1000} value={intervals.length} onChange={v=>setIntervals(p=>Array.from({length:Math.max(1,Math.min(1000,Number(v)))},(_,i)=>p[i]??null))}/>
            <SimpleGrid cols={5}>{intervals.map((v,i)=><Button key={i} color={v===null?'gray':v?'green':'orange'} onClick={()=>setIntervals(p=>p.map((x,j)=>i===j?(x===null?true:x?false:null):x))}>{i+1}: {v===null?'—':v?'Sí':'No'}</Button>)}</SimpleGrid></>}
        <Group><Button variant="light" loading={busy} disabled={!versionId} onClick={()=>void save(false)}>Guardar borrador</Button><Button loading={busy} disabled={!versionId} onClick={()=>void save(true)}>Enviar registro</Button><Button variant="subtle" onClick={onClose}>Cancelar</Button></Group>
    </Stack>;
}

function Results({data}:{data:WorkspaceData}) {
    return <Panel title="Resultados por programa">{data.programs.map(p=>{
        const rows=data.records.filter(r=>r.submitted&&data.versions.some(v=>v.id===r.program_version_id&&v.program_id===p.id)).slice().reverse();
        if(!rows.length)return null;
        const points=rows.map(r=>{const parsed=measurement.safeParse({dimension:r.dimension,payload:r.payload});return parsed.success?{record:r,metric:metric(parsed.data)}:null;}).filter(x=>x!==null);
        const max=Math.max(1,...points.map(p=>p.metric.value??0));
        return <Paper key={p.id} p="sm" withBorder><Text fw={600}>{data.versions.find(v=>v.program_id===p.id)?.title}</Text><svg role="img" aria-label="Evolución de resultados registrados" viewBox="0 0 600 160" style={{width:'100%',height:160}}><polyline fill="none" stroke="#228be6" strokeWidth="3" points={points.map((x,i)=>`${20+i*560/Math.max(1,points.length-1)},${140-120*(x.metric.value??0)/max}`).join(' ')}/>{points.map((x,i)=><circle key={x.record.id} cx={20+i*560/Math.max(1,points.length-1)} cy={140-120*(x.metric.value??0)/max} r="4" fill="#228be6"/>)}</svg><Table><Table.Thead><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Versión</Table.Th><Table.Th>Resultado</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{points.map(x=><Table.Tr key={x.record.id}><Table.Td>{new Date(x.record.created_at).toLocaleString('es-CL')}</Table.Td><Table.Td>{data.versions.find(v=>v.id===x.record.program_version_id)?.version}</Table.Td><Table.Td>{x.metric.value?.toFixed(1)??'Sin datos'} {x.metric.unit}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Paper>;
    })}</Panel>;
}

function Team({data,run,busy}:{data:WorkspaceData;run:Run;busy:boolean}) {
    const roleOptions=Object.entries(roles).filter(([r])=>r!=='clinician').map(([value,label])=>({value,label}));
    return <Panel title="Administración de clínica"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'invite',email:field(f,'email'),role:field(f,'role') as 'supervisor'});}}><Group align="end"><TextInput name="email" type="email" label="Correo de la nueva cuenta" required/><Select name="role" label="Perfil inicial" defaultValue="supervisor" data={roleOptions}/><Button type="submit" loading={busy}>Invitar</Button></Group></form>{data.team.map(m=><form key={m.user_id+ m.role+m.status} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'member',userId:m.user_id,role:field(f,'role') as 'admin',status:field(f,'status') as 'active'});}}><Group align="end"><Text>{m.email}</Text><Select name="role" label="Perfil" defaultValue={m.role} data={roleOptions}/><Select name="status" label="Membresía" defaultValue={m.status} data={[{value:'active',label:'Activa'},{value:'inactive',label:'Suspendida'}]}/><Button type="submit" loading={busy}>Guardar perfil</Button></Group></form>)}</Panel>;
}
function Assignments({data,run,busy}:{data:WorkspaceData;run:Run;busy:boolean}) {
    return <Panel title="Asignaciones del estudiante">{data.assignments.map(a=><Text key={a.id}>{data.team.find(m=>m.user_id===a.user_id)?.email??a.user_id} · {a.role} · {a.status}{a.is_primary?' · principal':''}</Text>)}
        <form onSubmit={(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const f=new FormData(e.currentTarget);void run({op:'assignment',clientId:data.student!.id,userId:field(f,'user'),role:field(f,'role') as 'supervisor',status:field(f,'status') as 'active'});}}><Stack><Select name="user" label="Profesional" required data={data.team.filter(m=>m.status==='active').map(m=>({value:m.user_id,label:m.email}))}/><Select name="role" label="Asignación" defaultValue="therapist" data={[{value:'supervisor',label:'Supervisor'},{value:'therapist',label:'Técnico'}]}/><Select name="status" label="Estado" defaultValue="active" data={[{value:'active',label:'Activa'},{value:'inactive',label:'Retirar asignación'}]}/><Button type="submit" loading={busy}>Actualizar asignación</Button></Stack></form>
    </Panel>;
}
