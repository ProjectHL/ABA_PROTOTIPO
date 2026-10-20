'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Checkbox, Container, Fieldset, Group, Loader, Modal,
  MultiSelect, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { useIdentity } from '@/context/IdentityContext';
import { appointmentCommandSchema, type AppointmentCommand, type AppointmentInput } from '@/domain/agenda/appointment';
import { loadCalendarPageData, loadCalendarSessions, saveAppointmentV2 } from '@/modules/calendar/calendar.server';
import type { CalendarAppointmentDto, CalendarPageData } from '@/modules/calendar/contracts';
import { resolveWallTime, wallTime } from '@/modules/calendar/local-time';

type Mode = 'create' | 'edit' | 'reschedule' | 'cancel' | 'link-session';
type Ambiguity = 'earlier' | 'later' | 'reject';
const weekdays = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const describe = (cause: unknown) => cause instanceof Error ? cause.message : 'No se confirmó la operación.';

export default function CalendarPage() {
  const { identity, verified } = useIdentity();
  const scopeKey = `${identity?.userId ?? ''}:${identity?.active?.id ?? ''}`;
  return <CalendarWorkspace key={scopeKey} clinicId={identity?.active?.id ?? ''} verified={verified}/>;
}
function CalendarWorkspace({ clinicId, verified }: { clinicId: string; verified: boolean }) {
  const [data,setData] = useState<CalendarPageData|null>(null);
  const [loading,setLoading] = useState(false); const [readError,setReadError] = useState('');
  const [error,setError] = useState(''); const [success,setSuccess] = useState('');
  const [view,setView] = useState('month'); const [month,setMonth] = useState(new Date().toISOString().slice(0,7));
  const [filter,setFilter] = useState<string|null>(null); const [cancelled,setCancelled] = useState(false);
  const [mode,setMode] = useState<Mode|null>(null); const [target,setTarget] = useState<CalendarAppointmentDto|null>(null);
  const [editScope,setEditScope] = useState('occurrence');
  const [student,setStudent] = useState<string|null>(null); const [title,setTitle] = useState('');
  const [notes,setNotes] = useState(''); const [start,setStart] = useState(''); const [end,setEnd] = useState('');
  const [zone,setZone] = useState('America/Santiago'); const [participants,setParticipants] = useState<string[]>([]);
  const [reminders,setReminders] = useState('60'); const [weekly,setWeekly] = useState(false);
  const [until,setUntil] = useState(''); const [interval,setInterval] = useState<number|string>(1);
  const [days,setDays] = useState<string[]>([]); const [ambiguity,setAmbiguity] = useState<Ambiguity>('reject');
  const [reason,setReason] = useState(''); const [confirmed,setConfirmed] = useState(false);
  const [sessions,setSessions] = useState<{id:string;capturedAt:string}[]>([]);
  const [sessionsLoading,setSessionsLoading] = useState(false); const [sessionId,setSessionId] = useState<string|null>(null);
  const [pending,setPending] = useState<AppointmentCommand|null>(null); const [busy,setBusy] = useState(false);
  const [conflict,setConflict] = useState(false);
  const busyRef = useRef(false); const sequence = useRef(0); const sessionSequence = useRef(0);
  const refresh = useCallback(async () => {
    if (!clinicId) return;
    const request = ++sequence.current; setLoading(true); setReadError('');
    try {
      const page = await loadCalendarPageData(clinicId);
      if (request === sequence.current) setData(page);
    } catch (cause) { if (request === sequence.current) { setReadError(describe(cause)); setData(null); } }
    finally { if (request === sequence.current) setLoading(false); }
  },[clinicId]);
  useEffect(() => { const cleanupSequence=sequence;const cleanupSessions=sessionSequence;const timer = setTimeout(() => void refresh(),0); return () => {
    clearTimeout(timer); cleanupSequence.current++; cleanupSessions.current++;
  }; },[refresh]);
  useEffect(() => {
    if (!mode) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn);
  },[mode]);
  const leave = async () => {
    if (pending || busyRef.current) { setError('Resuelve la operación pendiente antes de cambiar de clínica o cerrar sesión.'); return false; }
    return !mode || window.confirm('¿Descartar el formulario sin guardar?');
  };
  const open = (action: Mode, appointment: CalendarAppointmentDto|null = null) => {
    if (pending || busyRef.current) return;
    sessionSequence.current++; setMode(action); setTarget(appointment); setError(''); setSuccess(''); setConflict(false);
    setStudent(appointment?.studentId ?? null); setTitle(appointment?.title ?? ''); setNotes(appointment?.notes ?? '');
    const timeZone = appointment?.timeZone ?? data?.timeZone ?? 'America/Santiago';
    setZone(timeZone); setStart(appointment ? wallTime(appointment.startsAt,timeZone) : '');
    setEnd(appointment ? wallTime(appointment.endsAt,timeZone) : '');
    setParticipants(appointment?.participants.map(p => p.kind === 'professional' ? 'p:'+p.userId : 'f:'+p.personId) ?? []);
    setReminders(appointment ? appointment.reminders.map(r => r.minutesBefore).join(', ') : '60');
    setWeekly(!!appointment?.recurrence); setUntil(appointment?.recurrence?.until ?? '');
    setDays(appointment?.recurrence?.weekdays.map(String) ?? []); setInterval(appointment?.recurrence?.intervalWeeks ?? 1);
    setAmbiguity(appointment?.recurrence?.ambiguousTimePolicy ?? 'reject');
    setEditScope(appointment?.seriesId ? 'occurrence' : 'single'); setReason(''); setConfirmed(false);
    setSessions([]); setSessionId(appointment?.linkedSessionId ?? null);
    if (action === 'link-session' && appointment) {
      const request = ++sessionSequence.current; setSessionsLoading(true);
      void loadCalendarSessions(clinicId,appointment.studentId).then(rows => {
        if (request === sessionSequence.current) setSessions(rows);
      }).catch(cause => { if (request === sessionSequence.current) setError(describe(cause)); })
        .finally(() => { if (request === sessionSequence.current) setSessionsLoading(false); });
    }
  };
  const close = () => {
    if (pending || busyRef.current) return;
    if (!window.confirm('¿Cerrar y descartar el formulario?')) return;
    sessionSequence.current++; setMode(null); setError('');
  };
  const command = (): AppointmentCommand => {
    if (!mode || !student) throw new Error('Selecciona un estudiante.');
    const base = { schemaVersion: 2 as const, operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(),
      appointmentId: target?.id ?? crypto.randomUUID(), studentId: student, expectedVersion: target?.version ?? 0 };
    const changeScope = target?.seriesId
      ? editScope === 'series'
        ? { kind: 'series' as const, seriesId: target.seriesId, expectedSeriesVersion: target.seriesVersion! }
        : { kind: 'occurrence' as const, seriesId: target.seriesId, originalLocalDate: target.originalLocalDate! }
      : { kind: 'single' as const };
    if (mode === 'cancel') return appointmentCommandSchema.parse({ ...base, action: mode, scope: changeScope, reason, confirmation: confirmed });
    if (mode === 'link-session') return appointmentCommandSchema.parse({ ...base, action: mode, sessionId });
    const recurrence = target?.seriesId && editScope === 'occurrence' ? target.recurrence : weekly ? {
      frequency: 'weekly' as const, intervalWeeks: Number(interval), weekdays: days.map(Number),
      startsOn: start.slice(0,10), until, localTime: start.slice(11), timeZone: zone,
      ambiguousTimePolicy: ambiguity, nonexistentTimePolicy: 'reject' as const,
    } : null;
    const input: AppointmentInput = {
      studentId: student, title, notes, startsAt: resolveWallTime(start,zone,ambiguity),
      endsAt: resolveWallTime(end,zone,ambiguity), timeZone: zone, recurrence,
      participants: participants.map(value => value.startsWith('p:')
        ? { kind: 'professional' as const, userId: value.slice(2) } : { kind: 'family' as const, personId: value.slice(2) }),
      reminderMinutesBefore: reminders.trim() ? reminders.split(',').map(value => Number(value.trim())) : [],
    };
    return appointmentCommandSchema.parse(mode === 'create' ? { ...base, action: mode, input }
      : { ...base, action: mode, input, scope: changeScope });
  };
  const submit = async () => {
    if (busyRef.current || !verified || !clinicId || conflict) return;
    busyRef.current = true; setBusy(true); setError('');
    try {
      const next = pending ?? command(); setPending(next);
      const result = await saveAppointmentV2({ clinicId, command: next });
      if (result.status === 'acknowledged') {
        setPending(null); setMode(null); setSuccess('Cambio confirmado en la agenda.'); await refresh();
      } else {
        setPending(null); setError(result.message); setConflict(result.status === 'conflict');
        if (result.status === 'conflict') await refresh();
      }
    } catch (cause) { setError(describe(cause)); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const appointments = data?.appointments.filter(a => (!filter || a.studentId === filter)
    && (cancelled || a.status !== 'cancelled')
    && (view !== 'month' || wallTime(a.startsAt,data.timeZone).startsWith(month))) ?? [];
  const studentLabels = data?.students.map(s => ({ value:s.id,label:s.displayName })) ?? [];
  const family = data?.students.find(s => s.id === student)?.familyParticipants ?? [];
  const options = [...(data?.professionals.map(p => ({value:'p:'+p.userId,label:p.label})) ?? []),
    ...family.map(p => ({value:'f:'+p.personId,label:p.label+' (familia)'}))];
  for (const p of target?.participants ?? []) {
    const value = p.kind === 'professional' ? 'p:'+p.userId : 'f:'+p.personId;
    if (!options.some(o => o.value === value)) options.push({value,label:p.label+' (revisar disponibilidad)'});
  }
  const current = data?.appointments.find(a => a.id === target?.id);
  const item = (a: CalendarAppointmentDto) => <Card key={a.id} withBorder p="sm">
    <Group justify="space-between"><Text fw={600}>{a.title}</Text><Badge color={a.status === 'cancelled' ? 'gray' : 'blue'}>{a.status === 'cancelled' ? 'Cancelada' : 'Programada'}</Badge></Group>
    <Text size="sm">{data?.students.find(s => s.id === a.studentId)?.displayName ?? 'Ficha autorizada'}</Text>
    <Text size="sm">{wallTime(a.startsAt,a.timeZone).replace('T',' ')} – {wallTime(a.endsAt,a.timeZone).replace('T',' ')} · {a.timeZone}</Text>
    {a.seriesId && <Text size="xs" c="dimmed">Serie semanal · ocurrencia original {a.originalLocalDate}</Text>}
    {a.notes && <Text size="sm" style={{whiteSpace:'pre-wrap'}}>{a.notes}</Text>}
    <Text size="xs">{a.participants.map(p => p.label).join(', ')}</Text>
    <Text size="xs" c="dimmed">{a.reminders.length ? 'Recordatorios: '+a.reminders.map(r => r.minutesBefore+' min ('+r.state+')').join(', ') : 'Sin recordatorios'}</Text>
    {a.linkedSessionId && <Text size="xs">Sesión realizada vinculada</Text>}
    {a.cancellationReason && <Text size="sm">{a.cancellationReason}</Text>}
    {a.status === 'scheduled' && <Group gap="xs" mt="sm">
      <Button size="compact-xs" variant="light" onClick={() => open('edit',a)}>Editar</Button>
      <Button size="compact-xs" variant="light" onClick={() => open('reschedule',a)}>Reprogramar</Button>
      <Button size="compact-xs" variant="light" onClick={() => open('link-session',a)}>Vincular sesión</Button>
      <Button size="compact-xs" color="red" variant="subtle" onClick={() => open('cancel',a)}>Cancelar cita</Button>
    </Group>}
  </Card>;
  const dayCount = /^\d{4}-\d{2}$/.test(month) ? new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate() : 0;
  return <MainLayout slots={{beforeSignOut:leave,beforeClinicChange:leave,beforeNavigate:leave}}><Container size="xl"><Stack>
    <Group justify="space-between"><div><Title order={2}>Agenda</Title><Text c="dimmed">Citas, participantes y sesiones realizadas</Text></div>
      <Group><Button variant="subtle" leftSection={<RefreshCw size={16}/>} loading={loading} onClick={() => void refresh()}>Actualizar</Button>
        <Button leftSection={<Plus size={16}/>} disabled={!data || !verified || !!mode} onClick={() => open('create')}>Nueva cita</Button></Group></Group>
    {!clinicId && <Alert color="yellow">Selecciona una clínica para consultar su agenda.</Alert>}
    {loading && <Loader size="sm"/>}{readError && <Alert color="red">{readError}</Alert>}
    {success && <Alert color="green">{success}</Alert>}
    <Group align="end"><Select label="Vista" value={view} onChange={v => setView(v ?? 'month')} data={[{value:'month',label:'Calendario mensual'},{value:'list',label:'Listado'}]}/>
      {view === 'month' && <TextInput type="month" label="Mes" value={month} onChange={e => setMonth(e.currentTarget.value)}/>}
      <Select clearable searchable label="Estudiante" placeholder="Todos" value={filter} onChange={setFilter} data={studentLabels}/>
      <Checkbox label="Mostrar canceladas" checked={cancelled} onChange={e => setCancelled(e.currentTarget.checked)}/></Group>
    <Text size="xs" c="dimmed">El calendario agrupa por {data?.timeZone ?? 'America/Santiago'}. Cada cita conserva su propia zona horaria.</Text>
    {data && appointments.length === 0 && <Alert icon={<CalendarDays size={18}/>}>No hay citas para estos filtros.</Alert>}
    {view === 'list' ? <Stack>{appointments.map(item)}</Stack> : <SimpleGrid cols={{base:1,sm:2,lg:7}}>
      {dayCount > 0 && Array.from({length:(new Date(month+'-01T12:00:00Z').getUTCDay()+6)%7},(_,i) => <div key={'offset-'+i} className="mantine-visible-from-lg" aria-hidden="true"/>)}
      {Array.from({length:dayCount},(_,i) => {
        const date = month+'-'+String(i+1).padStart(2,'0');
        return <Card key={date} withBorder><Text fw={700} mb="xs">{new Intl.DateTimeFormat('es',{weekday:'short',day:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'))}</Text>
          <Stack gap="xs">{appointments.filter(a => wallTime(a.startsAt,data?.timeZone ?? 'America/Santiago').slice(0,10) === date).map(item)}</Stack></Card>;
      })}
    </SimpleGrid>}
  </Stack></Container>
  <Modal opened={mode !== null} onClose={close} closeOnClickOutside={false} closeOnEscape={!pending&&!busy}
    withCloseButton={!pending&&!busy} title={mode === 'create' ? 'Nueva cita' : mode === 'cancel' ? 'Cancelar cita' : mode === 'link-session' ? 'Vincular sesión realizada' : mode === 'reschedule' ? 'Reprogramar cita' : 'Editar cita'} size="lg">
    <Stack>{error && <Alert color="red">{error}</Alert>}
      {pending && <Alert color="yellow">La operación conserva su identidad. Si no llegó confirmación, reintenta sin cambiar los datos.</Alert>}
      {conflict && <Alert color="yellow">Tu formulario se conserva. Revisa la versión actual antes de preparar una nueva operación.
        <Button mt="sm" loading={loading} disabled={busy||!verified} onClick={() => void refresh()}>Consultar estado actual</Button>
        {readError && <Text c="red" size="sm">{readError}</Text>}
        {!loading&&!readError&&!current && <Text size="sm">La cita ya no está disponible. No se recreará desde este formulario.</Text>}
        {current && !loading && !readError && <Stack gap="xs" mt="sm"><Text size="sm">{current.title} · {wallTime(current.startsAt,current.timeZone)} · {current.notes}</Text>
          <Text size="sm">{current.participants.map(p => p.label).join(', ')}</Text>
          <Text size="sm">Estado: {current.status} · versión {current.version} · serie {current.seriesVersion ?? '—'}</Text>
          <pre style={{maxHeight:220,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify({startsAt:current.startsAt,endsAt:current.endsAt,timeZone:current.timeZone,recurrence:current.recurrence,reminders:current.reminders,linkedSessionId:current.linkedSessionId},null,2)}</pre>
          <Button variant="light" disabled={busy||!verified||current.status!=='scheduled'} onClick={() => { if(loading||readError||!verified||current.status!=='scheduled')return;setTarget(current);setConfirmed(false);setConflict(false);setError(''); }}>He revisado los cambios; usar esta versión</Button></Stack>}
      </Alert>}
      <Fieldset disabled={busy||!!pending||conflict||!verified}><Stack>
        {target?.seriesId && mode !== 'link-session' && <Select label="Aplicar a" value={editScope}
          onChange={value => { setEditScope(value ?? 'occurrence');
            if (value === 'series' && target.recurrence) {
              const local = target.recurrence.startsOn+'T'+target.recurrence.localTime;
              setStart(local); const first = resolveWallTime(local,target.timeZone,target.recurrence.ambiguousTimePolicy);
              setEnd(wallTime(new Date(Date.parse(first)+Date.parse(target.endsAt)-Date.parse(target.startsAt)).toISOString(),target.timeZone));
            }
          }} data={[{value:'occurrence',label:'Solo esta ocurrencia'},{value:'series',label:'Toda la serie (conserva excepciones)'}]}/>}
        {mode === 'cancel' ? <><Textarea label="Motivo de cancelación" required value={reason} onChange={e => setReason(e.currentTarget.value)}/>
          <Checkbox label="Confirmo la cancelación del alcance seleccionado" checked={confirmed} onChange={e => setConfirmed(e.currentTarget.checked)}/></>
        : mode === 'link-session' ? <Select label="Sesión finalizada" placeholder={sessionsLoading ? 'Cargando sesiones…' : 'Selecciona una sesión'} disabled={sessionsLoading} value={sessionId} onChange={setSessionId}
          data={sessions.map(s => ({value:s.id,label:wallTime(s.capturedAt,zone).replace('T',' ')+' · '+s.id.slice(0,8)}))}/>
        : <><Select label="Estudiante" required searchable data={studentLabels} value={student} disabled={!!target} onChange={value => {setStudent(value);setParticipants(p => p.filter(v => v.startsWith('p:')));}}/>
          <TextInput label="Título" required maxLength={300} value={title} onChange={e => setTitle(e.currentTarget.value)}/>
          <Textarea label="Notas" maxLength={10000} value={notes} onChange={e => setNotes(e.currentTarget.value)}/>
          <TextInput label="Zona horaria" required value={zone} disabled={!!target?.seriesId&&editScope==='occurrence'} onChange={e => setZone(e.currentTarget.value)} description="Ejemplo: America/Santiago"/>
          <SimpleGrid cols={{base:1,sm:2}}><TextInput type="datetime-local" label="Inicio local" required value={start} onChange={e => setStart(e.currentTarget.value)}/>
            <TextInput type="datetime-local" label="Fin local" required value={end} onChange={e => setEnd(e.currentTarget.value)}/></SimpleGrid>
          <Select label="Si la hora se repite por cambio horario" value={ambiguity} onChange={value => setAmbiguity((value ?? 'reject') as Ambiguity)}
            data={[{value:'reject',label:'Pedir otra hora'},{value:'earlier',label:'Primera ocurrencia'},{value:'later',label:'Última ocurrencia'}]}/>
          <MultiSelect label="Participantes" required searchable data={options} value={participants} onChange={setParticipants}/>
          <TextInput label="Recordatorios: minutos antes, separados por coma" value={reminders} onChange={e => setReminders(e.currentTarget.value)}/>
          <Checkbox label="Repetir semanalmente" checked={weekly} disabled={!!target?.seriesId} onChange={e => setWeekly(e.currentTarget.checked)}/>
          {weekly && !(target?.seriesId&&editScope==='occurrence') && <>
            <Text size="sm">El inicio debe ser la primera fecha incluida. Las ocurrencias conservan la hora local al cambiar de horario.</Text>
            <MultiSelect label="Días" data={weekdays.map((label,i) => ({value:String(i+1),label}))} value={days} onChange={setDays}/>
            <NumberInput label="Cada cuántas semanas" min={1} max={52} allowDecimal={false} value={interval} onChange={setInterval}/>
            <TextInput type="date" label="Hasta (incluido)" required value={until} onChange={e => setUntil(e.currentTarget.value)}/>
          </>}
        </>}
      </Stack></Fieldset>
      <Group justify="end"><Button variant="default" disabled={!!pending||busy} onClick={close}>Cerrar sin guardar</Button>
        <Button color={mode==='cancel'?'red':'blue'} loading={busy} disabled={!verified||conflict} onClick={() => void submit()}>{pending?'Reintentar misma operación':mode==='cancel'?'Confirmar cancelación':'Guardar'}</Button></Group>
    </Stack>
  </Modal></MainLayout>;
}
