'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { Alert, Button, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Program } from '@/api/programsData';
import { programDraftCommandV2Schema, readProgramDesign, type ProgramDesignV2, type ProgramDraftCommandV2 } from '@/domain/programs/design-v2';
import { loadProgramSessionPageData, saveProgramDraftV2, transitionProgramV2 } from '@/modules/program-session/program-session.server';
import { emptyProgramDesign, programLifecycleCommandV2Schema, type ProgramDto, type ProgramLifecycleCommandV2, type ProgramSessionPageData } from '@/modules/program-session/ports';
import { BehaviorProgramDesigner, type BehaviorDesignExtras } from './BehaviorProgramDesigner';
import { ProgramsDashboard as ProgramsDashboardBase, type ProgramDashboardItem } from './ProgramsDashboard';
import { SkillProgramDesigner, type SkillDesignExtras } from './SkillProgramDesigner';

type Editor={programId:string;versionId:string;predecessorVersionId:string|null;expectedVersion:number;programRevision:number;title:string;design:ProgramDesignV2};
type Props={data:ProgramSessionPageData;onRegisterData:(programId:string)=>void;onViewChart:(programId:string)=>void;onGuardChange?:(blocked:boolean)=>void};

const latestVersion=(program:ProgramDto)=>program.versions.find(item=>item.id===program.currentVersionId)??program.versions[0];
function toDashboard(program:ProgramDto):ProgramDashboardItem|null{const version=latestVersion(program);if(!version)return null;const read=readProgramDesign(version.originalDesign);if(read.schemaVersion!==2)return null;const d=read.design;const common={id:program.id,studentId:program.studentId,name:version.title,status:program.status,createdDate:version.createdAt,lastModified:version.publishedAt??version.createdAt,createdBy:'Equipo clínico'};
  return d.kind==='acquisition'?{...common,category:'skill-acquisition',objective:d.objective,antecedent:d.antecedent,steps:d.steps,procedure:d.procedure,sets:d.sets,prompts:d.prompts,errorCorrection:d.errorCorrection,masteryCriteria:d.masteryCriteria,generalization:d.generalization,measurementDimension:d.measurementDimension,skillArea:d.skillArea,teachingProcedure:d.teachingProcedure,promptLevels:d.promptLevels} as ProgramDashboardItem:{...common,category:'behavior-management',topography:d.topography,operationalDefinition:d.operationalDefinition,currentDimension:d.currentDimension,functions:d.functions,precursorBehaviors:d.precursorBehaviors,replacementBehavior:d.replacementBehavior,procedure:d.procedure,masteryCriteria:d.masteryCriteria,crisisPlan:d.crisisPlan,measurementDimension:d.measurementDimension,hypothesizedFunctionNotes:d.hypothesizedFunctionNotes,preventionStrategy:d.preventionStrategy,responseStrategy:d.responseStrategy} as ProgramDashboardItem;}

type Work = {kind:'draft';command:ProgramDraftCommandV2;publish:boolean;ackVersion?:number}|{kind:'lifecycle';command:ProgramLifecycleCommandV2;ackVersion?:number};

export function ProgramManagementV2({data,onRegisterData,onViewChart,onGuardChange}:Props){
  const [snapshot,setSnapshot]=useState(data);
  const programs=snapshot.programs;
  const [editor,setEditor]=useState<Editor|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const busyRef=useRef(false);
  const pending=useRef<Work|null>(null);
  const [work,setWork]=useState<Work|null>(null);
  const [conflict,setConflict]=useState<Work|null>(null);
  const [review,setReview]=useState<ProgramSessionPageData|null>(null);
  const canManage=snapshot.student.status==='active'&&snapshot.capabilities.includes('program.edit');
  const blocked=!!editor||!!work||!!conflict||busy;
  const keep=(value:Work|null)=>{pending.current=value;setWork(value);};
  useEffect(()=>{onGuardChange?.(blocked);},[blocked,onGuardChange]);
  useEffect(()=>()=>onGuardChange?.(false),[onGuardChange]);
  useEffect(()=>{if(!blocked)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[blocked]);
  const dashboard=useMemo(()=>programs.flatMap(item=>{try{const mapped=toDashboard(item);return mapped?[mapped]:[];}catch{return[];}}),[programs]);
  const legacyVersions=useMemo(()=>programs.flatMap(program=>program.versions.flatMap(version=>{try{
    return readProgramDesign(version.originalDesign).schemaVersion===1?[{program,version}]:[];
  }catch{return[];}})),[programs]);
  const refresh=async()=>{const next=await loadProgramSessionPageData(data.clinicId,data.studentId);if(next.actorId!==data.actorId)throw new Error('La identidad cambió. No se reemplazó el trabajo de la sesión anterior.');setSnapshot(next);return next;};
  const openNew=(category:'skill-acquisition'|'behavior-management')=>{if(blocked||!canManage)return;setError('');setEditor({programId:crypto.randomUUID(),versionId:crypto.randomUUID(),predecessorVersionId:null,expectedVersion:0,programRevision:0,title:'',design:emptyProgramDesign(category==='skill-acquisition'?'acquisition':'behavior')});};
  const openDesign=(programId:string)=>{if(blocked||!canManage)return;const program=programs.find(item=>item.id===programId);if(!program)return;const draft=program.versions.find(item=>item.state==='draft');const base=draft??latestVersion(program);if(!base)return;try{const read=readProgramDesign(base.originalDesign);if(read.schemaVersion!==2)throw new Error('El diseño V1 requiere recreación explícita antes de editarse.');setError('');setEditor({programId:program.id,versionId:draft?.id??crypto.randomUUID(),predecessorVersionId:draft?draft.predecessorVersionId:base.id,expectedVersion:draft?.revision??0,programRevision:program.revision,title:base.title,design:read.design});}catch(cause){setError(cause instanceof Error?cause.message:'Diseño no disponible.');}};
  const buildDesign=(raw:Partial<Program>&Record<string,unknown>,kind:ProgramDesignV2['kind']):ProgramDesignV2=>kind==='acquisition'?{schemaVersion:2,kind,measurementDimension:raw.measurementDimension as SkillDesignExtras['measurementDimension'],objective:String(raw.objective??''),antecedent:String(raw.antecedent??''),steps:(raw.steps??[]) as Extract<ProgramDesignV2,{kind:'acquisition'}>['steps'],sets:(raw.sets??[]) as Extract<ProgramDesignV2,{kind:'acquisition'}>['sets'],procedure:String(raw.procedure??''),prompts:String(raw.prompts??''),errorCorrection:String(raw.errorCorrection??''),masteryCriteria:String(raw.masteryCriteria??''),generalization:String(raw.generalization??''),skillArea:String(raw.skillArea??''),teachingProcedure:String(raw.teachingProcedure??''),promptLevels:(raw.promptLevels??[]) as string[]}:{schemaVersion:2,kind,measurementDimension:raw.measurementDimension as BehaviorDesignExtras['measurementDimension'],topography:String(raw.topography??''),operationalDefinition:String(raw.operationalDefinition??''),currentDimension:String(raw.currentDimension??''),precursorBehaviors:String(raw.precursorBehaviors??''),functions:(raw.functions??[]) as Extract<ProgramDesignV2,{kind:'behavior'}>['functions'],replacementBehavior:String(raw.replacementBehavior??''),procedure:String(raw.procedure??''),masteryCriteria:String(raw.masteryCriteria??''),crisisPlan:String(raw.crisisPlan??''),hypothesizedFunctionNotes:String(raw.hypothesizedFunctionNotes??''),preventionStrategy:String(raw.preventionStrategy??''),responseStrategy:String(raw.responseStrategy??'')};
  // A receipt acknowledges the command, not a client-invented resource snapshot.
  // Keep acknowledged work until its authorized read succeeds; retry then reads only.
  const execute=async(initial:Work):Promise<boolean>=>{
    let current=initial;
    while(true){
      if(current.ackVersion===undefined){
        const result=current.kind==='draft'?await saveProgramDraftV2({clinicId:data.clinicId,command:current.command}):await transitionProgramV2({clinicId:data.clinicId,command:current.command});
        if(result.status!=='acknowledged'){
          keep(null);setError(result.message);
          if(result.status==='conflict'){setConflict(current);setReview(null);}
          return false;
        }
        current={...current,ackVersion:result.serverVersion};keep(current);
        notifications.show({title:'Operación confirmada',message:'Recibo correlacionado recibido. Actualizando la lectura autorizada.',color:'green'});
      }
      const next=await refresh();
      if(current.kind==='draft'){
        const savedCommand=current.command;
        const program=next.programs.find(item=>item.id===savedCommand.programId);
        const version=program?.versions.find(item=>item.id===savedCommand.programVersionId);
        if(program&&version&&version.state==='draft'&&version.revision===current.ackVersion){
          setEditor(value=>value?{...value,expectedVersion:version.revision,programRevision:program.revision}:value);
        }
      }
      if(current.kind==='draft'&&current.publish){
        const program=next.programs.find(item=>item.id===current.command.programId);
        const version=program?.versions.find(item=>item.id===(current.kind==='draft'?current.command.programVersionId:null));
        if(!program||!version||version.state!=='draft'||version.revision!==current.ackVersion){
          keep(null);setConflict(current);setReview(null);setError('El borrador fue guardado, pero cambió antes de publicarlo. Revisa el estado actual; no se publicó automáticamente.');return false;
        }
        const command=programLifecycleCommandV2Schema.parse({schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),studentId:data.studentId,programId:program.id,programVersionId:version.id,expectedVersion:program.revision,expectedDraftRevision:version.revision,action:'publish',terminalConfirmation:false});
        current={kind:'lifecycle',command};keep(current);continue;
      }
      keep(null);setError('');setEditor(null);return true;
    }
  };
  const run=async(current:Work)=>{
    if(busyRef.current)return false;
    busyRef.current=true;setBusy(true);setError('');keep(current);
    try{return await execute(current);}catch(cause){setError(`${pending.current?.ackVersion!==undefined?'La operación ya fue confirmada; falta actualizar la lectura.':'Resultado desconocido; conserva y reintenta la misma operación.'} ${cause instanceof Error?cause.message:''}`);return false;}finally{busyRef.current=false;setBusy(false);}
  };
  const submit=async(raw:Partial<Program>&Record<string,unknown>,publish:boolean)=>{
    if(!editor||busyRef.current||pending.current||conflict||!canManage)throw new Error('Resuelve la operación pendiente antes de guardar.');
    const command=programDraftCommandV2Schema.parse({schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),studentId:data.studentId,programId:editor.programId,programVersionId:editor.versionId,predecessorVersionId:editor.predecessorVersionId,expectedVersion:editor.expectedVersion,title:String(raw.name??editor.title),design:buildDesign(raw,editor.design.kind)});
    if(!await run({kind:'draft',command,publish}))throw new Error('El editor conserva el borrador. Revisa el aviso de la operación.');
  };
  const changeStatus=async(item:ProgramDashboardItem,target:Program['status'])=>{
    if(busyRef.current||pending.current||conflict||editor||!canManage)return false;
    const program=programs.find(value=>value.id===item.id);if(!program)return false;
    const action=target==='paused'?'pause':target==='achieved'?'achieve':target==='discontinued'?'discontinue':program.status==='paused'?'reactivate':null;
    if(!action){setError('Esta transición requiere abrir el borrador y publicarlo explícitamente.');return false;}
    const command=programLifecycleCommandV2Schema.parse({schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),studentId:data.studentId,programId:program.id,programVersionId:null,expectedVersion:program.revision,expectedDraftRevision:null,action,terminalConfirmation:action==='achieve'||action==='discontinue'});
    return run({kind:'lifecycle',command});
  };
  const inspectConflict=async()=>{if(busyRef.current)return;busyRef.current=true;setBusy(true);setReview(null);try{setReview(await refresh());}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo leer el estado actual. El reenvío permanece bloqueado.');}finally{busyRef.current=false;setBusy(false);}};
  const acceptReview=()=>{
    if(!review||!conflict)return;
    if(!review.capabilities.includes('program.edit')||review.student.status!=='active'){setError('Ya no se permite editar esta ficha. Conserva el borrador; no se enviará otro comando.');return;}
    if(editor&&(conflict.kind==='draft'||(conflict.kind==='lifecycle'&&conflict.command.action==='publish'))){
      const program=review.programs.find(item=>item.id===editor.programId);
      if(program&&['achieved','discontinued'].includes(program.status)){setError('El programa está en estado terminal; no se sobrescribirá. Puedes cerrar conservando la revisión en pantalla.');return;}
      const draft=program?.versions.find(item=>item.state==='draft');
      const base=program?latestVersion(program):undefined;
      setEditor(value=>value?{...value,versionId:draft?.id??(program?crypto.randomUUID():value.versionId),expectedVersion:draft?.revision??0,predecessorVersionId:draft?draft.predecessorVersionId:base?.id??null,programRevision:program?.revision??0}:value);
    }
    setConflict(null);setReview(null);setError('Estado actual revisado. El borrador local no fue reemplazado ni enviado. Guarda o selecciona la transición nuevamente para confirmar.');
  };
  const closeEditor=()=>{if(busyRef.current||pending.current){setError('No puedes cerrar mientras falta resolver la operación.');return;}setEditor(null);setConflict(null);setReview(null);};
  // Stable across operation/error renders: designers must never reset typed fields on retry.
  const legacy=useMemo(()=>editor?toDashboard({id:editor.programId,studentId:data.studentId,clinicId:data.clinicId,kind:editor.design.kind,status:'draft',revision:editor.programRevision,currentVersionId:editor.versionId,versions:[{id:editor.versionId,programId:editor.programId,studentId:data.studentId,clinicId:data.clinicId,number:1,revision:editor.expectedVersion,state:'draft',title:editor.title,originalDesign:editor.design,predecessorVersionId:editor.predecessorVersionId,createdAt:'',publishedAt:null}]}):null,[editor,data.studentId,data.clinicId]);
  const notice=<Stack gap="xs">{error&&<Alert color="orange">{error}</Alert>}{work&&<Button loading={busy} onClick={()=>{const current=pending.current;if(current)void run(current);}}>{work.ackVersion!==undefined?'Actualizar lectura confirmada':'Reintentar operación exacta'}</Button>}{conflict&&<Alert color="orange" title="Revisión de conflicto"><Button loading={busy} onClick={()=>void inspectConflict()}>Leer versión actual</Button>{review&&<><Text mt="sm">Estado autorizado actual. Compáralo con tu borrador antes de volver a guardar.</Text><pre style={{maxHeight:240,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify(review.programs.find(item=>item.id===conflict.command.programId)??{estado:'Programa no disponible en esta lectura'},null,2)}</pre><Button disabled={busy} onClick={acceptReview}>He revisado; conservar mi borrador para un nuevo envío</Button>{!editor&&<Button variant="subtle" disabled={busy} onClick={()=>{setConflict(null);setReview(null);}}>Cancelar transición</Button>}</>}</Alert>}</Stack>;
  return <>{!editor&&notice}{legacyVersions.length>0&&<Alert color="blue" title="Diseños históricos V1">
    {legacyVersions.length} versiones antiguas se conservan sin convertir texto ni resultados en campos V2 inventados. Puedes inspeccionarlas abajo; para editar, crea explícitamente un sucesor V2.
  </Alert>}<ProgramsDashboardBase programs={dashboard} operationNotice={notice} canManage={canManage&&!blocked} onDesignProgram={openDesign} onRegisterData={id=>{if(!blocked)onRegisterData(id);}} onViewChart={id=>{if(!blocked)onViewChart(id);}} onCreateProgram={openNew} onChangeStatus={changeStatus}/>
  {programs.length>0&&<Stack gap="xs"><Text fw={600}>Historial autorizado de versiones</Text>{programs.map(program=><details key={program.id}>
    <summary>{program.kind==='acquisition'?'Adquisición':'Conducta'} · {program.status} · {program.versions.length} versiones</summary>
    <Stack gap="xs" mt="xs">{program.versions.map(version=><details key={version.id}>
      <summary>v{version.number} · {version.title||'Sin título'} · {version.state} · revisión {version.revision}</summary>
      <pre style={{maxHeight:260,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify(version.originalDesign,null,2)}</pre>
    </details>)}</Stack>
  </details>)}</Stack>}
  {editor?.design.kind==='acquisition'&&<SkillProgramDesigner program={legacy?.category==='skill-acquisition'?legacy:undefined} exportContext={{programId:editor.programId,versionId:editor.versionId,predecessorVersionId:editor.predecessorVersionId,expectedVersion:editor.expectedVersion}} opened closeBlocked={!!work||busy} locked={!!work||!!conflict||busy} operationNotice={notice} onClose={closeEditor} onSave={value=>submit(value as typeof value&Record<string,unknown>,false)} onPublish={value=>submit(value as typeof value&Record<string,unknown>,true)}/>} {editor?.design.kind==='behavior'&&<BehaviorProgramDesigner program={legacy?.category==='behavior-management'?legacy:undefined} exportContext={{programId:editor.programId,versionId:editor.versionId,predecessorVersionId:editor.predecessorVersionId,expectedVersion:editor.expectedVersion}} opened closeBlocked={!!work||busy} locked={!!work||!!conflict||busy} operationNotice={notice} onClose={closeEditor} onSave={value=>submit(value as typeof value&Record<string,unknown>,false)} onPublish={value=>submit(value as typeof value&Record<string,unknown>,true)}/>}</>;
}
