'use client';

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { ActionIcon, Alert, Avatar, Badge, Button, Card, Checkbox, Container, Group, Modal, Paper, Progress, SimpleGrid, Stack, Text, Textarea, ThemeIcon, Title } from '@mantine/core';
import { Archive, AlertTriangle, Brain, CheckCircle2, ChevronLeft, Clock, HardDriveDownload, HardDriveUpload, LogOut, PauseCircle, PlayCircle, Plus, XCircle } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from '@/lib/navigation';
import { createMeasurement, DataCollectionEngine, type CaptureCommit } from '@/features/dataCollection/DataCollectionEngine';
import { archiveSessionV2, persistCaptureV2, mutateSessionV2, loadProgramSessionPageData } from '@/modules/program-session/program-session.server';
import { captureCommandV2Schema, measurementV2Schema, type CaptureCommandV2, type MeasurementV2 } from '@/domain/measurements/measurement-v2';
import { archiveSessionCommandV2Schema, sessionCommandV2Schema, sessionV2Timeline, type ArchiveSessionCommandV2, type SessionCommandV2, type SessionV2 } from '@/domain/sessions/session-v2';
import { readProgramDesign } from '@/domain/programs/design-v2';
import type { ProgramDto, ProgramSessionPageData } from '@/modules/program-session/ports';
import { useOffline } from '@/modules/offline';

type LocalRecord={id:string;programId:string;programVersionId:string;version:number;measurement:MeasurementV2;submitted:boolean;revisionReason:string;pendingEntryId?:string;pendingAction?:CaptureCommandV2['action']};
const dimensionOf=(program:ProgramDto,versionId:string):MeasurementV2['dimension']|null=>{const version=program.versions.find(item=>item.id===versionId);if(!version)return null;try{const read=readProgramDesign(version.originalDesign);return read.schemaVersion===2?read.design.measurementDimension:null;}catch{return null;}};
const hasMeasurementContent=(measurement:MeasurementV2)=>Boolean(measurement.notes.trim())||(measurement.dimension==='percentage'?measurement.trials.some(item=>item.response!==null||item.notes.trim()||item.stimulusPrompts.length):measurement.dimension==='frequency'?Boolean(measurement.windows.length||measurement.events.length):measurement.dimension==='interval'?measurement.intervals.some(item=>item.occurred!==null||item.notes.trim()):measurement.dimension==='duration'?Boolean(measurement.episodes.length):Boolean(measurement.trials.length));
const legacyMeasurement=(raw:unknown)=>{if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;const value=raw as Record<string,unknown>;if(value.schemaVersion!==1||!value.payload||typeof value.payload!=='object'||Array.isArray(value.payload))return null;return {dimension:String(value.dimension??'desconocida'),payload:value.payload as Record<string,unknown>};};
const applyQueuedSessionCommand=(current:SessionV2,command:SessionCommandV2,actorId:string,serverVersion?:number|null):SessionV2=>{
  const eventType:SessionV2['events'][number]['type']|null=command.action==='start'?'started':command.action==='pause'?'paused':command.action==='resume'?'resumed':command.action==='finish'?'finished':command.action==='cancel'?'cancelled':null;
  const events=eventType&&!current.events.some(event=>event.id===command.operationId)?[...current.events,{id:command.operationId,sequence:current.events.length+1,occurredAt:command.occurredAt,type:eventType,actorId,notes:command.notes}]:current.events;
  return {...current,id:command.sessionId,studentId:command.studentId,version:serverVersion??command.expectedVersion+1,capturedAt:command.occurredAt,notes:command.notes,programs:command.programs,events};
};

export default function SessionPage({ data: initialData, onExit }: { data: ProgramSessionPageData; onExit?: () => void }) {
  const [data,setData]=useState(initialData);
  const offline=useOffline();
  const lock=useRef(false);
  const [refreshTarget,setRefreshTarget]=useState<{kind:'session'|'capture';id:string;version:number;keepSelection?:boolean;discarded?:boolean;archived?:boolean}|null>(null);
  const refreshRef=useRef<typeof refreshTarget>(null);
  const [conflict,setConflict]=useState<{kind:'session'|'capture';id:string;message:string;review:ProgramSessionPageData|null}|null>(null);
  const navigate=useNavigate();
  const resumable=data.sessions.find(item=>['active','paused','draft'].includes(sessionV2Timeline(item).status));
  const [session,setSession]=useState<SessionV2>(()=>resumable??{schemaVersion:2,id:crypto.randomUUID(),studentId:data.studentId,clinicId:data.clinicId,version:0,capturedAt:new Date().toISOString(),notes:'',programs:[],events:[]});
  const [selected,setSelected]=useState<string[]>(()=>session.programs.map(item=>item.programId));
  const [records,setRecords]=useState<LocalRecord[]>(()=>data.records.filter(item=>item.sessionId===session.id&&!item.discarded).flatMap(item=>{const parsed=measurementV2Schema.safeParse(item.originalMeasurement);return parsed.success?[{id:item.id,programId:item.programId,programVersionId:item.programVersionId,version:item.version,measurement:parsed.data,submitted:item.submitted,revisionReason:''}]:[];}));
  const [savedNotes,setSavedNotes]=useState(session.notes);
  const baseline=useRef(new Map(records.map(item=>[item.id,JSON.stringify(item.measurement)])));
  const [activeRecordId,setActiveRecordId]=useState<string|null>(null);const [captureOpen,setCaptureOpen]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [terminal,setTerminal]=useState<'finish'|'cancel'|null>(null);const [archiveOpen,setArchiveOpen]=useState(false);const [archiveReason,setArchiveReason]=useState('');const [clock,setClock]=useState(()=>Date.now());
  const [offlineBusy,setOfflineBusy]=useState(false);const [offlineMessage,setOfflineMessage]=useState('');
  const [offlineConflictReview,setOfflineConflictReview]=useState<{entryId:string;review:ProgramSessionPageData|null}|null>(null);
  const pendingSession=useRef<SessionCommandV2|null>(null);const pendingArchive=useRef<ArchiveSessionCommandV2|null>(null);const pendingCaptures=useRef(new Map<string,CaptureCommandV2>());
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      const entries=offline.queue.filter(entry=>entry.payload.kind==='capture'&&entry.payload.command.studentId===data.studentId&&entry.payload.command.sessionId===session.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      if(!entries.length)return;
      setRecords(current=>{
        let next:LocalRecord[]=current.map(item=>({...item,pendingEntryId:undefined,pendingAction:undefined}));
        for(const entry of entries){
          if(entry.payload.kind!=='capture'||entry.status==='superseded')continue;
          const command=entry.payload.command;const index=next.findIndex(item=>item.id===command.recordId);
          // A queue refresh must not restore an older acknowledged payload over
          // a newer server revision or over unsaved observations in this form.
          if(index!==-1){
            const visible=next[index];const saved=baseline.current.get(command.recordId);
            if(saved!==undefined&&saved!==JSON.stringify(visible.measurement))continue;
            if(entry.status==='acknowledged'&&visible.version>=(entry.serverVersion??command.expectedVersion))continue;
          }
          if(entry.status==='acknowledged'&&command.action==='discard'){next=next.filter(item=>item.id!==command.recordId);baseline.current.delete(command.recordId);continue;}
          const updated:LocalRecord={id:command.recordId,programId:command.programId,programVersionId:command.programVersionId,version:entry.status==='acknowledged'?(entry.serverVersion??command.expectedVersion):command.expectedVersion,measurement:command.measurement,submitted:entry.status==='acknowledged'&&(command.action==='submit'||command.action==='revise'),revisionReason:'',pendingEntryId:entry.status==='acknowledged'?undefined:entry.id,pendingAction:entry.status==='acknowledged'?undefined:command.action};
          baseline.current.set(command.recordId,JSON.stringify(command.measurement));
          if(index===-1)next.push(updated);else next[index]={...next[index],...updated};
        }
        return next;
      });
    },0);
    return()=>window.clearTimeout(timer);
  },[data.studentId,offline.queue,session.id]);
  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  // A confirmed event can be newer than the last one-second UI clock tick.
  // Never move the snapshot backwards in time while refreshing an ACK.
  const timeline=sessionV2Timeline({...session,capturedAt:new Date(Math.max(clock,Date.parse(session.capturedAt))).toISOString()});const status=timeline.status;
  const available=data.programs.filter(item=>item.status==='active'&&item.currentVersionId&&dimensionOf(item,item.currentVersionId));
  const snapshotRefs=status==='draft'?available.filter(item=>selected.includes(item.id)).map(item=>({programId:item.id,programVersionId:item.currentVersionId!})):session.programs;
  const visiblePrograms=status==='draft'?available:snapshotRefs.flatMap(ref=>{const found=data.programs.find(item=>item.id===ref.programId);return found?[found]:[];});
  const submittedPrograms=useMemo(()=>new Set(records.filter(item=>item.submitted).map(item=>item.programId)),[records]);
  const progress=snapshotRefs.length?100*snapshotRefs.filter(ref=>submittedPrograms.has(ref.programId)).length/snapshotRefs.length:0;
  const denied=data.student.status==='archived'||!data.capabilities.includes('record.capture');
  const canArchive=data.student.status!=='archived'&&data.capabilities.includes('record.submit');
  const downloaded=offline.downloads.find(item=>item.studentId===data.studentId)??null;
  const pendingOfflineSession=offline.queue.filter(entry=>entry.payload.kind==='session'&&entry.payload.command.studentId===data.studentId&&entry.payload.command.sessionId===session.id&&entry.status!=='acknowledged'&&entry.status!=='superseded');
  const blockedOffline=offline.queue.filter(entry=>entry.status==='blocked-conflict'&&entry.payload.command.studentId===data.studentId&&entry.payload.command.sessionId===session.id);
  const offlineConflictServerValue=(entry:(typeof blockedOffline)[number],review:ProgramSessionPageData)=>{
    const payload=entry.payload;
    return payload.kind==='session'
      ? review.sessions.find(item=>item.id===payload.command.sessionId)
      : review.records.find(item=>item.id===payload.command.recordId);
  };
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      const entries=offline.queue.filter(entry=>entry.payload.kind==='session'&&entry.payload.command.studentId===data.studentId&&entry.status!=='superseded').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
      if(!entries.length)return;
      setSession(current=>{
        let next=current;
        for(const entry of entries){
          if(entry.payload.kind!=='session')continue;
          const command=entry.payload.command;const targetVersion=entry.status==='acknowledged'?(entry.serverVersion??command.expectedVersion+1):command.expectedVersion+1;
          if(next.id!==command.sessionId){
            const cached=downloaded?.data.sessions.find(item=>item.id===command.sessionId);
            if(cached)next=cached;
            else if(command.expectedVersion===0)next={schemaVersion:2,id:command.sessionId,studentId:command.studentId,clinicId:data.clinicId,version:0,capturedAt:command.occurredAt,notes:'',programs:command.programs,events:[]};
            else continue;
          }
          if(next.version>=targetVersion||next.version!==command.expectedVersion)continue;
          next=applyQueuedSessionCommand(next,command,data.actorId,targetVersion);
        }
        return next;
      });
    },0);
    return()=>window.clearTimeout(timer);
  },[data.actorId,data.clinicId,data.studentId,downloaded,offline.queue]);

  const toggleDownload=async()=>{
    if(offlineBusy)return;
    if(downloaded&&!window.confirm('¿Quitar esta ficha del acceso offline de este usuario y clínica?'))return;
    setOfflineBusy(true);setOfflineMessage('');
    try{
      if(downloaded){await offline.removeStudent(data.studentId);setOfflineMessage('Descarga offline retirada.');}
      else{await offline.saveStudent(data);setOfflineMessage('Ficha descargada para este usuario y clínica. Los documentos se seleccionan por separado.');}
    }catch(cause){setOfflineMessage(cause instanceof Error?cause.message:'No se pudo actualizar la descarga offline.');}
    finally{setOfflineBusy(false);}
  };

  const pending=Boolean(pendingSession.current||pendingArchive.current||pendingCaptures.current.size);
  const blocked=busy||pending||Boolean(refreshTarget)||Boolean(conflict);
  const dirty=session.notes!==savedNotes||records.some(item=>baseline.current.get(item.id)!==JSON.stringify(item.measurement)||Boolean(item.revisionReason))||(status==='draft'&&JSON.stringify(selected)!==JSON.stringify(session.programs.map(item=>item.programId)));
  const mayLeave=()=>{
    if(lock.current||pendingSession.current||pendingArchive.current||pendingCaptures.current.size||refreshRef.current){setError('Resuelve el comando pendiente o recupera la lectura confirmada antes de salir.');return false;}
    return !(dirty||conflict)||window.confirm('Hay cambios locales sin guardar. Salir los descarta de esta pantalla. ¿Continuar?');
  };
  useEffect(()=>{
    const unload=(event:BeforeUnloadEvent)=>{if(dirty||blocked){event.preventDefault();event.returnValue='';}};
    const links=(event:MouseEvent)=>{const link=(event.target as Element).closest?.('a[href]');if(link&&!mayLeave()){event.preventDefault();event.stopPropagation();}};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',links,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',links,true);};
  });
  const readCurrent=async()=>{
    const next=await loadProgramSessionPageData(data.clinicId,data.studentId);
    if(next.actorId!==data.actorId||next.clinicId!==data.clinicId||next.studentId!==data.studentId)throw new Error('Cambió la identidad de esta captura. No se mezclaron datos.');
    return next;
  };
  const readRecord=(next:ProgramSessionPageData,id:string):LocalRecord|null=>{
    const raw=next.records.find(item=>item.id===id&&item.sessionId===session.id&&!item.discarded);
    const parsed=measurementV2Schema.safeParse(raw?.originalMeasurement);
    return raw&&parsed.success?{id:raw.id,programId:raw.programId,programVersionId:raw.programVersionId,version:raw.version,measurement:parsed.data,submitted:raw.submitted,revisionReason:''}:null;
  };
  const refreshConfirmed=async(target:NonNullable<typeof refreshTarget>)=>{
    try{
      const next=await readCurrent();const current=next.sessions.find(item=>item.id===session.id);
      if(target.archived){
        if(current)throw new Error('La sesión archivada todavía aparece entre las sesiones operativas.');
        setData(next);refreshRef.current=null;setRefreshTarget(null);setError('');return true;
      }
      if(!current)throw new Error('La sesión confirmada no está disponible.');
      if(target.kind==='session'){
        if(current.version<target.version)throw new Error('La lectura aún no incluye la versión confirmada.');
        setSession(current);setSavedNotes(current.notes);if(!target.keepSelection)setSelected(current.programs.map(item=>item.programId));
      }else{
        if(target.discarded){
          const discarded=next.records.find(item=>item.id===target.id&&item.sessionId===session.id&&item.discarded);
          if(!discarded||discarded.version<target.version)throw new Error('El descarte confirmado aún no aparece en la lectura.');
          baseline.current.delete(target.id);setRecords(values=>values.filter(item=>item.id!==target.id));
          if(activeRecordId===target.id){setActiveRecordId(null);setCaptureOpen(false);}
          setData(next);refreshRef.current=null;setRefreshTarget(null);setError('');return true;
        }
        const record=readRecord(next,target.id);
        if(!record||record.version<target.version)throw new Error('El registro confirmado no está disponible.');
        baseline.current.set(record.id,JSON.stringify(record.measurement));setRecords(values=>values.map(item=>item.id===record.id?record:item));
        // Do not rebase unrelated local session notes onto a newer server version.
        // A subsequent session command must detect that change as a conflict.
      }
      setData(next);refreshRef.current=null;setRefreshTarget(null);setError('');return true;
    }catch(cause){setError(`Comando confirmado. Sólo falta recuperar la vista; no lo reenvíes. ${cause instanceof Error?cause.message:''}`);return false;}
  };
  const retryRead=async()=>{if(lock.current||!refreshRef.current)return;lock.current=true;setBusy(true);try{await refreshConfirmed(refreshRef.current);}finally{lock.current=false;setBusy(false);}};
  const reviewConflict=async()=>{if(lock.current||!conflict)return;lock.current=true;setBusy(true);setConflict({...conflict,review:null});try{setConflict({...conflict,review:await readCurrent()});}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo consultar el conflicto.');}finally{lock.current=false;setBusy(false);}};
  const acceptConflict=()=>{
    if(!conflict?.review||lock.current)return;const next=conflict.review;const current=next.sessions.find(item=>item.id===session.id);
    if(!current){setError('La sesión ya no está disponible. Se conserva el borrador.');return;}
    if(conflict.kind==='capture'){
      const record=readRecord(next,conflict.id);if(!record){setError('El registro ya no está disponible; no se recreará automáticamente.');return;}
      baseline.current.set(record.id,JSON.stringify(record.measurement));setRecords(values=>values.map(item=>item.id===record.id?{...item,version:record.version,submitted:record.submitted}:item));
    }
    setData(next);
    if(conflict.kind==='session'){
      setSession(value=>({...current,notes:value.notes}));setSavedNotes(current.notes);
      if(sessionV2Timeline(current).status!=='draft')setSelected(current.programs.map(item=>item.programId));
    }
    setConflict(null);setError('Estado vigente revisado. Tu borrador se conserva: comprueba las diferencias antes de enviar una nueva operación.');
  };
  const reviewOfflineConflict=async(entryId:string)=>{
    if(lock.current||!offline.online)return;
    lock.current=true;setBusy(true);setError('');setOfflineConflictReview({entryId,review:null});
    try{setOfflineConflictReview({entryId,review:await readCurrent()});}
    catch(cause){setError(cause instanceof Error?cause.message:'No se pudo consultar la versión vigente.');}
    finally{lock.current=false;setBusy(false);}
  };
  const resolveOfflineConflict=async()=>{
    if(lock.current||!offlineConflictReview?.review)return;
    const entry=offline.queue.find(item=>item.id===offlineConflictReview.entryId&&item.status==='blocked-conflict');
    if(!entry){setError('El conflicto ya no está disponible. Actualiza el estado offline.');setOfflineConflictReview(null);return;}
    const review=offlineConflictReview.review;
    let payload:Parameters<typeof offline.supersedeConflict>[1];
    if(entry.payload.kind==='session'){
      const current=review.sessions.find(item=>item.id===entry.payload.command.sessionId);
      if(!current&&entry.payload.command.expectedVersion!==0){setError('La sesión vigente ya no está disponible; el borrador se conserva y no se recreará automáticamente.');return;}
      let programs=entry.payload.command.programs;
      if(!current){
        const rebased:SessionCommandV2['programs']=[];
        for(const reference of entry.payload.command.programs){
          const program=review.programs.find(item=>item.id===reference.programId&&item.status==='active'&&item.currentVersionId);
          if(!program?.currentVersionId){setError('Un programa del borrador ya no tiene una versión activa; no se creó otra sesión.');return;}
          rebased.push({programId:program.id,programVersionId:program.currentVersionId});
        }
        programs=rebased;
      }
      const parsed=sessionCommandV2Schema.safeParse({...entry.payload.command,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),expectedVersion:current?.version??0,programs,occurredAt:new Date().toISOString()});
      if(!parsed.success){setError(parsed.error.issues.map(item=>item.message).join(' '));return;}
      payload={kind:'session',command:parsed.data};
    }else{
      const capturePayload=entry.payload;
      const current=review.records.find(item=>item.id===capturePayload.command.recordId&&item.sessionId===capturePayload.command.sessionId&&!item.discarded);
      if(!current&&capturePayload.command.expectedVersion!==0){setError('El registro vigente ya no está disponible; la captura local se conserva y no se recreará automáticamente.');return;}
      let programVersionId=capturePayload.command.programVersionId;
      if(!current){
        const program=review.programs.find(item=>item.id===capturePayload.command.programId&&item.status==='active'&&item.currentVersionId);
        if(!program?.currentVersionId||dimensionOf(program,program.currentVersionId)!==capturePayload.command.measurement.dimension){setError('La versión vigente del programa no admite la dimensión de esta captura; el borrador se conserva sin conversión automática.');return;}
        programVersionId=program.currentVersionId;
      }
      const parsed=captureCommandV2Schema.safeParse({...capturePayload.command,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),expectedVersion:current?.version??0,programVersionId});
      if(!parsed.success){setError(parsed.error.issues.map(item=>item.message).join(' '));return;}
      payload={kind:'capture',command:parsed.data};
    }
    lock.current=true;setBusy(true);setError('');
    try{
      await offline.supersedeConflict(entry.id,payload);
      setOfflineConflictReview(null);
      setOfflineMessage('Conflicto revisado: se creó una operación nueva enlazada a la anterior. La versión bloqueada quedó preservada como supersedida.');
      await offline.syncNow();
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo crear la operación supersedente.');}
    finally{lock.current=false;setBusy(false);}
  };
  const queueSession=async(command:SessionCommandV2)=>{
    if(!downloaded){setError('Descarga explícitamente esta ficha antes de guardar una sesión offline.');return false;}
    const duplicate=offline.queue.find(entry=>entry.payload.kind==='session'&&entry.payload.command.operationId===command.operationId);
    const dependencies=offline.queue.filter(entry=>entry.status!=='acknowledged'&&entry.status!=='superseded'&&entry.payload.command.studentId===command.studentId&&((entry.payload.kind==='session'&&entry.payload.command.sessionId===command.sessionId)||(entry.payload.kind==='capture'&&entry.payload.command.sessionId===command.sessionId))).map(entry=>entry.id);
    await (duplicate?Promise.resolve(duplicate):offline.enqueue({kind:'session',command},dependencies));
    // Release the exact retry only after IndexedDB confirmed local durability.
    if(pendingSession.current?.operationId===command.operationId)pendingSession.current=null;
    setSession(current=>applyQueuedSessionCommand(current,command,data.actorId));setSavedNotes(command.notes);setSelected(command.programs.map(item=>item.programId));
    setOfflineMessage('Sesión guardada en este dispositivo y pendiente de servidor. Las transiciones siguientes dependerán de este comando.');setError('');
    return true;
  };
  const sendSession=async(action:SessionCommandV2['action'],confirmation=false)=>{
    if(lock.current||refreshRef.current||conflict||pendingCaptures.current.size||denied)return false;
    const existing=pendingSession.current;if(existing&&existing.action!==action){setError('Reintenta primero la operación pendiente.');return false;}
    if(!existing&&action==='pause'&&records.some(item=>item.measurement.dimension==='frequency'&&item.measurement.windows.some(window=>window.endedAt===null))){setError('Cierra la ventana de observación antes de pausar.');return false;}
    if(!existing&&(action==='finish'||action==='cancel')&&records.some(item=>baseline.current.get(item.id)!==JSON.stringify(item.measurement)||item.revisionReason)){setError('Guarda las observaciones locales antes de cerrar la sesión.');return false;}
    const parsed=sessionCommandV2Schema.safeParse(existing??{schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),studentId:data.studentId,sessionId:session.id,expectedVersion:session.version,action,occurredAt:new Date().toISOString(),notes:session.notes,programs:action==='update-notes'&&status==='draft'?session.programs:snapshotRefs,terminalConfirmation:confirmation});
    if(!parsed.success){setError(parsed.error.issues.map(item=>item.message).join(' '));return false;}
    const command=existing??parsed.data;pendingSession.current=command;lock.current=true;setBusy(true);setError('');
    try{
      if(!offline.online){return await queueSession(command);}
      const result=await mutateSessionV2({clinicId:data.clinicId,command});pendingSession.current=null;
      if(result.status!=='acknowledged'){setError(result.message);if(result.status==='conflict')setConflict({kind:'session',id:session.id,message:result.message,review:null});return false;}
      const target={kind:'session' as const,id:session.id,version:result.serverVersion,keepSelection:command.action==='update-notes'&&status==='draft'};refreshRef.current=target;setRefreshTarget(target);
      notifications.show({title:'Servidor confirmado',message:'Recibo correlacionado recibido; recuperando sesión autorizada.',color:'green'});
      await refreshConfirmed(target);return true;
    }catch(cause){
      if(downloaded){try{return await queueSession(command);}catch(queueError){setError(queueError instanceof Error?queueError.message:'No se pudo conservar la sesión en IndexedDB.');return false;}}
      setError(cause instanceof Error?cause.message:'Resultado desconocido; reintenta el mismo comando.');return false;
    }finally{lock.current=false;setBusy(false);}
  };
  const archiveCurrentSession=async(retained?:ArchiveSessionCommandV2)=>{
    if(lock.current||refreshRef.current||conflict||pendingSession.current||pendingCaptures.current.size||!canArchive)return false;
    const existing=retained??pendingArchive.current;
    const parsed=archiveSessionCommandV2Schema.safeParse(existing??{schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),studentId:data.studentId,sessionId:session.id,expectedVersion:session.version,reason:archiveReason});
    if(!parsed.success){setError(parsed.error.issues.map(item=>item.message).join(' '));return false;}
    const command=existing??parsed.data;pendingArchive.current=command;lock.current=true;setBusy(true);setError('');
    try{
      const result=await archiveSessionV2({clinicId:data.clinicId,command});pendingArchive.current=null;
      if(result.status!=='acknowledged'){setError(result.message);if(result.status==='conflict')setConflict({kind:'session',id:session.id,message:result.message,review:null});return false;}
      const target={kind:'session' as const,id:session.id,version:result.serverVersion,archived:true};refreshRef.current=target;setRefreshTarget(target);
      notifications.show({title:'Sesión archivada',message:'Los registros y resultados se conservaron.',color:'green'});
      if(await refreshConfirmed(target)){setArchiveOpen(false);if(onExit)onExit();else navigate(`/students/${data.studentId}`);return true;}return false;
    }catch(cause){setError(cause instanceof Error?cause.message:'Resultado desconocido; reintenta el mismo archivo de sesión.');return false;}finally{lock.current=false;setBusy(false);}
  };
  const openNew=(program:ProgramDto)=>{if(blocked||lock.current||denied||status!=='active')return;const ref=snapshotRefs.find(item=>item.programId===program.id);if(!ref)return;const dimension=dimensionOf(program,ref.programVersionId);if(!dimension){setError('Este programa no tiene un diseño V2 válido; no se inventará su dimensión.');return;}const record:LocalRecord={id:crypto.randomUUID(),programId:program.id,programVersionId:ref.programVersionId,version:0,measurement:createMeasurement(dimension),submitted:false,revisionReason:''};setRecords(value=>[...value,record]);setActiveRecordId(record.id);setCaptureOpen(true);};
  const openExisting=(id:string)=>{if(blocked||lock.current)return;setActiveRecordId(id);setCaptureOpen(true);};
  const activeRecord=records.find(item=>item.id===activeRecordId)??null;
  const activeProgram=activeRecord?data.programs.find(item=>item.id===activeRecord.programId)??null:null;
  const changeMeasurement=useCallback((measurement:MeasurementV2)=>{if(lock.current||pendingSession.current||pendingCaptures.current.size||refreshRef.current||conflict)return;setRecords(value=>value.map(item=>item.id===activeRecordId?{...item,measurement}:item));},[activeRecordId,conflict]);
  const changeDimension=useCallback((current:MeasurementV2,next:MeasurementV2['dimension'])=>{if(!activeRecordId||blocked||lock.current)return true;const replacement=createMeasurement(next);setRecords(values=>{const active=values.find(item=>item.id===activeRecordId);if(!active)return values;if(active.version===0&&!baseline.current.has(active.id)&&!hasMeasurementContent(current))return values.map(item=>item.id===active.id?{...item,measurement:replacement}:item);const fork={...active,id:crypto.randomUUID(),version:0,measurement:replacement,submitted:false,revisionReason:''};setActiveRecordId(fork.id);return [...values,fork];});return true;},[activeRecordId,blocked]);
  const changeReason=useCallback((revisionReason:string)=>{if(blocked||lock.current)return;setRecords(value=>value.map(item=>item.id===activeRecordId?{...item,revisionReason}:item));},[activeRecordId,blocked]);
  const queueCapture=async(command:CaptureCommandV2,record:LocalRecord)=>{
    if(!downloaded){setError('Descarga explícitamente esta ficha antes de guardar capturas offline.');return false;}
    const duplicate=offline.queue.find(entry=>entry.payload.kind==='capture'&&entry.payload.command.operationId===command.operationId);
    const dependencies=offline.queue.filter(entry=>entry.payload.kind==='session'&&entry.payload.command.sessionId===command.sessionId&&entry.status!=='acknowledged'&&entry.status!=='superseded').map(entry=>entry.id);
    const entry=duplicate??await offline.enqueue({kind:'capture',command},dependencies);
    if(pendingCaptures.current.get(record.id)?.operationId===command.operationId)pendingCaptures.current.delete(record.id);
    baseline.current.set(record.id,JSON.stringify(command.measurement));
    setRecords(values=>values.map(item=>item.id===record.id?{...item,measurement:command.measurement,revisionReason:'',pendingEntryId:entry.id,pendingAction:command.action}:item));
    setOfflineMessage('Captura guardada en este dispositivo y pendiente de servidor. No se muestra como confirmada.');
    setError('');
    return true;
  };
  const persist=async(action:CaptureCommit|'discard',measurement:MeasurementV2,retained?:CaptureCommandV2)=>{
    if(lock.current||refreshRef.current||conflict||pendingSession.current||denied)return false;
    const record=retained?records.find(item=>item.id===retained.recordId):activeRecord;if(!record)return false;
    const existing=pendingCaptures.current.get(record.id);if(pendingCaptures.current.size&&!existing)return false;
    const actualAction:CaptureCommandV2['action']=action==='discard'?'discard':record.submitted?'revise':action;
    const parsed=captureCommandV2Schema.safeParse(existing??{schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),recordId:record.id,sessionId:session.id,studentId:data.studentId,programId:record.programId,programVersionId:record.programVersionId,expectedVersion:record.version,action:actualAction,measurement,revisionReason:actualAction==='revise'?record.revisionReason:null});
    if(!parsed.success){setError(parsed.error.issues.map(item=>item.message).join(' '));return false;}
    const command=existing??parsed.data;pendingCaptures.current.set(record.id,command);lock.current=true;setBusy(true);setError('');
    try{
      if(!offline.online){
        return await queueCapture(command,record);
      }
      const result=await persistCaptureV2({clinicId:data.clinicId,command});pendingCaptures.current.delete(record.id);
      if(result.status!=='acknowledged'){setError(result.message);if(result.status==='conflict')setConflict({kind:'capture',id:record.id,message:result.message,review:null});return false;}
      const target={kind:'capture' as const,id:record.id,version:result.serverVersion,discarded:command.action==='discard'};refreshRef.current=target;setRefreshTarget(target);
      notifications.show({title:'Registro confirmado',message:'Recibo correlacionado recibido; recuperando registro autorizado.',color:'green'});
      await refreshConfirmed(target);return true;
    }catch(cause){
      if(downloaded){
        try{return await queueCapture(command,record);}
        catch(queueError){setError(queueError instanceof Error?queueError.message:'No se pudo conservar la captura en IndexedDB.');return false;}
      }
      setError(cause instanceof Error?cause.message:'Resultado desconocido; reintenta el mismo comando.');return false;
    }finally{lock.current=false;setBusy(false);}
  };
  const discardLocalRecord=()=>{
    if(!activeRecord||activeRecord.version!==0||baseline.current.has(activeRecord.id)||blocked||lock.current||pendingCaptures.current.size||pendingSession.current||refreshRef.current)return;
    if(!window.confirm('Este registro nunca fue confirmado por el servidor. ¿Descartar sus observaciones locales?'))return;
    setRecords(values=>values.filter(item=>item.id!==activeRecord.id));setActiveRecordId(null);setCaptureOpen(false);setError('');
  };
  const discardPersistedDraft=()=>{
    if(!activeRecord||activeRecord.version===0||activeRecord.submitted||blocked||lock.current)return;
    if(!window.confirm('¿Archivar este borrador persistido? Sus datos se conservarán en el servidor y dejarán de aparecer como captura activa.'))return;
    void persist('discard',activeRecord.measurement);
  };
  const goBack=()=>{if(!mayLeave())return;if(onExit)onExit();else navigate(`/students/${data.studentId}`);};
  const conflictSession=conflict?.kind==='session'?(conflict.review?.sessions.find(item=>item.id===conflict.id)??null):null;
  const conflictRecord=conflict?.kind==='capture'?(conflict.review?.records.find(item=>item.id===conflict.id)??null):null;
  const conflictSummary=conflictSession?<Stack gap={4}>
    <Text size="sm">Eventos registrados: {conflictSession.events.length} · versión {conflictSession.version}</Text>
    <Text size="sm">Capturada: {new Date(conflictSession.capturedAt).toLocaleString('es-CL')}</Text>
    <Text size="sm">Programas en la sesión vigente: {conflictSession.programs.length}</Text>
    <Text size="sm">Notas vigentes: {conflictSession.notes||'sin notas'}</Text>
  </Stack>:conflictRecord?<Stack gap={4}>
    <Text size="sm">Versión vigente del registro: {conflictRecord.version} · {conflictRecord.submitted?'enviado':'borrador'}</Text>
    <Text size="sm">Creado: {new Date(conflictRecord.createdAt).toLocaleString('es-CL')}</Text>
    <Text size="sm">Correcciones registradas: {conflictRecord.revisions.length}</Text>
  </Stack>:null;
  const recovery=<Stack>
    {activeRecord?.version===0&&!baseline.current.has(activeRecord.id)&&!blocked&&<Button color="red" variant="light" onClick={discardLocalRecord}>Descartar registro local sin guardar</Button>}
    {pendingSession.current&&<Alert color="yellow"><Text>Resultado desconocido: {pendingSession.current.action}.</Text><Button disabled={busy} onClick={()=>void sendSession(pendingSession.current!.action,pendingSession.current!.terminalConfirmation)}>Reintentar misma operación</Button></Alert>}
    {pendingArchive.current&&<Alert color="yellow"><Text>Resultado desconocido al archivar la sesión.</Text><Button disabled={busy} onClick={()=>void archiveCurrentSession(pendingArchive.current!)}>Reintentar mismo archivo</Button></Alert>}
    {activeRecord?.version!==0&&!activeRecord?.submitted&&!blocked&&<Button color="red" variant="light" onClick={discardPersistedDraft}>Archivar borrador persistido</Button>}
    {[...pendingCaptures.current.values()].map(command=><Alert color="yellow" key={command.recordId}><Text>Registro con resultado desconocido.</Text><Button disabled={busy} onClick={()=>void persist(command.action==='discard'?'discard':command.action==='save-draft'?'save-draft':'submit',command.measurement,command)}>Reintentar mismo registro</Button></Alert>)}
    {refreshTarget&&<Alert color="blue"><Text>Operación confirmada. Sólo falta la lectura autorizada.</Text><Button disabled={busy} onClick={()=>void retryRead()}>Recuperar vista sin reenviar</Button></Alert>}
    {conflict&&<Alert color="orange"><Stack><Text>{conflict.message} No se sobrescribió el borrador.</Text><Button disabled={busy} onClick={()=>void reviewConflict()}>Consultar versión vigente</Button>{conflict.review&&<><Text>Compara el estado vigente con tu borrador:</Text>{conflictSummary??<Text size="sm">La versión vigente ya no incluye este elemento.</Text>}<details><summary>Ver datos técnicos</summary><pre style={{maxHeight:220,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify(conflict.kind==='session'?conflict.review.sessions.find(item=>item.id===conflict.id):conflict.review.records.find(item=>item.id===conflict.id),null,2)}</pre></details><Button disabled={busy} onClick={acceptConflict}>He revisado: conservar mi borrador sobre esta versión</Button></>}</Stack></Alert>}
    {blockedOffline.map(entry=><Alert key={entry.id} color="orange" title="Conflicto offline preservado"><Stack><Text size="sm">{entry.error} No se aplicó last-write-wins ni se descartó la captura local.</Text><Button disabled={busy||!offline.online} onClick={()=>void reviewOfflineConflict(entry.id)}>Consultar versión vigente</Button>{offlineConflictReview?.entryId===entry.id&&offlineConflictReview.review&&<><Text size="sm">Compara explícitamente la versión servidor con el comando local antes de continuar:</Text><details><summary>Ver datos técnicos</summary><pre style={{maxHeight:220,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify({server:offlineConflictServerValue(entry,offlineConflictReview.review),local:entry.payload.command},null,2)}</pre></details><Button disabled={busy} onClick={()=>void resolveOfflineConflict()}>He revisado: crear nueva operación enlazada</Button></>}</Stack></Alert>)}
  </Stack>;

  return <div style={{minHeight:'100vh',background:'var(--mantine-color-gray-0)'}}><Paper p="md" shadow="sm" radius={0} pos="sticky" top={0} style={{zIndex:100}}><Container size="xl"><Group justify="space-between"><Group><ActionIcon variant="subtle" aria-label="Volver a la ficha del estudiante" title="Volver a la ficha" onClick={goBack}><ChevronLeft/></ActionIcon><Avatar>{data.student.initials}</Avatar><div><Text fw={700}>{data.student.displayName}</Text><Group gap="xs"><Badge color={status==='active'?'green':status==='paused'?'yellow':'gray'} variant="dot">{status}</Badge><Text size="xs" c="dimmed"><Clock size={12} style={{display:'inline'}}/> {Math.floor(timeline.activeSeconds/60)} min activos</Text></Group></div></Group><Group><Button variant="subtle" leftSection={downloaded?<HardDriveUpload size={16}/>:<HardDriveDownload size={16}/>} loading={offlineBusy} disabled={denied||!offline.supported} onClick={()=>void toggleDownload()}>{downloaded?'Quitar offline':'Descargar ficha'}</Button>{status==='draft'&&<Button leftSection={<PlayCircle size={16}/>} disabled={!selected.length||blocked||denied} onClick={()=>void sendSession('start')}>Iniciar sesión</Button>}{status==='active'&&<Button variant="light" color="yellow" leftSection={<PauseCircle size={16}/>} disabled={blocked||denied} loading={busy} onClick={()=>void sendSession('pause')}>Pausar</Button>}{status==='paused'&&<Button variant="light" color="green" leftSection={<PlayCircle size={16}/>} disabled={blocked||denied} loading={busy} onClick={()=>void sendSession('resume')}>Reanudar</Button>}{['active','paused'].includes(status)&&<><Button color="gray" variant="outline" leftSection={<XCircle size={16}/>} disabled={blocked||denied} onClick={()=>setTerminal('cancel')}>Cancelar sesión</Button><Button color="red" variant="outline" leftSection={<LogOut size={16}/>} disabled={blocked||denied} onClick={()=>setTerminal('finish')}>Finalizar</Button></>}{session.version>0&&['draft','finished','cancelled'].includes(status)&&<Button variant="light" color="gray" leftSection={<Archive size={16}/>} disabled={blocked||!canArchive} onClick={()=>setArchiveOpen(true)}>Archivar</Button>}</Group></Group></Container></Paper>
    <Container size="xl" py="xl"><Stack gap="xl">{recovery}{offlineMessage&&<Alert color={offlineMessage.includes('No se pudo')||offlineMessage.includes('no está')||offlineMessage.includes('tiene operaciones')?'orange':'blue'} withCloseButton onClose={()=>setOfflineMessage('')}>{offlineMessage}</Alert>}{downloaded&&<Alert color="blue">Ficha disponible en IndexedDB para este usuario y clínica desde {new Date(downloaded.cachedAt).toLocaleString('es-CL')}. Esto no implica que cambios posteriores estén sincronizados.</Alert>}{pendingOfflineSession.length>0&&<Alert color="yellow">{pendingOfflineSession.length} transición{pendingOfflineSession.length===1?'':'es'} de sesión guardada{pendingOfflineSession.length===1?'':'s'} localmente y pendiente{pendingOfflineSession.length===1?'':'s'} de servidor.</Alert>}{denied&&<Alert color="orange">{data.student.status==='archived'?'Ficha archivada: programas y registros quedan en modo lectura.':'Permiso denegado: falta record.capture para esta ficha.'}</Alert>}{pendingSession.current&&<Alert color="yellow">Resultado desconocido de {pendingSession.current.action}. El próximo intento reutilizará operationId e idempotencyKey.</Alert>}{error&&<Alert color="red">{error}</Alert>}<Card withBorder><Text fw={600}>Notas de sesión</Text><Textarea value={session.notes} disabled={blocked||['finished','cancelled'].includes(status)||denied} onChange={event=>{const notes=event.currentTarget.value;setSession(value=>({...value,notes}));}}/><Button mt="sm" variant="light" disabled={denied||blocked||['finished','cancelled'].includes(status)} onClick={()=>void sendSession('update-notes')}>Guardar notas</Button></Card><Card withBorder><Text fw={600}>Progreso confirmado por servidor</Text><Group justify="space-between"><Text size="sm">{submittedPrograms.size} programas con registros enviados</Text><Text>{Math.round(progress)}%</Text></Group><Progress value={progress}/></Card><Title order={3}>Programas para la sesión</Title>{!visiblePrograms.length?<Alert>No hay programas disponibles en el snapshot de esta sesión.</Alert>:<SimpleGrid cols={{base:1,sm:2,lg:3}}>{visiblePrograms.map(program=>{const ref=snapshotRefs.find(item=>item.programId===program.id);const version=program.versions.find(item=>item.id===(ref?.programVersionId??(status==='draft'?program.currentVersionId:null)));const programRecords=records.filter(item=>item.programId===program.id&&!data.records.find(raw=>raw.id===item.id)?.discarded);return <Card key={program.id} withBorder><Group justify="space-between"><ThemeIcon variant="light" color={program.kind==='behavior'?'red':'blue'}>{program.kind==='behavior'?<AlertTriangle/>:<Brain/>}</ThemeIcon>{submittedPrograms.has(program.id)&&<CheckCircle2 color="green"/>}</Group><Text fw={600} mt="sm">{version?.title??'Programa sin título'}</Text><Text size="sm" c="dimmed">Versión {version?.number??'—'} · predeterminada {ref?(dimensionOf(program,ref.programVersionId)??'Diseño V2 no disponible'):'—'}</Text>{status==='draft'?<Checkbox disabled={blocked||denied} mt="md" checked={selected.includes(program.id)} label="Incluir en la sesión" onChange={()=>setSelected(values=>values.includes(program.id)?values.filter(id=>id!==program.id):[...values,program.id])}/>:<Stack mt="md" gap="xs"><Button leftSection={<Plus size={15}/>} disabled={blocked||status!=='active'||denied} onClick={()=>openNew(program)}>Nuevo registro</Button>{programRecords.map(item=><Button key={item.id} variant="light" color={item.pendingEntryId?'yellow':undefined} disabled={blocked||status==='cancelled'||denied||Boolean(item.pendingEntryId)} onClick={()=>openExisting(item.id)}>{item.pendingEntryId?`${item.pendingAction} · pendiente de servidor`:item.submitted?'Corregir enviado':`Continuar borrador v${item.version} · ${item.measurement.dimension}`}</Button>)}</Stack>}</Card>;})}</SimpleGrid>}{data.records.flatMap(item=>{if(item.sessionId!==session.id)return[];const legacy=legacyMeasurement(item.originalMeasurement);if(!legacy)return[];const trials=Array.isArray(legacy.payload.trials)?legacy.payload.trials.filter(value=>typeof value==='boolean') as boolean[]:[];const count=typeof legacy.payload.count==='number'?legacy.payload.count:null;const duration=typeof legacy.payload.duration_seconds==='number'?legacy.payload.duration_seconds:null;return [<Card key={item.id} withBorder><Group justify="space-between"><Text fw={600}>Registro histórico V1 · {legacy.dimension}</Text><Badge color="gray">Sólo lectura</Badge></Group><Text size="sm">{trials.length?`${trials.filter(Boolean).length} true · ${trials.filter(value=>!value).length} false`:count!==null?`${count} eventos agregados`:duration!==null?`${duration} segundos manuales`:'Agregado original sin detalle estructurado'}</Text><Alert mt="sm">No se habilita deshacer ni corregir como V2: false permanece false histórico, y el total o la duración manual no se convierten en eventos ni cronómetros inventados.</Alert></Card>];})}</Stack></Container>
    {activeRecord&&activeProgram&&<DataCollectionEngine key={activeRecord.id} recovery={recovery} programId={activeProgram.id} programName={activeProgram.versions.find(item=>item.id===activeRecord.programVersionId)?.title??'Programa'} defaultDimension={activeRecord.measurement.dimension} initialMeasurement={activeRecord.measurement} opened={captureOpen} busy={blocked||denied} error={error} onClose={()=>{if(!lock.current&&!pending&&!refreshTarget)setCaptureOpen(false);}} onPersist={persist} onMeasurementChange={changeMeasurement} onDimensionChange={changeDimension} revisionReason={activeRecord.revisionReason} onRevisionReasonChange={activeRecord.submitted?changeReason:undefined} submitLabel={activeRecord.submitted?'Guardar corrección':'Enviar registro'}/>}<Modal opened={terminal!==null} onClose={()=>setTerminal(null)} title={terminal==='finish'?'Finalizar sesión':'Cancelar sesión'}><Stack>{recovery}{error&&<Alert color="red">{error}</Alert>}<Alert color="orange">La acción sólo se completa después de confirmación persistida. Cerrar este diálogo no cambia nada.</Alert><Text>{terminal==='finish'?'Los registros enviados se conservan; los borradores pendientes impedirán finalizar.':'Cancelar no logra programas ni transforma observaciones pendientes.'}</Text><Group justify="end"><Button variant="default" disabled={blocked||denied} onClick={()=>setTerminal(null)}>Volver</Button><Button color="red" disabled={blocked||denied} loading={busy} onClick={()=>void sendSession(terminal!,true).then(ok=>{if(ok)setTerminal(null);})}>Confirmar</Button></Group></Stack></Modal><Modal opened={archiveOpen} onClose={()=>{if(!blocked)setArchiveOpen(false);}} title="Archivar sesión"><Stack>{recovery}{error&&<Alert color="red">{error}</Alert>}<Alert>Archivar retira la sesión de la captura operativa. No cancela ni finaliza, y conserva todos sus registros y resultados.</Alert><Textarea required label="Motivo" value={archiveReason} onChange={event=>setArchiveReason(event.currentTarget.value)} maxLength={2000}/><Group justify="end"><Button variant="default" disabled={blocked} onClick={()=>setArchiveOpen(false)}>Volver</Button><Button color="gray" disabled={blocked||!canArchive||!archiveReason.trim()} loading={busy} onClick={()=>void archiveCurrentSession()}>Confirmar archivo</Button></Group></Stack></Modal></div>;
}
