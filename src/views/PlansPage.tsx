'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { Alert,Badge,Button,Card,Checkbox,Container,Fieldset,Group,Loader,Modal,NumberInput,Select,SimpleGrid,Stack,Text,Textarea,TextInput,Title } from '@mantine/core';
import { MainLayout } from '@/components/MainLayout';
import { useIdentity } from '@/context/IdentityContext';
import { subscriptionCommandSchema,type SubscriptionCommand,type SubscriptionSnapshot } from '@/domain/commercial/subscription';
import { commercialDocumentCommandSchema,type CommercialDocumentCommand,type CommercialDocumentDto,type CommercialPageData } from '@/modules/commercial/contracts';
import { loadCommercialPageData,saveSubscriptionV2,saveCommercialDocumentV2 } from '@/modules/commercial/commercial.server';
import { CommercialAttachmentsPanel } from '@/modules/commercial/CommercialAttachmentsPanel';

type Operation={kind:'subscription';command:SubscriptionCommand}|{kind:'document';command:CommercialDocumentCommand};
type Mode='plan'|'cancel'|'create'|'replace'|'archive';
const kinds=[{value:'internal-summary',label:'Resumen interno'},{value:'internal-proposal',label:'Propuesta interna'},{value:'internal-agreement',label:'Acuerdo interno'}];
const describe=(e:unknown)=>e instanceof Error?e.message:'No se confirmó el cambio.';
const money=(amount:number,currency:string,digits:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(amount/(10**digits));

export default function PlansPage({initialPlan}:{initialPlan?:string}){
  const {identity,verified}=useIdentity();
  return <PlansWorkspace key={(identity?.userId??'')+':'+(identity?.active?.id??'')+':'+(initialPlan??'')} clinicId={identity?.active?.id??''} admin={identity?.active?.role==='admin'} verified={verified} initialPlan={initialPlan}/>;
}
function PlansWorkspace({clinicId,admin,verified,initialPlan}:{clinicId:string;admin:boolean;verified:boolean;initialPlan?:string}){
  const [page,setPage]=useState<CommercialPageData|null>(null);const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');const [readError,setReadError]=useState('');const [success,setSuccess]=useState('');
  const [mode,setMode]=useState<Mode|null>(null);const [subscription,setSubscription]=useState<SubscriptionSnapshot|null>(null);
  const [document,setDocument]=useState<CommercialDocumentDto|null>(null);
  const [attachmentDocument,setAttachmentDocument]=useState<CommercialDocumentDto|null>(null);
  const [planId,setPlanId]=useState<string|null>(null);const [seats,setSeats]=useState<number|string>(1);
  const [reason,setReason]=useState('');const [confirmed,setConfirmed]=useState(false);
  const [title,setTitle]=useState('');const [kind,setKind]=useState('internal-summary');
  const [currency,setCurrency]=useState('CLP');const [digits,setDigits]=useState<number|string>(0);
  const [lines,setLines]=useState<{description:string;amountMinor:number}[]>([]);
  const [showArchived,setShowArchived]=useState(false);const [pending,setPending]=useState<Operation|null>(null);
  const [busy,setBusy]=useState(false);const [conflict,setConflict]=useState(false);
  const sequence=useRef(0);const busyRef=useRef(false);
  const initialHandled=useRef(false);
  useEffect(()=>{
    if(initialHandled.current||!page||!initialPlan)return;
    initialHandled.current=true;
    const plan=page.plans.find(p=>p.planVersionId===initialPlan&&p.active);
    if(!plan||page.subscription?.status==='cancelled')return;
    setSubscription(page.subscription);setPlanId(plan.planVersionId);
    setSeats(Math.max(plan.includedSeats,page.subscription?.seats??1));setMode('plan');
  },[page,initialPlan]);
  const refresh=useCallback(async()=>{
    if(!clinicId||!admin)return;
    const request=++sequence.current;setLoading(true);setReadError('');
    try{const result=await loadCommercialPageData(clinicId);if(request===sequence.current)setPage(result);}
    catch(e){if(request===sequence.current){setReadError(describe(e));setPage(null);}}
    finally{if(request===sequence.current)setLoading(false);}
  },[clinicId,admin]);
  useEffect(()=>{const cleanupSequence=sequence;const timer=setTimeout(()=>void refresh(),0);return()=>{clearTimeout(timer);cleanupSequence.current++;};},[refresh]);
  useEffect(()=>{if(!mode)return;const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[mode]);
  const leave=async()=>{if(attachmentDocument){window.alert('Cierra el panel de adjuntos antes de navegar; resuelve primero cualquier operación pendiente.');return false;}
    if(pending||busyRef.current){setError('Resuelve la operación pendiente antes de salir.');return false;}
    return !mode||window.confirm('¿Descartar el formulario comercial?');};
  const open=(next:Mode,doc:CommercialDocumentDto|null=null,selectedPlan:string|null=null)=>{
    if(pending||busyRef.current||attachmentDocument)return;
    setMode(next);setSubscription(page?.subscription??null);setDocument(doc);setPlanId(selectedPlan??page?.subscription?.plan.planVersionId??null);
    const plan=page?.plans.find(p=>p.planVersionId===selectedPlan);
    setSeats(Math.max(plan?.includedSeats??1,page?.subscription?.seats??1));setReason('');setConfirmed(false);
    setTitle(doc?.title??'');setKind(doc?.kind??'internal-summary');setCurrency(doc?.currency??'CLP');
    setDigits(doc?.minorUnitDigits??0);setLines(doc?.lines.map(l=>({...l}))??[]);setError('');setSuccess('');setConflict(false);
  };
  const close=()=>{if(!pending&&!busyRef.current&&window.confirm('¿Cerrar sin guardar?'))setMode(null);};
  const prepare=():Operation=>{
    if(!mode)throw new Error('Selecciona una operación.');
    if(mode==='plan'||mode==='cancel'){
      const base={schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),clinicId,
        subscriptionId:subscription?.id??crypto.randomUUID(),expectedVersion:subscription?.version??0,
        confirmation:confirmed,commercialMode:'internal-demonstration'};
      return {kind:'subscription',command:subscriptionCommandSchema.parse(mode==='cancel'?{...base,action:'cancel',reason}
        :subscription?{...base,action:'change-plan',planVersionId:planId,seats:Number(seats),reason}
        :{...base,action:'select-plan',planVersionId:planId,seats:Number(seats)})};
    }
    const id=document?.id??crypto.randomUUID();
    const base={schemaVersion:2,operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID(),clinicId,
      documentId:id,expectedVersion:document?.version??0,confirmation:confirmed,action:mode};
    return {kind:'document',command:commercialDocumentCommandSchema.parse(mode==='archive'?base:{...base,document:{
      id,clinicId,subscriptionId:document?.subscriptionId??page?.subscription?.id??null,version:(document?.version??0)+1,
      kind,title,issuedAt:new Date().toISOString(),lines,currency,minorUnitDigits:Number(digits),
      attachmentVersionId:document?.attachmentVersionId??null,predecessorId:document?.predecessorId??null,
      archived:false,demonstration:true,taxDocument:false,paymentRequested:false,
    }})};
  };
  const save=async()=>{
    if(busyRef.current||!verified||!admin||conflict)return;
    busyRef.current=true;setBusy(true);setError('');
    try{
      const operation=pending??prepare();setPending(operation);
      const result=operation.kind==='subscription'?await saveSubscriptionV2({clinicId,command:operation.command})
        :await saveCommercialDocumentV2(operation.command);
      if(result.status==='acknowledged'){setPending(null);setMode(null);setSuccess('Cambio interno confirmado.');await refresh();}
      else{setPending(null);setError(result.message);setConflict(result.status==='conflict');if(result.status==='conflict')await refresh();}
    }catch(e){setError(describe(e));}finally{busyRef.current=false;setBusy(false);}
  };
  const latestDocument=page?.documents.find(d=>d.id===document?.id);
  return <MainLayout slots={{beforeNavigate:leave,beforeClinicChange:leave,beforeSignOut:leave}}>
    <Container size="xl"><Stack><Group justify="space-between"><Title order={2}>Planes y gestión comercial</Title>
      <Button variant="subtle" onClick={()=>void refresh()} loading={loading} disabled={!admin}>Actualizar</Button></Group>
      <Alert color="blue">Gestión interna de demostración. Los importes no generan cobros y los documentos no son tributarios.</Alert>
      {!admin?<Alert color="yellow">La gestión comercial está disponible para la administración de la clínica activa.</Alert>:<>
        {readError&&<Alert color="red">{readError}</Alert>}{success&&<Alert color="green">{success}</Alert>}{loading&&<Loader size="sm"/>}
        {page?.subscription?<Card withBorder><Group justify="space-between"><div><Title order={3}>{page.subscription.plan.name}</Title>
          <Text>{page.subscription.occupiedSeats} plazas ocupadas de {page.subscription.seats}</Text></div>
          <Badge color={page.subscription.status==='active'?'blue':'gray'}>{page.subscription.status==='active'?'Vigente':'Cancelada'}</Badge></Group>
          {page.subscription.occupiedSeats>page.subscription.seats&&<Alert mt="sm" color="orange">La clínica tiene {page.subscription.occupiedSeats-page.subscription.seats} membresías activas por encima de las plazas seleccionadas. Ajusta el plan o suspende membresías de forma explícita.</Alert>}
          {page.subscription.status==='active'&&<Button color="red" variant="subtle" mt="sm" disabled={!!mode||!verified} onClick={()=>open('cancel')}>Cancelar suscripción interna</Button>}
          {page.subscription.status==='cancelled'&&<Text size="sm">La cancelación conserva los datos clínicos y las membresías.</Text>}
        </Card>:page&&<Text c="dimmed">Todavía no hay un plan interno seleccionado.</Text>}
        <SimpleGrid cols={{base:1,sm:2}}>{page?.plans.map(plan=><Card key={plan.planVersionId} withBorder><Stack>
          <Title order={3}>{plan.name}</Title><Text>{plan.description}</Text>
          <Text fw={700}>{money(plan.price.amountMinor,plan.price.currency,plan.price.minorUnitDigits)} / {plan.price.period==='monthly'?'mes':'año'}</Text>
          <Text size="xs" c="dimmed">Importe de demostración</Text>
          <Text size="sm">{plan.includedSeats} plazas incluidas · máximo {plan.maximumSeats??'sin límite definido'}</Text>
          {plan.features.map(feature=><Text size="sm" key={feature}>• {feature}</Text>)}
          <Button disabled={!verified||!!mode||!plan.active||page.subscription?.status==='cancelled'} onClick={()=>open('plan',null,plan.planVersionId)}>
            {page.subscription?.plan.planVersionId===plan.planVersionId?'Gestionar plazas':'Seleccionar plan'}</Button>
        </Stack></Card>)}</SimpleGrid>
        <Group justify="space-between"><Title order={3}>Documentos internos</Title><Button disabled={!page||!verified||!!mode} onClick={()=>open('create')}>Crear documento</Button></Group>
        <Checkbox label="Incluir archivados" checked={showArchived} onChange={e=>setShowArchived(e.currentTarget.checked)}/>
        {page&&page.documents.filter(d=>showArchived||!d.archived).length===0&&<Text c="dimmed">No hay documentos para este filtro.</Text>}
        {page?.documents.filter(d=>showArchived||!d.archived).map(doc=><Card key={doc.id} withBorder><Stack gap="xs">
          <Group justify="space-between"><Text fw={600}>{doc.title}</Text><Badge color={doc.archived?'gray':'blue'}>{doc.archived?'Archivado':'Versión '+doc.version}</Badge></Group>
          <Text size="xs">{kinds.find(k=>k.value===doc.kind)?.label} · {new Date(doc.issuedAt).toLocaleString('es-CL')}</Text>
          {doc.lines.map((line,i)=><Group justify="space-between" key={i}><Text size="sm">{line.description}</Text><Text size="sm">{money(line.amountMinor,doc.currency,doc.minorUnitDigits)}</Text></Group>)}
          <Text size="xs" c="dimmed">Demostración · sin solicitud de pago</Text>
          <Button variant="light" disabled={!!mode||!!attachmentDocument||!verified} onClick={()=>setAttachmentDocument(doc)}>Archivos e historial</Button>
          {!doc.archived&&<Group><Button variant="light" disabled={!!mode||!verified} onClick={()=>open('replace',doc)}>Sustituir versión</Button>
            <Button variant="subtle" color="red" disabled={!!mode||!verified} onClick={()=>open('archive',doc)}>Archivar</Button></Group>}
        </Stack></Card>)}
      </>}
    </Stack></Container>
    <Modal opened={mode!==null} onClose={close} withCloseButton={!pending&&!busy} closeOnClickOutside={false}
      closeOnEscape={!pending&&!busy} title={mode==='plan'?'Seleccionar plan y plazas':mode==='cancel'?'Cancelar suscripción':mode==='archive'?'Archivar documento':mode==='replace'?'Sustituir documento':'Crear documento interno'} size="lg">
      <Stack>{error&&<Alert color="red">{error}</Alert>}{pending&&<Alert color="yellow">Reintenta la misma operación para recuperar su confirmación. Los datos permanecen bloqueados mientras el resultado sea incierto.</Alert>}
        {conflict&&<Alert color="yellow">El recurso cambió. El formulario conserva tus datos.
          <Button mt="sm" loading={loading} disabled={busy||!verified} onClick={()=>void refresh()}>Consultar estado actual</Button>
          {readError&&<Text c="red" size="sm">{readError}</Text>}
          {page&&!loading&&!readError&&<>
            <pre style={{maxHeight:240,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify(mode==='plan'||mode==='cancel'?page.subscription:latestDocument??{estado:'Documento no disponible'},null,2)}</pre>
            <Button mt="sm" variant="light" disabled={busy||!verified||!admin||((mode==='plan'||mode==='cancel')?(!page.subscription||page.subscription.status==='cancelled'):(!latestDocument||latestDocument.archived))}
              onClick={()=>{
                if(loading||readError||!verified||!admin)return;
                if(mode==='plan'||mode==='cancel'){
                  if(!page.subscription||page.subscription.status==='cancelled')return;
                  setSubscription(page.subscription);
                }else{
                  if(!latestDocument||latestDocument.archived)return;
                  setDocument(latestDocument);
                }
                setConfirmed(false);setConflict(false);setError('');
              }}>He revisado la versión actual; continuar</Button>
          </>}
        </Alert>}
        <Fieldset disabled={!!pending||busy||conflict||!verified}><Stack>
          {mode==='plan'&&<><Select label="Plan" required data={page?.plans.filter(p=>p.active).map(p=>({value:p.planVersionId,label:p.name}))??[]} value={planId} onChange={setPlanId}/>
            <NumberInput label="Plazas" min={1} allowDecimal={false} value={seats} onChange={setSeats}/></>}
          {(mode==='cancel'||(mode==='plan'&&subscription))&&<Textarea required label="Motivo" maxLength={10000} value={reason} onChange={e=>setReason(e.currentTarget.value)}/>}
          {(mode==='create'||mode==='replace')&&<>
            <TextInput required label="Título" maxLength={300} value={title} onChange={e=>setTitle(e.currentTarget.value)}/>
            <Select required label="Tipo" data={kinds} value={kind} onChange={v=>setKind(v??'internal-summary')}/>
            <Select label="Moneda" data={['CLP','USD','EUR']} value={currency} onChange={v=>setCurrency(v??'CLP')}/>
            <NumberInput label="Decimales de la moneda" min={0} max={3} allowDecimal={false} value={digits} onChange={setDigits}/>
            <Text size="xs" c="dimmed">Importes enteros en unidades mínimas: con 2 decimales, 1500 representa 15,00.</Text>
            {lines.map((line,i)=><Card key={i} withBorder><Stack gap="xs"><TextInput required label="Descripción" maxLength={1000} value={line.description}
              onChange={e=>{const value=e.currentTarget.value;setLines(all=>all.map((l,j)=>j===i?{...l,description:value}:l));}}/>
              <NumberInput label="Importe en unidades mínimas" min={0} max={Number.MAX_SAFE_INTEGER} allowDecimal={false} value={line.amountMinor}
                onChange={value=>setLines(all=>all.map((l,j)=>j===i?{...l,amountMinor:Number(value)}:l))}/>
              <Button variant="subtle" color="red" onClick={()=>setLines(all=>all.filter((_,j)=>j!==i))}>Retirar línea</Button></Stack></Card>)}
            <Button variant="light" disabled={lines.length>=100} onClick={()=>setLines(all=>[...all,{description:'',amountMinor:0}])}>Añadir línea</Button>
          </>}
          <Checkbox label="Confirmo esta operación interna de demostración" checked={confirmed} onChange={e=>setConfirmed(e.currentTarget.checked)}/>
        </Stack></Fieldset>
        <Group justify="end"><Button variant="default" disabled={!!pending||busy} onClick={close}>Cerrar sin guardar</Button>
          <Button loading={busy} disabled={!admin||!verified||conflict} onClick={()=>void save()}>{pending?'Reintentar misma operación':'Confirmar'}</Button></Group>
      </Stack>
    </Modal>
    <Modal opened={!!attachmentDocument} onClose={()=>{}} withCloseButton={false} closeOnClickOutside={false} closeOnEscape={false} title="Adjuntos del documento interno" size="lg">
      {attachmentDocument&&<CommercialAttachmentsPanel key={attachmentDocument.id} initialDocument={attachmentDocument} verified={verified} onClose={()=>setAttachmentDocument(null)} onRefresh={refresh}/>}
    </Modal>
  </MainLayout>;
}
