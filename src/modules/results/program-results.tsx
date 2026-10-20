'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/MainLayout';
import { useIdentity } from '@/context/IdentityContext';
import { Alert, Badge, Button, Checkbox, Container, Group, Modal, NumberInput, Paper, Select, SimpleGrid, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { Download, Expand, FileText } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { captureCommandV2Schema, measurementV2Metrics, readPersistedMeasurement, type CaptureCommandV2, type MeasurementV2 } from '@/domain/measurements/measurement-v2';
import { loadProgramSessionPageData, persistCaptureV2, type ProgramSessionPageData, type SessionRecordDto } from '@/modules/program-session';
import { loadResultGoals, mutateResultGoal } from './results.server';
import { resultGoalCommandSchema, type ResultGoal, type ResultGoalCommand } from './contracts';

const phaseLabels={baseline:'Línea base',treatment:'Tratamiento',generalization:'Generalización',maintenance:'Mantenimiento'} as const;
const dimensionLabels={percentage:'Porcentaje',frequency:'Frecuencia',interval:'Intervalos',duration:'Duración',latency:'Latencia'} as const;
type Summary=ReturnType<typeof measurementV2Metrics>;
type Point={id:string;sessionId:string;programVersionId:string;date:string;phase:keyof typeof phaseLabels;value:number|null;unit:string;notes:string;actorId:string;version:number;measurement:MeasurementV2;summary:Summary;revisions:SessionRecordDto['revisions']};
type LegacyPoint={record:SessionRecordDto;original:Record<string,unknown>;date:string;dimension:MeasurementV2['dimension'];phase:string|null};
const metricLabels:Record<string,string>={recorded:'Ensayos registrados',planned:'Planificados',independent:'I · independientes',prompted:'A · con ayuda',errors:'E · errores',noResponse:'NR · sin respuesta',unrecorded:'Sin registrar',count:'Eventos',observedSeconds:'Tiempo observado (s)',observed:'Intervalos observados',positive:'Intervalos positivos',coverage:'Cobertura (0–1)',totalSeconds:'Duración total (s)',averageSeconds:'Duración promedio (s)',closed:'Episodios cerrados',open:'Episodios abiertos',responded:'Respuestas observadas',pending:'Ensayos pendientes'};
function metricDetails(summary:Summary){return Object.entries(summary).filter(([key])=>!['dimension','unit','value'].includes(key)).map(([key,value])=>`${metricLabels[key]??key}: ${value===null?'Sin observaciones suficientes':typeof value==='number'?value.toLocaleString('es-CL',{maximumFractionDigits:2}):String(value)}`).join(' · ');}
const percentageSeries=[{key:'independent',label:'I · independientes',color:'var(--mantine-color-green-6)'},{key:'prompted',label:'A · con ayuda',color:'var(--mantine-color-yellow-6)'},{key:'errors',label:'E · errores',color:'var(--mantine-color-red-6)'},{key:'noResponse',label:'NR · sin respuesta',color:'var(--mantine-color-violet-6)'}] as const;
function safeMeasurement(raw:unknown){try{return readPersistedMeasurement(raw);}catch{return null;}}

function quoteCsv(value:unknown){const raw=String(value??'');const first=Array.from(raw).find(character=>character.charCodeAt(0)>32&&!/\s/u.test(character));const safe=typeof value==='string'&&((first!==undefined&&'=+-@'.includes(first))||['\t','\r','\n'].some(prefix=>raw.startsWith(prefix)))?`'${raw}`:raw;return `"${safe.replaceAll('"','""')}"`;}
function downloadCsv(name:string,points:Point[],legacy:LegacyPoint[]){
  const rows=[['esquema','registro','fecha','fase','dimension','valor','unidad','notas','profesional','version','metricas_derivadas_json','observaciones_originales_json','revisiones_json'],
    ...points.map(point=>[2,point.id,point.date,phaseLabels[point.phase],point.measurement.dimension,point.value??'',point.unit,point.notes,point.actorId,point.version,JSON.stringify(point.summary),JSON.stringify(point.measurement),JSON.stringify(point.revisions)]),
    ...legacy.map(point=>[1,point.record.id,point.date,point.phase??'No disponible',point.dimension,'','Detalle V1 no reconstruible',typeof point.original.notes==='string'?point.original.notes:'',point.record.actorId,point.record.version,'',JSON.stringify(point.original),JSON.stringify(point.record.revisions)])];
  const blob=new Blob(['\ufeff'+rows.map(row=>row.map(quoteCsv).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);
}
async function downloadPdf({fileName,programTitle,studentName,points,legacy,goals,isCurrent}:{fileName:string;programTitle:string;studentName:string;points:Point[];legacy:LegacyPoint[];goals:ResultGoal[];isCurrent:()=>boolean}){
  if(!isCurrent())return;
  const {jsPDF}=await import('jspdf');if(!isCurrent())return;
  const doc=new jsPDF({unit:'mm',format:'a4'});const width=210;let y=18;
  const next=(height=7)=>{if(y+height>282){doc.addPage();y=18;}};const line=(text:string,size=10,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);for(const part of doc.splitTextToSize(text,174) as string[]){next();doc.text(part,18,y);y+=size*0.45+2;}};
  doc.setProperties({title:`Resultados · ${programTitle}`,subject:'Reporte clínico autorizado ABA',creator:'ABA Admin'});line('Reporte de resultados ABA',17,true);line(programTitle,13,true);line(`Estudiante: ${studentName}`);line(`Generado: ${new Date().toLocaleString('es-CL')}`);line('Este reporte separa dimensiones y no interpreta automáticamente una subida o bajada como mejoría clínica.',9);y+=2;
  if(goals.length){line('Metas vigentes',11,true);for(const goal of goals)line(`• ${goal.label}: ${goal.comparator==='at-least'?'al menos':'como máximo'} ${goal.targetValue} · ${dimensionLabels[goal.dimension]}`,9);y+=2;}
  line(`Registros V2 filtrados: ${points.length}`,11,true);doc.setDrawColor(180);for(const point of points){next(26);doc.line(18,y,width-18,y);y+=5;line(`${new Date(point.date).toLocaleString('es-CL')} · ${phaseLabels[point.phase]} · ${point.value===null?'Sin valor':`${point.value.toLocaleString('es-CL',{maximumFractionDigits:2})} ${point.unit}`}`,9,true);line(metricDetails(point.summary),9);line(`Nota: ${point.notes||'Sin nota'}`,9);line(`Registro ${point.id} · versión ${point.version} · profesional ${point.actorId}`,8);for(const revision of point.revisions)line(`Corrección v${revision.number}: ${revision.reason} · ${revision.createdAt} · ${revision.actorId}`,8);}
  if(legacy.length){line('Registros históricos V1 filtrados',11,true);line('Se conserva el agregado original. No permite reconstruir I/A/E/NR, ayudas ni tiempos individuales; no se combina con el gráfico V2.',9);for(const point of legacy){line(`${point.date} · ${dimensionLabels[point.dimension]} · registro ${point.record.id} · v${point.record.version}`,9,true);line(JSON.stringify(point.original),8);}}
  if(isCurrent())doc.save(fileName);
}
function metric(raw:unknown){const persisted=safeMeasurement(raw);if(persisted?.schemaVersion!==2)return null;return {measurement:persisted.measurement,summary:measurementV2Metrics(persisted.measurement)};}
function ResultsChart({points,min,max,goals,series}:{points:Point[];min:number;max:number;goals:ResultGoal[];series:string[]}){
  const percentage=points[0]?.measurement.dimension==='percentage';
  const chartPoints=points.map(point=>{if(point.summary.dimension!=='percentage')return point;return {...point,...Object.fromEntries(percentageSeries.map(item=>[item.key,point.summary.recorded?100*Number(point.summary[item.key])/point.summary.recorded:null]))};});
  return <ResponsiveContainer width="100%" height={400}><LineChart data={chartPoints} margin={{top:12,right:24,bottom:16,left:12}}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={value=>new Date(value).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit'})}/><YAxis domain={[min,max]} allowDataOverflow/><Tooltip formatter={(value,name)=>[typeof value==='number'?value.toLocaleString('es-CL',{maximumFractionDigits:2}):'Sin valor',percentage?`${name} (%)`:points[0]?.unit??'Valor']} labelFormatter={value=>new Date(value).toLocaleString('es-CL')}/><Legend/>{goals.map(goal=><ReferenceLine key={goal.id} y={goal.targetValue} stroke="var(--mantine-color-orange-6)" strokeDasharray="6 4" label={goal.label}/>)}{percentage?percentageSeries.filter(item=>series.includes(item.key)).map(item=><Line key={item.key} type="linear" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2} connectNulls={false}/>):<Line type="linear" dataKey="value" name={points[0]?.unit??'Valor'} stroke="var(--mantine-color-blue-6)" strokeWidth={2} connectNulls={false}/>}</LineChart></ResponsiveContainer>;
}

function GoalsPanel({goals,clinicId,studentId,programId,dimension,canConfigure,leaveGuard,onGoalsRead}:{goals:ResultGoal[];clinicId:string;studentId:string;programId:string;dimension:MeasurementV2['dimension']|null;canConfigure:boolean;leaveGuard:{current:(()=>boolean)|null};onGoalsRead:(rows:ResultGoal[])=>void}){
  const router=useRouter();
  const [editing,setEditing]=useState<ResultGoal|null|undefined>(undefined);
  const [label,setLabel]=useState('');const [target,setTarget]=useState<number|string>(0);const [comparator,setComparator]=useState<'at-least'|'at-most'>('at-least');
  const [pending,setPending]=useState<ResultGoalCommand|null>(null);const pendingRef=useRef<ResultGoalCommand|null>(null);const busyRef=useRef(false);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [review,setReview]=useState(false);const [unavailable,setUnavailable]=useState(false);
  const refreshRequiredRef=useRef(false);const [refreshRequired,setRefreshRequired]=useState(false);
  useEffect(()=>{
    leaveGuard.current=()=>{if(busyRef.current||pendingRef.current){setMessage('Recupera primero el resultado de la meta.');return false;}return editing===undefined||window.confirm('¿Descartar el borrador de la meta?');};
    const warn=(event:BeforeUnloadEvent)=>{if(editing!==undefined||busyRef.current||pendingRef.current){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',warn);return()=>{leaveGuard.current=null;window.removeEventListener('beforeunload',warn);};
  },[editing,leaveGuard]);
  const open=(goal:ResultGoal|null)=>{if(busyRef.current||pendingRef.current||refreshRequiredRef.current)return;setEditing(goal);setLabel(goal?.label??'');setTarget(goal?.targetValue??0);setComparator(goal?.comparator??'at-least');setMessage('');setReview(false);setUnavailable(false);};
  const close=()=>{if(!busyRef.current&&!pendingRef.current)setEditing(undefined);};
  const command=(action:'create'|'update'|'archive')=>resultGoalCommandSchema.parse({schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),studentId,programId,goalId:editing?.id??crypto.randomUUID(),expectedVersion:editing?.version??0,action,dimension:editing?.dimension??dimension,comparator,targetValue:Number(target),label});
  const send=async(next:ResultGoalCommand)=>{
    if(busyRef.current||refreshRequiredRef.current)return;
    if(pendingRef.current&&JSON.stringify(pendingRef.current)!==JSON.stringify(next)){setMessage('Reintenta primero el comando exacto pendiente.');return;}
    busyRef.current=true;setBusy(true);setMessage('');pendingRef.current=next;setPending(next);
    try{
      const result=await mutateResultGoal({clinicId,command:next});
      if(result.status==='acknowledged'){
        pendingRef.current=null;setPending(null);setEditing(undefined);
        setMessage('Meta confirmada por el servidor.');
        try{const latest=await loadResultGoals(clinicId,studentId,programId);onGoalsRead(latest);router.refresh();}catch{refreshRequiredRef.current=true;setRefreshRequired(true);setMessage('Meta confirmada. Falló el refresco; consulta de nuevo, no repitas la escritura.');}
        return;
      }
      pendingRef.current=null;setPending(null);setMessage(result.message);
      if(result.status==='conflict')setReview(true);
    }catch(error){setMessage(error instanceof Error?error.message:'Resultado desconocido; reintenta la misma operación.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const consult=async()=>{
    if(busyRef.current||pendingRef.current)return;busyRef.current=true;setBusy(true);
    try{const latest=await loadResultGoals(clinicId,studentId,programId);
      onGoalsRead(latest);refreshRequiredRef.current=false;setRefreshRequired(false);
      if(editing){const current=latest.find(item=>item.id===editing.id);if(!current){setUnavailable(true);setMessage('La meta fue archivada o ya no está disponible. Tu borrador se conserva; no se recreará.');return;}setEditing(current);setMessage('Versión vigente '+current.version+' consultada. Revisa tu borrador antes de confirmar con una nueva operación.');}
      else setMessage('Bandeja consultada. Revisa el alta antes de enviar una nueva operación.');
      setReview(false);
    }catch(error){setMessage(error instanceof Error?error.message:'No se pudo consultar la versión vigente.');}
    finally{busyRef.current=false;setBusy(false);}
  };
  const submit=(action:'create'|'update'|'archive')=>{if(busyRef.current||pendingRef.current||review||unavailable)return;if(action==='archive'&&!window.confirm('¿Archivar esta meta conservando su historial?'))return;try{void send(command(action));}catch(error){setMessage(error instanceof Error?error.message:'Revisa los datos de la meta.');}};
  return <Paper withBorder p="md"><Stack><Group justify="space-between"><Title order={3}>Metas del gráfico</Title><Group><Button variant="light" loading={busy} disabled={!!pending} onClick={()=>void consult()}>Consultar metas vigentes</Button>{canConfigure&&<Button disabled={!dimension||busy||!!pending||refreshRequired} onClick={()=>open(null)}>Nueva meta</Button>}</Group></Group>
    {editing===undefined&&message&&<Alert>{message}</Alert>}
    {!goals.length&&<Text c="dimmed">No hay metas vigentes para este programa.</Text>}{goals.map(goal=><Group key={goal.id} justify="space-between"><div><Text fw={700}>{goal.label}</Text><Text size="sm" c="dimmed">{goal.comparator==='at-least'?'Al menos':'Como máximo'} {goal.targetValue.toLocaleString('es-CL')} · {dimensionLabels[goal.dimension]} · v{goal.version}</Text></div>{canConfigure&&<Button variant="light" disabled={busy||!!pending||refreshRequired} onClick={()=>open(goal)}>Editar</Button>}</Group>)}</Stack>
    <Modal opened={editing!==undefined} onClose={close} closeOnClickOutside={!busy&&!pending} closeOnEscape={!busy&&!pending} withCloseButton={!busy&&!pending} title={editing?'Editar meta':'Nueva meta'}><Stack>
      <TextInput label="Nombre" value={label} onChange={event=>setLabel(event.currentTarget.value)} disabled={busy||!!pending}/>
      <Select label="Criterio" value={comparator} onChange={value=>setComparator(value as 'at-least'|'at-most')} data={[{value:'at-least',label:'Al menos'},{value:'at-most',label:'Como máximo'}]} disabled={busy||!!pending}/>
      <NumberInput label="Valor" value={target} onChange={setTarget} min={editing?.dimension==='percentage'||editing?.dimension==='interval'||!editing&&(dimension==='percentage'||dimension==='interval')?0:undefined} max={editing?.dimension==='percentage'||editing?.dimension==='interval'||!editing&&(dimension==='percentage'||dimension==='interval')?100:undefined} disabled={busy||!!pending}/>
      {message&&<Alert color={pending||review?'yellow':'blue'}>{message}</Alert>}
      {review&&<Button loading={busy} onClick={()=>void consult()}>Consultar versión vigente conservando borrador</Button>}
      <Group justify="space-between">{editing&&<Button color="red" variant="light" disabled={busy||!!pending||review||unavailable} onClick={()=>submit('archive')}>Archivar</Button>}<Group ml="auto"><Button variant="default" disabled={busy||!!pending} onClick={close}>Cancelar</Button><Button loading={busy} disabled={!!pending||review||unavailable} onClick={()=>submit(editing?'update':'create')}>Guardar</Button>{pending&&<Button loading={busy} onClick={()=>void send(pending)}>Reintentar misma operación</Button>}</Group></Group>
    </Stack></Modal>
  </Paper>;
}

export function ProgramResults({data,programId,goals,generatedAt}:{data:ProgramSessionPageData;programId:string;goals:ResultGoal[];generatedAt:string}){
  const [goalSnapshot,setGoalSnapshot]=useState<{source:ResultGoal[];rows:ResultGoal[]}|null>(null);
  const visibleGoals=goalSnapshot?.source===goals?goalSnapshot.rows:goals;
  const onGoalsRead=(rows:ResultGoal[])=>setGoalSnapshot({source:goals,rows});
  const router=useRouter();
  const {identity,verified}=useIdentity();
  const exportScope=useRef({actorId:identity?.userId,clinicId:identity?.active?.id,studentId:data.studentId,programId,verified,canView:data.capabilities.includes('chart.view')});
  exportScope.current={actorId:identity?.userId,clinicId:identity?.active?.id,studentId:data.studentId,programId,verified,canView:data.capabilities.includes('chart.view')};
  const exportMounted=useRef(true);
  useEffect(()=>{exportMounted.current=true;return()=>{exportMounted.current=false;};},[]);
  const canExport=()=>exportMounted.current&&exportScope.current.verified&&exportScope.current.actorId===data.actorId&&exportScope.current.clinicId===data.clinicId&&exportScope.current.studentId===data.studentId&&exportScope.current.programId===programId&&exportScope.current.canView;
  const goalLeaveGuard=useRef<(()=>boolean)|null>(null);
  const program=data.programs.find(item=>item.id===programId)!;const current=program.versions.find(item=>item.id===program.currentVersionId)??program.versions[0];
  const records=data.records.filter(item=>item.programId===programId&&item.submitted&&!item.discarded);
  const dimensions=Array.from(new Set(records.flatMap(item=>{const persisted=safeMeasurement(item.originalMeasurement);return persisted?[persisted.schemaVersion===2?persisted.measurement.dimension:persisted.original.dimension as MeasurementV2['dimension']]:[];})));
  const [series,setSeries]=useState<string[]>(percentageSeries.map(item=>item.key));
  const [exportError,setExportError]=useState('');
  const [dimension,setDimension]=useState<MeasurementV2['dimension']|null>(dimensions[0]??null);const [phase,setPhase]=useState<string|null>(null);const [actor,setActor]=useState<string|null>(null);const [range,setRange]=useState('all');
  const [min,setMin]=useState(0);const [max,setMax]=useState(dimension==='percentage'||dimension==='interval'?100:10);const [expanded,setExpanded]=useState(false);const [editing,setEditing]=useState<Point|null>(null);const [note,setNote]=useState('');const [reason,setReason]=useState('');const [pendingRevision,setPendingRevision]=useState<CaptureCommandV2|null>(null);const [revisionBusy,setRevisionBusy]=useState(false);const [revisionMessage,setRevisionMessage]=useState('');const [revisionReview,setRevisionReview]=useState(false);const [revisionUnavailable,setRevisionUnavailable]=useState(false);const revisionBusyRef=useRef(false);const revisionPendingRef=useRef<CaptureCommandV2|null>(null);
  const points=useMemo(()=>records.flatMap(record=>{const value=metric(record.originalMeasurement);if(!value||value.measurement.dimension!==dimension)return [];return [{id:record.id,sessionId:record.sessionId,programVersionId:record.programVersionId,date:value.measurement.capturedAt,phase:value.measurement.phase,value:value.summary.value,unit:value.summary.unit,notes:value.measurement.notes,actorId:record.actorId,version:record.version,measurement:value.measurement,summary:value.summary,revisions:record.revisions} satisfies Point];}).filter(point=>{const cutoff=range==='all'?null:new Date(Date.parse(generatedAt)-Number(range)*86400000);return (!phase||point.phase===phase)&&(!actor||point.actorId===actor)&&(!cutoff||new Date(point.date)>=cutoff);}).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)),[records,dimension,phase,actor,range,generatedAt]);
  const legacy=records.flatMap(record=>{const persisted=safeMeasurement(record.originalMeasurement);if(persisted?.schemaVersion!==1||persisted.original.dimension!==dimension)return[];const original=persisted.original;const date=typeof original.capturedAt==='string'&&Number.isFinite(Date.parse(original.capturedAt))?original.capturedAt:record.createdAt;const legacyPhase=typeof original.phase==='string'?original.phase:null;const cutoff=range==='all'?null:Date.parse(generatedAt)-Number(range)*86400000;if(phase&&legacyPhase!==phase||actor&&record.actorId!==actor||cutoff!==null&&Date.parse(date)<cutoff)return[];return[{record,original,date,dimension:original.dimension as MeasurementV2['dimension'],phase:legacyPhase} satisfies LegacyPoint];}).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));
  const unsupported=records.filter(record=>!safeMeasurement(record.originalMeasurement));
  const actors=Array.from(new Set(records.map(item=>item.actorId)));const axisValid=Number.isFinite(min)&&Number.isFinite(max)&&min<max&&(dimension!=='percentage'&&dimension!=='interval'||(min>=0&&max<=100));
  const design=current?.originalDesign&&typeof current.originalDesign==='object'?current.originalDesign as Record<string,unknown>:null;const goal=typeof design?.masteryCriteria==='string'?design.masteryCriteria:null;
  const changeDimension=(value:string|null)=>{const next=value as MeasurementV2['dimension']|null;setDimension(next);setMin(0);setMax(next==='percentage'||next==='interval'?100:10);};
  const canLeave=()=>{if(revisionBusyRef.current||revisionPendingRef.current){setRevisionMessage('Recupera primero el recibo de la revisión.');return false;}if(editing&&!window.confirm('¿Descartar el borrador de nota y motivo?'))return false;return goalLeaveGuard.current?.()??true;};
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(editing||revisionBusyRef.current||revisionPendingRef.current){event.preventDefault();event.returnValue='';}};
    const link=(event:MouseEvent)=>{if(event.target instanceof Element&&event.target.closest('a[href]')&&!canLeave()){event.preventDefault();event.stopPropagation();}};
    window.addEventListener('beforeunload',warn);document.addEventListener('click',link,true);
    return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('click',link,true);};
  });
  const openNote=(point:Point)=>{if(revisionBusyRef.current||revisionPendingRef.current)return;setEditing(point);setNote(point.notes);setReason('');setRevisionReview(false);setRevisionUnavailable(false);setRevisionMessage('');};
  const sendRevision=async(command:CaptureCommandV2)=>{
    if(revisionBusyRef.current)return;
    if(revisionPendingRef.current&&JSON.stringify(revisionPendingRef.current)!==JSON.stringify(command)){setRevisionMessage('Recupera primero el comando exacto pendiente.');return;}
    revisionBusyRef.current=true;setRevisionBusy(true);revisionPendingRef.current=command;setPendingRevision(command);setRevisionMessage('');
    try{const result=await persistCaptureV2({clinicId:data.clinicId,command});
      if(result.status==='acknowledged'){revisionPendingRef.current=null;setPendingRevision(null);setEditing(null);router.refresh();return;}
      revisionPendingRef.current=null;setPendingRevision(null);setRevisionMessage(result.message);if(result.status==='conflict')setRevisionReview(true);
    }catch(cause){setRevisionMessage(cause instanceof Error?cause.message:'Resultado desconocido; reintenta exactamente la misma revisión.');}
    finally{revisionBusyRef.current=false;setRevisionBusy(false);}
  };
  const consultRevision=async()=>{
    if(!editing||revisionBusyRef.current||revisionPendingRef.current)return;revisionBusyRef.current=true;setRevisionBusy(true);
    try{const latest=await loadProgramSessionPageData(data.clinicId,data.studentId);const record=latest.records.find(item=>item.id===editing.id&&item.programId===programId&&item.submitted&&!item.discarded);const value=record?metric(record.originalMeasurement):null;
      if(!record||!value||!latest.capabilities.includes('record.submit')){setRevisionUnavailable(true);setRevisionMessage('El registro o el permiso ya no está disponible. Se conserva tu borrador; no se recreará.');return;}
      setEditing({id:record.id,sessionId:record.sessionId,programVersionId:record.programVersionId,date:value.measurement.capturedAt,phase:value.measurement.phase,value:value.summary.value,unit:value.summary.unit,notes:value.measurement.notes,actorId:record.actorId,version:record.version,measurement:value.measurement,summary:value.summary,revisions:record.revisions});
      setRevisionReview(false);setRevisionMessage('Versión vigente '+record.version+' consultada. Se conservaron tu nota y motivo; revisa antes de confirmar una nueva revisión.');
    }catch(cause){setRevisionMessage(cause instanceof Error?cause.message:'No se pudo consultar el registro vigente.');}
    finally{revisionBusyRef.current=false;setRevisionBusy(false);}
  };
  const submitRevision=()=>{if(!editing||revisionBusyRef.current||revisionPendingRef.current||revisionReview||revisionUnavailable)return;const parsed=captureCommandV2Schema.safeParse({schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),recordId:editing.id,sessionId:editing.sessionId,studentId:data.studentId,programId,programVersionId:editing.programVersionId,expectedVersion:editing.version,action:'revise',measurement:{...editing.measurement,notes:note},revisionReason:reason});if(!parsed.success){setRevisionMessage(parsed.error.issues[0]?.message??'Revisa la nota y el motivo.');return;}void sendRevision(parsed.data);};
  if(data.actorId!==identity?.userId||data.clinicId!==identity?.active?.id)return <MainLayout><Alert color="yellow">El contexto cambió. Vuelve a abrir resultados desde la ficha autorizada.</Alert></MainLayout>;
  return <MainLayout slots={{beforeNavigate:async()=>canLeave(),beforeNativeNavigate:canLeave,beforeSignOut:async()=>canLeave(),beforeClinicChange:async()=>canLeave()}}><Container size="xl" py="xl"><Stack gap="lg">
    <Group justify="space-between"><div><Text size="sm" c="dimmed">Resultados persistidos · {data.student.displayName}</Text><Title order={1}>{current?.title??'Programa sin versión titulada'}</Title></div><Button component="a" href={`/students/${data.studentId}?tab=programs`} variant="subtle">Volver a la ficha</Button></Group>
    <Alert color="blue" title="Lectura clínica sin interpretación automática">Cada gráfico muestra una sola dimensión y su unidad. Una subida o bajada no se etiqueta como mejora: la interpretación corresponde al equipo clínico.</Alert>
    <Paper withBorder p="md"><Stack><SimpleGrid cols={{base:1,sm:2,lg:4}}><Select label="Dimensión" value={dimension} onChange={changeDimension} data={dimensions.map(value=>({value,label:dimensionLabels[value]}))} placeholder="Sin registros sometidos"/><Select label="Periodo" value={range} onChange={value=>setRange(value??'all')} data={[{value:'all',label:'Todo el historial'},{value:'7',label:'Últimos 7 días'},{value:'30',label:'Últimos 30 días'},{value:'90',label:'Últimos 90 días'}]}/><Select label="Fase" clearable value={phase} onChange={setPhase} data={Object.entries(phaseLabels).map(([value,label])=>({value,label}))}/><Select label="Profesional" clearable value={actor} onChange={setActor} data={actors.map(value=>({value,label:`Profesional · ${value.slice(0,8)}`}))}/></SimpleGrid><Group align="end"><NumberInput label="Eje Y mínimo" value={min} onChange={value=>setMin(Number(value))}/><NumberInput label="Eje Y máximo" value={max} onChange={value=>setMax(Number(value))}/><Button variant="default" leftSection={<Expand size={16}/>} onClick={()=>setExpanded(true)} disabled={!points.length||!axisValid}>Ampliar</Button><Button variant="outline" leftSection={<Download size={16}/>} disabled={!verified||!points.length&&!legacy.length} onClick={()=>{if(canExport())downloadCsv(`resultados-${programId}.csv`,points,legacy);}}>Descargar CSV</Button><Button leftSection={<FileText size={16}/>} disabled={!verified||!points.length&&!legacy.length} onClick={()=>{setExportError('');void downloadPdf({fileName:`resultados-${programId}.pdf`,programTitle:current?.title??'Programa',studentName:data.student.displayName,points,legacy,goals:visibleGoals.filter(item=>item.dimension===dimension),isCurrent:canExport}).catch(()=>{if(canExport())setExportError('No se pudo generar el PDF. Tus datos no fueron modificados.');});}}>Descargar PDF</Button></Group>{!axisValid&&<Alert color="red">El mínimo debe ser menor que el máximo. Porcentajes e intervalos deben permanecer entre 0 y 100.</Alert>}</Stack></Paper>
    {exportError&&<Alert color="red">{exportError}</Alert>}
    {unsupported.length>0&&<Alert color="yellow">{unsupported.length} registros con formato no soportado permanecen conservados. No se calcularon ni exportaron métricas para ellos; solicita revisión.</Alert>}
    {dimension==='percentage'&&<Paper withBorder p="md"><Checkbox.Group label="Series porcentuales a mostrar" value={series} onChange={setSeries}><Group mt="xs">{percentageSeries.map(item=><Checkbox key={item.key} value={item.key} label={item.label}/>)}</Group></Checkbox.Group><Text size="xs" c="dimmed" mt="xs">Cada serie usa ensayos registrados (I+A+E+NR) como denominador. Sin registrar queda fuera; no se combina con V1. Los toggles sólo cambian el gráfico, no los datos exportados.</Text>{!series.length&&<Alert mt="sm">Selecciona una serie para mostrarla.</Alert>}</Paper>}
    {legacy.length>0&&<Paper withBorder p="lg"><Title order={3}>Resultados históricos V1 · {legacy.length}</Title><Alert color="yellow" mt="sm">Agregados originales de sólo lectura. Un false no identifica error, ayuda o NR; faltan tiempos y detalle de ensayos. No se convierten en V2 ni se combinan con sus series. Si no consta fecha de captura, se muestra la fecha persistida de creación. El filtro de fase excluye históricos sin fase conocida.</Alert><Stack mt="sm">{legacy.map(point=><details key={point.record.id}><summary>{new Date(point.date).toLocaleString('es-CL')} · {dimensionLabels[point.dimension]} · v{point.record.version} · profesional {point.record.actorId.slice(0,8)}</summary><Text size="sm" component="pre" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(point.original,null,2)}</Text></details>)}</Stack></Paper>}
    {goal&&<Paper withBorder p="md"><Text fw={700}>Criterio clínico publicado</Text><Text>{goal}</Text><Text size="xs" c="dimmed">Proviene de la versión {current?.number}; se conserva separado de las metas longitudinales.</Text></Paper>}
    <GoalsPanel key={`${data.actorId}:${data.clinicId}:${data.studentId}:${programId}`} goals={visibleGoals} clinicId={data.clinicId} studentId={data.studentId} programId={programId} dimension={dimension} canConfigure={data.capabilities.includes('chart.configure')} leaveGuard={goalLeaveGuard} onGoalsRead={onGoalsRead}/>
    <Paper withBorder p="lg"><Group justify="space-between" mb="md"><Title order={3}>{dimension?`${dimensionLabels[dimension]} · ${points[0]?.unit??'sin unidad disponible'}`:'Sin dimensión disponible'}</Title><Badge variant="light">{points.length} registros</Badge></Group>{!points.length?<Alert>No existen registros V2 para estos filtros. Los históricos V1 se consultan aparte, sin reconstruir detalles.</Alert>:axisValid?<ResultsChart points={points} min={min} max={max} goals={visibleGoals.filter(item=>item.dimension===dimension)} series={series}/>:null}</Paper>
    <Paper withBorder p="lg"><Title order={3} mb="md">Registro detallado y correcciones</Title><Table.ScrollContainer minWidth={950}><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Fecha</Table.Th><Table.Th>Fase</Table.Th><Table.Th>Valor</Table.Th><Table.Th>Métricas derivadas</Table.Th><Table.Th>Notas</Table.Th><Table.Th>Profesional</Table.Th><Table.Th>Correcciones</Table.Th><Table.Th>Acción</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{[...points].reverse().map(point=><Table.Tr key={point.id}><Table.Td>{new Date(point.date).toLocaleString('es-CL')}</Table.Td><Table.Td><Badge variant="light">{phaseLabels[point.phase]}</Badge></Table.Td><Table.Td>{point.value===null?'Sin valor':`${point.value.toLocaleString('es-CL',{maximumFractionDigits:2})} ${point.unit}`}</Table.Td><Table.Td>{metricDetails(point.summary)}</Table.Td><Table.Td>{point.notes||'—'}</Table.Td><Table.Td>{point.actorId.slice(0,8)}</Table.Td><Table.Td>{point.revisions.length?point.revisions.map(revision=><Text size="xs" key={revision.id}>v{revision.number} · {revision.reason} · {new Date(revision.createdAt).toLocaleString('es-CL')}</Text>):'Sin correcciones'}</Table.Td><Table.Td>{data.capabilities.includes('record.submit')&&<Button size="xs" variant="subtle" onClick={()=>openNote(point)}>Editar nota</Button>}</Table.Td></Table.Tr>)}</Table.Tbody></Table></Table.ScrollContainer></Paper>
    <Modal opened={expanded} onClose={()=>setExpanded(false)} title={`${current?.title??'Programa'} · gráfico ampliado`} size="95%">{axisValid&&<ResultsChart points={points} min={min} max={max} goals={visibleGoals.filter(item=>item.dimension===dimension)} series={series}/>}<Text size="sm" c="dimmed">Cerrar esta vista conserva todos los filtros y límites del gráfico.</Text></Modal>
    <Modal opened={editing!==null} onClose={()=>{if(!revisionBusy&&!pendingRevision)setEditing(null);}} closeOnClickOutside={!revisionBusy&&!pendingRevision} closeOnEscape={!revisionBusy&&!pendingRevision} withCloseButton={!revisionBusy&&!pendingRevision} title="Editar nota con revisión"><Stack><Alert color="blue">Las observaciones y el valor medido se conservan sin cambios. Sólo se sustituye la nota y queda una revisión trazable.</Alert><Textarea label="Nota clínica" value={note} onChange={event=>setNote(event.currentTarget.value)} maxLength={10000} minRows={4} disabled={revisionBusy||!!pendingRevision}/><Textarea label="Motivo de la corrección" value={reason} onChange={event=>setReason(event.currentTarget.value)} maxLength={2000} minRows={2} disabled={revisionBusy||!!pendingRevision} required/>{revisionMessage&&<Alert color={pendingRevision?'yellow':'red'}>{revisionMessage}</Alert>}{revisionReview&&<Button loading={revisionBusy} onClick={()=>void consultRevision()}>Consultar registro vigente conservando borrador</Button>}<Group justify="flex-end"><Button variant="default" disabled={revisionBusy||!!pendingRevision} onClick={()=>setEditing(null)}>Cancelar</Button><Button loading={revisionBusy} disabled={!!pendingRevision||revisionReview||revisionUnavailable} onClick={submitRevision}>Guardar revisión</Button>{pendingRevision&&<Button loading={revisionBusy} onClick={()=>void sendRevision(pendingRevision)}>Reintentar misma revisión</Button>}</Group></Stack></Modal>
  </Stack></Container></MainLayout>;
}
