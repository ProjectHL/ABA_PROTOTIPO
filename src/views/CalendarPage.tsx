'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionIcon, Alert, Box, Button, Checkbox, Container, Fieldset, Group, Loader, Modal,
  MultiSelect, NumberInput, SegmentedControl, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@mantine/core';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { formatWallTime } from '@/lib/format';
import { useIdentity } from '@/context/IdentityContext';
import { appointmentCommandSchema, type AppointmentCommand, type AppointmentInput } from '@/domain/agenda/appointment';
import { loadCalendarPageData, loadCalendarSessions, saveAppointmentV2 } from '@/modules/calendar/calendar.server';
import type { CalendarAppointmentDto, CalendarPageData } from '@/modules/calendar/contracts';
import { resolveWallTime, wallTime } from '@/modules/calendar/local-time';
import { AgendaList } from '@/features/calendar/AgendaList';
import { AppointmentDetailModal, type DetailAction } from '@/features/calendar/AppointmentDetailModal';
import { MonthView } from '@/features/calendar/MonthView';
import { TimeGridView } from '@/features/calendar/TimeGridView';
import { addMinutesToWall, colorForStudent, periodTitle, shiftCursor, todayInZone, weekGrid, type CalendarView } from '@/features/calendar/grid';

type Mode = 'create' | 'edit' | 'reschedule' | 'cancel' | 'link-session';
type Ambiguity = 'earlier' | 'later' | 'reject';
const weekdays = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const describe = (cause: unknown) => cause instanceof Error ? cause.message : 'No se confirmó la operación.';
const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: 'day', label: 'Día' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'list', label: 'Listado' },
];

export default function CalendarPage() {
  const { identity, verified } = useIdentity();
  const scopeKey = `${identity?.userId ?? ''}:${identity?.active?.id ?? ''}`;
  return <CalendarWorkspace key={scopeKey} clinicId={identity?.active?.id ?? ''} verified={verified}/>;
}
function CalendarWorkspace({ clinicId, verified }: { clinicId: string; verified: boolean }) {
  const [data,setData] = useState<CalendarPageData|null>(null);
  const [loading,setLoading] = useState(false); const [readError,setReadError] = useState('');
  const [error,setError] = useState(''); const [success,setSuccess] = useState('');
  const [view,setView] = useState<CalendarView>('week'); const [cursor,setCursor] = useState('');
  const [filter,setFilter] = useState<string|null>(null); const [cancelled,setCancelled] = useState(false);
  const [mode,setMode] = useState<Mode|null>(null); const [target,setTarget] = useState<CalendarAppointmentDto|null>(null);
  const [detail,setDetail] = useState<CalendarAppointmentDto|null>(null);
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
    if (data && !cursor) setCursor(todayInZone(data.timeZone));
  },[data,cursor]);
  useEffect(() => {
    if (!mode) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn);
  },[mode]);
  const leave = async () => {
    if (pending || busyRef.current) { setError('Resuelve la operación pendiente antes de cambiar de clínica o cerrar sesión.'); return false; }
    return !mode || window.confirm('¿Descartar el formulario sin guardar?');
  };
  const open = (action: Mode, appointment: CalendarAppointmentDto|null = null, prefill: { start: string; end: string } | null = null) => {
    if (pending || busyRef.current) return;
    sessionSequence.current++; setMode(action); setTarget(appointment); setDetail(null);
    setError(''); setSuccess(''); setConflict(false);
    setStudent(appointment?.studentId ?? (action === 'create' ? filter : null));
    setTitle(appointment?.title ?? ''); setNotes(appointment?.notes ?? '');
    const timeZone = appointment?.timeZone ?? data?.timeZone ?? 'America/Santiago';
    setZone(timeZone);
    const suggestedStart = prefill?.start ?? `${todayInZone(timeZone)}T09:00`;
    setStart(appointment ? wallTime(appointment.startsAt,timeZone) : suggestedStart);
    setEnd(appointment ? wallTime(appointment.endsAt,timeZone) : prefill?.end ?? addMinutesToWall(suggestedStart,60));
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
  const timeZone = data?.timeZone ?? 'America/Santiago';
  const today = todayInZone(timeZone);
  const course = cursor || today;
  const appointments = data?.appointments.filter(a => (!filter || a.studentId === filter)
    && (cancelled || a.status !== 'cancelled')) ?? [];
  const studentLabels = data?.students.map(s => ({ value:s.id,label:s.displayName })) ?? [];
  const family = data?.students.find(s => s.id === student)?.familyParticipants ?? [];
  const options = [...(data?.professionals.map(p => ({value:'p:'+p.userId,label:p.label})) ?? []),
    ...family.map(p => ({value:'f:'+p.personId,label:p.label+' (familia)'}))];
  for (const p of target?.participants ?? []) {
    const value = p.kind === 'professional' ? 'p:'+p.userId : 'f:'+p.personId;
    if (!options.some(o => o.value === value)) options.push({value,label:p.label+' (revisar disponibilidad)'});
  }
  const currentAppointment = data?.appointments.find(a => a.id === target?.id);
  const goToday = () => setCursor(todayInZone(data?.timeZone ?? 'America/Santiago'));
  const shift = (direction: number) => setCursor(current => shiftCursor(view, current || today, direction));
  const createAt = (localStart: string) => {
    if (!verified) return;
    const startLocal = localStart.length === 10 ? `${localStart}T09:00` : localStart;
    open('create', null, { start: startLocal, end: addMinutesToWall(startLocal, 60) });
  };
  const openDay = (day: string) => { setCursor(day); setView('day'); };
  const detailAction = (action: DetailAction) => {
    const appointment = detail; setDetail(null);
    if (appointment) open(action, appointment);
  };
  return <MainLayout slots={{beforeSignOut:leave,beforeClinicChange:leave,beforeNavigate:leave}}><Container size="xl"><Stack gap="md">
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
      <Box><Title order={2}>Agenda</Title><Text c="dimmed" size="sm">Citas, participantes y sesiones realizadas</Text></Box>
      <Group gap="xs" wrap="wrap">
        <SegmentedControl size="xs" value={view} onChange={value => setView(value as CalendarView)} data={VIEW_OPTIONS}/>
        <Button leftSection={<Plus size={16}/>} disabled={!data || !verified || !!mode} onClick={() => open('create')}>Nueva cita</Button>
      </Group>
    </Group>
    <Group justify="space-between" align="center" wrap="wrap" gap="sm">
      <Group gap={4} wrap="nowrap">
        {view !== 'list' && <>
          <Button variant="default" size="xs" onClick={goToday}>Hoy</Button>
          <ActionIcon variant="subtle" color="gray" aria-label="Período anterior" onClick={() => shift(-1)}><ChevronLeft size={18}/></ActionIcon>
          <ActionIcon variant="subtle" color="gray" aria-label="Período siguiente" onClick={() => shift(1)}><ChevronRight size={18}/></ActionIcon>
        </>}
        <Title order={3} size="h5" tt="capitalize" ml="xs">{periodTitle(view, course)}</Title>
      </Group>
      <Group gap="xs" wrap="wrap">
        <Select size="xs" w={210} clearable searchable placeholder="Todos los estudiantes" aria-label="Filtrar por estudiante"
          value={filter} onChange={setFilter} data={studentLabels}
          renderOption={({ option }) => <Group gap="xs" wrap="nowrap">
            <Box w={9} h={9} style={{ borderRadius: '50%', flex: '0 0 auto', background: `var(--mantine-color-${colorForStudent(option.value)}-6)` }}/>
            <Text size="sm">{option.label}</Text>
          </Group>}/>
        <Checkbox size="xs" label="Canceladas" checked={cancelled} onChange={e => setCancelled(e.currentTarget.checked)}/>
        <Button size="xs" variant="subtle" leftSection={<RefreshCw size={14}/>} loading={loading} onClick={() => void refresh()}>Actualizar</Button>
      </Group>
    </Group>
    {!clinicId && <Alert color="yellow">Selecciona una clínica para consultar su agenda.</Alert>}
    {loading && !data && <Group justify="center" py="xl"><Loader size="sm"/></Group>}
    {readError && <Alert color="red">{readError}</Alert>}
    {success && <Alert color="green">{success}</Alert>}
    {data && view === 'list' && <AgendaList timeZone={timeZone} data={data} appointments={appointments} onSelect={setDetail}/>}
    {data && view === 'month' && <MonthView cursor={course} today={today} timeZone={timeZone} data={data}
      appointments={appointments} onSelect={setDetail} onCreateAt={createAt} onOpenDay={openDay}/>}
    {data && (view === 'week' || view === 'day') && <TimeGridView days={view === 'day' ? [course] : weekGrid(course)}
      today={today} timeZone={timeZone} data={data} appointments={appointments} onSelect={setDetail} onCreateAt={createAt}/>}
    {!data && !loading && !readError && !clinicId && <Alert color="yellow">No hay una clínica activa disponible.</Alert>}
    {data && <Text size="xs" c="dimmed">El calendario agrupa por {timeZone}. Cada cita conserva su propia zona horaria. Haz clic en un día o franja para crear una cita.</Text>}
  </Stack></Container>
  <AppointmentDetailModal appointment={detail} data={data} timeZone={timeZone} onClose={() => setDetail(null)} onAction={detailAction}/>
  <Modal opened={mode !== null} onClose={close} closeOnClickOutside={false} closeOnEscape={!pending&&!busy}
    withCloseButton={!pending&&!busy} title={mode === 'create' ? 'Nueva cita' : mode === 'cancel' ? 'Cancelar cita' : mode === 'link-session' ? 'Vincular sesión realizada' : mode === 'reschedule' ? 'Reprogramar cita' : 'Editar cita'} size="lg">
    <Stack>{error && <Alert color="red">{error}</Alert>}
      {pending && <Alert color="yellow">La operación conserva su identidad. Si no llegó confirmación, reintenta sin cambiar los datos.</Alert>}
      {conflict && <Alert color="yellow">Tu formulario se conserva. Revisa la versión actual antes de preparar una nueva operación.
        <Button mt="sm" loading={loading} disabled={busy||!verified} onClick={() => void refresh()}>Consultar estado actual</Button>
        {readError && <Text c="red" size="sm">{readError}</Text>}
        {!loading&&!readError&&!currentAppointment && <Text size="sm">La cita ya no está disponible. No se recreará desde este formulario.</Text>}
        {currentAppointment && !loading && !readError && <Stack gap="xs" mt="sm"><Text size="sm">{currentAppointment.title} · {formatWallTime(wallTime(currentAppointment.startsAt,currentAppointment.timeZone))} · {currentAppointment.notes}</Text>
          <Text size="sm">{currentAppointment.participants.map(p => p.label).join(', ')}</Text>
          <Text size="sm">Estado: {currentAppointment.status} · versión {currentAppointment.version} · serie {currentAppointment.seriesVersion ?? '—'}</Text>
          <details><summary>Ver datos técnicos</summary><pre style={{maxHeight:220,overflow:'auto',whiteSpace:'pre-wrap'}}>{JSON.stringify({startsAt:currentAppointment.startsAt,endsAt:currentAppointment.endsAt,timeZone:currentAppointment.timeZone,recurrence:currentAppointment.recurrence,reminders:currentAppointment.reminders,linkedSessionId:currentAppointment.linkedSessionId},null,2)}</pre></details>
          <Button variant="light" disabled={busy||!verified||currentAppointment.status!=='scheduled'} onClick={() => { if(loading||readError||!verified||currentAppointment.status!=='scheduled')return;setTarget(currentAppointment);setConfirmed(false);setConflict(false);setError(''); }}>He revisado los cambios; usar esta versión</Button></Stack>}
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
          data={sessions.map(s => ({value:s.id,label:formatWallTime(wallTime(s.capturedAt,zone))+' · '+s.id.slice(0,8)}))}/>
        : <><Select label="Estudiante" required searchable data={studentLabels} value={student} disabled={!!target} onChange={value => {setStudent(value);setParticipants(p => p.filter(v => v.startsWith('p:')));}}/>
          <TextInput label="Título" required maxLength={300} value={title} onChange={e => setTitle(e.currentTarget.value)}/>
          <Textarea label="Notas" maxLength={10000} value={notes} onChange={e => setNotes(e.currentTarget.value)}/>
          <TextInput label="Zona horaria" required value={zone} disabled={!!target?.seriesId&&editScope==='occurrence'} onChange={e => setZone(e.currentTarget.value)} description="Ejemplo: America/Santiago"/>
          <SimpleGrid cols={{base:1,sm:2}}>
            <TextInput type="date" label="Fecha de inicio" required value={start.slice(0,10)}
              onChange={e => setStart(e.currentTarget.value+'T'+(start.slice(11)||'09:00'))}/>
            <TextInput type="time" label="Hora de inicio" required value={start.slice(11,16)}
              onChange={e => setStart((start.slice(0,10)||today)+'T'+e.currentTarget.value)}/>
            <TextInput type="date" label="Fecha de fin" required value={end.slice(0,10)}
              onChange={e => setEnd(e.currentTarget.value+'T'+(end.slice(11)||'10:00'))}/>
            <TextInput type="time" label="Hora de fin" required value={end.slice(11,16)}
              onChange={e => setEnd((end.slice(0,10)||start.slice(0,10)||today)+'T'+e.currentTarget.value)}/>
          </SimpleGrid>
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
