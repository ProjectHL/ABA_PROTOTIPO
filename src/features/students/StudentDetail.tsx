'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from '@/lib/navigation';
import { Alert, Autocomplete, Badge, Button, Divider, Fieldset, Grid, Group, Modal, Paper, Select, Stack, Tabs, Text, TextInput, Textarea, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ClipboardList, FileText, Pill, PlayCircle, Stethoscope, User, Users } from 'lucide-react';
import { StudentProgramsPanel } from './StudentProgramsPanel';
import { DEFAULT_REPORTED_DIAGNOSES, type StudentProfile } from './student.types';
import { saveClinicalHistoryV2, saveStudentV2 } from '@/modules/students/student.server';
import type { ClinicalHistoryCommand, StudentPersonDto, StudentSiblingDto } from '@/modules/students/contracts';
import { clinicalHistoryCommand } from '@/modules/students/contracts';
import { studentCommandV2Schema } from '@/domain/students/student-v2';
import type { StudentCommandV2 } from '@/domain/students/student-v2';
import type { CommandResult } from '@/domain/commands/result';
import { StudentDocumentsPanel } from './StudentDocumentsPanel';
import { StudentPhotoControl } from './StudentPhotoControl';
import { StudentPeoplePanel } from './StudentPeoplePanel';
import { FamilyManagementPanel } from '@/modules/family/FamilyManagementPanel';
import { StudentMedicationPanel } from './StudentMedicationPanel';
import { StudentClinicalHistoryPanel } from './StudentClinicalHistoryPanel';
import ShareButton from './ShareButton';

interface StudentDetailProps { student: StudentProfile; onRefresh: () => Promise<void>; leaveGuard?: { current: (() => boolean) | null }; }
const newId = () => crypto.randomUUID();
const diagnosisChoiceFor = (value: string | null) => value && DEFAULT_REPORTED_DIAGNOSES.includes(value as typeof DEFAULT_REPORTED_DIAGNOSES[number]) ? value : value ? 'Otro' : '';

function commandMessage(result: { status: string; message?: string; replayed?: boolean }) {
  if (result.status === 'acknowledged') return result.replayed ? 'Se recuperó el recibo de la operación anterior.' : 'El servidor confirmó el cambio.';
  return result.message ?? 'El cambio no fue confirmado. Conserva el borrador y revisa el estado del servidor.';
}

export function StudentDetail({ student, onRefresh, leaveGuard }: StudentDetailProps) {
  const searchParams = useSearchParams(); const navigate = useNavigate(); const location = useLocation();
  const activeTab = searchParams.get('tab') || 'general';
  const canWrite = student.capabilities.includes('student.edit');
  const canEditVersioned = canWrite && student.version !== null;
  // Keeps the original controls visible; handlers that require an existing V2
  // version refuse the command and direct the user to initialize the profile.
  const canEdit = canWrite;
  const [saving, setSaving] = useState(false);
  const [medicationOpened, medicationModal] = useDisclosure(false);
  const [historyOpened, historyModal] = useDisclosure(false);
  const [selectedMedication, setSelectedMedication] = useState<StudentProfile['medications'][number] | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<StudentProfile['history'][number] | null>(null);
  const pendingCommands = useRef(new Map<string, unknown>());
  const [pendingCount, setPendingCount] = useState(0);
  const commandBusy = useRef(false);
  const peopleLeaveGuard = useRef<(() => boolean) | null>(null);
  const familySharingLeaveGuard = useRef<(() => boolean) | null>(null);
  const documentsLeaveGuard = useRef<(() => boolean) | null>(null);
  const photoLeaveGuard = useRef<(() => boolean) | null>(null);
  const programsBlocked = useRef(false);
  const onProgramGuardChange = useCallback((blocked: boolean) => { programsBlocked.current = blocked; }, []);
  const [conflict, setConflict] = useState<{ key: string; command: StudentCommandV2 | ClinicalHistoryCommand; message: string; ready: boolean } | null>(null);
  const [reviewError, setReviewError] = useState('');
  const [reviewOpened, setReviewOpened] = useState(false);
  const retain = <T,>(key: string, build: () => T): T => {
    const existing = pendingCommands.current.get(key);
    if (existing !== undefined) return existing as T;
    if (pendingCommands.current.size > 0) throw new Error('Hay otra operación con resultado desconocido. Reinténtala sin cambiar sus datos antes de iniciar un cambio diferente.');
    const candidate = build();
    const command = (key.startsWith('medication') || key.startsWith('history') ? clinicalHistoryCommand.parse(candidate) : studentCommandV2Schema.parse(candidate)) as T;
    pendingCommands.current.set(key, command); setPendingCount(pendingCommands.current.size); return command;
  };
  const settle = (key: string) => { pendingCommands.current.delete(key); setPendingCount(pendingCommands.current.size); };
  const profileForm = useForm({ initialValues: { clinicalId: student.clinicalId, initials: student.initials, birthDate: student.dateOfBirth, fullName: student.fullName ?? '', rut: student.rut ?? '', primaryLanguage: student.primaryLanguage, livingArrangement: student.livingArrangement ?? '', diagnosis: student.diagnosis ?? '', consultationReason: student.consultationReason ?? '', home: student.context.home, school: student.context.school, adaptations: student.context.adaptations } });
  const [diagnosisChoice, setDiagnosisChoice] = useState(diagnosisChoiceFor(student.diagnosis));
  const profileBaseVersion = useRef(student.version);
  // A refreshed parent must not silently pair an older dirty form with a newer revision.
  useEffect(() => {
    if (profileBaseVersion.current === student.version || profileForm.isDirty() || commandBusy.current || pendingCount || conflict) return;
    const values = { clinicalId: student.clinicalId, initials: student.initials, birthDate: student.dateOfBirth, fullName: student.fullName ?? '', rut: student.rut ?? '', primaryLanguage: student.primaryLanguage, livingArrangement: student.livingArrangement ?? '', diagnosis: student.diagnosis ?? '', consultationReason: student.consultationReason ?? '', home: student.context.home, school: student.context.school, adaptations: student.context.adaptations };
    profileForm.setValues(values); profileForm.resetDirty(values); setDiagnosisChoice(diagnosisChoiceFor(student.diagnosis)); profileBaseVersion.current = student.version;
  }, [student, profileForm, pendingCount, conflict]);
  const medicationForm = useForm({ initialValues: { name: '', dose: '', frequency: '', prescriber: '', startedOn: '', endedOn: '', notes: '' } });
  const historyForm = useForm({ initialValues: { kind: 'assessment', descriptor: '', notes: '' } });
  const medications = useMemo(() => student.medications, [student.medications]);
  const receive = async (key: string, command: unknown, result: CommandResult) => {
    settle(key);
    if (result.status !== 'conflict') return;
    const snapshot = key.startsWith('medication') || key.startsWith('history') ? clinicalHistoryCommand.parse(command) : studentCommandV2Schema.parse(command);
    setConflict({ key, command: snapshot, message: result.message, ready: false }); setReviewError(''); setReviewOpened(true);
    try { await onRefresh(); setConflict(value => value ? { ...value, ready: true } : null); }
    catch { setReviewError('No se pudo recuperar la versión actual. El borrador se conserva; vuelve a consultar antes de continuar.'); }
  };
  const reviewCurrent = async () => {
    if (commandBusy.current) return;
    commandBusy.current = true; setSaving(true); setReviewError('');
    try { await onRefresh(); setConflict(value => value ? { ...value, ready: true } : null); }
    catch { setReviewError('No se pudo recuperar la versión actual. No se habilitó un nuevo envío.'); }
    finally { commandBusy.current = false; setSaving(false); }
  };
  const conflictedHistoryId = conflict && 'historyId' in conflict.command ? conflict.command.historyId : null;
  const conflictedHistoryEntry = conflictedHistoryId ? student.history.filter(item => item.historyId === conflictedHistoryId).sort((a,b) => (b.version ?? 0) - (a.version ?? 0) || b.createdAt.localeCompare(a.createdAt))[0] : null;
  const conflictedMedication = conflictedHistoryEntry?.kind === 'medication' ? student.medications.find(item => item.historyId === conflictedHistoryId) : null;
  const acceptReview = () => {
    if (!conflict?.ready || saving) return;
    if ('historyId' in conflict.command) {
      if (!conflictedHistoryEntry) { setReviewError('La entrada clínica ya no está disponible; no se recreará automáticamente.'); return; }
      if (conflictedMedication && selectedMedication?.historyId === conflictedMedication.historyId) setSelectedMedication(conflictedMedication);
      if (conflictedHistoryEntry.kind !== 'medication' && selectedHistory?.historyId === conflictedHistoryEntry.historyId) setSelectedHistory(conflictedHistoryEntry);
    }
    // No write on review: the existing form remains and the user must explicitly
    // submit a new command against the freshly read version.
    if (!('historyId' in conflict.command)) profileBaseVersion.current = student.version;
    setConflict(null); setReviewError(''); setReviewOpened(false);
  };

  const leave = () => {
    if (programsBlocked.current) { toast('Programación pendiente', 'yellow', 'Cierra el diseñador o resuelve sus operaciones antes de salir.'); return false; }
    if (pendingCommands.current.size || commandBusy.current) {
      notifications.show({ title: 'Operación pendiente', color: 'yellow', message: 'Recupera el resultado de la misma operación antes de salir de la ficha.' });
      return false;
    }
    if (peopleLeaveGuard.current && !peopleLeaveGuard.current()) return false;
    if (familySharingLeaveGuard.current && !familySharingLeaveGuard.current()) return false;
    if (documentsLeaveGuard.current && !documentsLeaveGuard.current()) return false;
    if (photoLeaveGuard.current && !photoLeaveGuard.current()) return false;
    return !(profileForm.isDirty() || medicationOpened || historyOpened || conflict) || window.confirm('¿Salir sin guardar los cambios del formulario?');
  };
  useEffect(() => {
    if (leaveGuard) leaveGuard.current = leave;
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingCommands.current.size || commandBusy.current || profileForm.isDirty() || medicationOpened || historyOpened) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => { if (leaveGuard) leaveGuard.current = null; window.removeEventListener('beforeunload', warn); };
  });
  const retryPending = async () => {
    if (commandBusy.current || !canWrite) return false;
    const entry = pendingCommands.current.entries().next().value;
    if (!entry) return false;
    const [key, command] = entry;
    commandBusy.current = true; setSaving(true);
    try {
      const result = key.startsWith('medication') || key.startsWith('history') ? await saveClinicalHistoryV2(command) : await saveStudentV2({ clinicId: student.clinicId, command });
      await receive(key, command, result);
      toast(result.status === 'acknowledged' ? 'Resultado recuperado' : 'Cambio sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      if (result.status === 'acknowledged') {
        if (key === 'profile') profileForm.resetDirty();
        if (key.startsWith('medication')) medicationModal.close();
        if (key.startsWith('history')) historyModal.close();
        try { await onRefresh(); }
        catch { toast('Cambio confirmado; lectura pendiente', 'yellow', 'El servidor confirmó el cambio, pero no se pudo actualizar la vista. No repitas el alta; vuelve a consultar la ficha.'); }
      }
      return result.status === 'acknowledged';
    } catch (cause) { toast('Resultado todavía desconocido', 'red', cause instanceof Error ? cause.message : 'Reintenta la misma operación.'); return false; }
    finally { commandBusy.current = false; setSaving(false); }
  };

  const changeTab = (tab: string | null) => { if (tab && !pendingCommands.current.size && !commandBusy.current && !programsBlocked.current) navigate(`${location.pathname}?tab=${tab}`); };
  const toast = (title: string, color: 'green' | 'red' | 'yellow' | 'blue', message: string) => notifications.show({ title, color, message });
  const v2Unavailable = () => toast('Inicializa primero la ficha V2', 'yellow', 'Guarda Información General para crear una versión explícita. No se inventará nombre, RUT ni detalle ausente.');

  const saveProfile = async (options?: { photoAttachmentId?: string | null; commandKey?: string; people?: StudentPersonDto[]; siblings?: StudentSiblingDto[] }): Promise<boolean> => {
    if (commandBusy.current || pendingCommands.current.size || conflict) return false;
    if (options && profileForm.isDirty()) {
      toast('Información general pendiente', 'yellow', 'Guarda primero Información General. Cambiar personas o fotografía no guardará esos campos de forma implícita.');
      return false;
    }
    if (!canWrite) { toast('Sin permiso', 'yellow', 'No tienes capacidad vigente para editar esta ficha.'); return false; }
    commandBusy.current = true; setSaving(true);
    try {
      const values = profileForm.values;
      const commandKey = options?.commandKey ?? 'profile';
      const command = retain<StudentCommandV2>(commandKey, () => ({ schemaVersion: 2 as const, operationId: newId(), idempotencyKey: newId(), studentId: student.id, expectedVersion: profileBaseVersion.current ?? 0, action: profileBaseVersion.current === null ? 'initialize-v2' as const : 'update' as const, statusConfirmation: false,
        payload: { schemaVersion: 2 as const, clinicalId: values.clinicalId, fullName: values.fullName.trim() || null, initials: values.initials, rut: values.rut || null, photoAttachmentId: options?.photoAttachmentId === undefined ? student.photoAttachmentId : options.photoAttachmentId, birthDate: values.birthDate, primaryLanguage: values.primaryLanguage, livingArrangement: values.livingArrangement, reportedDiagnosis: values.diagnosis, consultationReason: values.consultationReason, context: { home: values.home, school: values.school, adaptations: values.adaptations }, people: (options?.people ?? student.people).map((person) => ({ id: person.id, fullName: person.fullName, initials: person.initials, birthDate: person.birthDate, relationship: person.relationship, phone: person.phone ?? '', email: person.email, roles: [...person.roles], isPrimaryContact: person.isPrimaryContact })), siblings: (options?.siblings ?? student.siblings).map((sibling) => ({ id: sibling.id, fullName: sibling.fullName, initials: sibling.initials, birthDate: sibling.birthDate, notes: sibling.notes ?? '' })) } }));
      const result = await saveStudentV2({ clinicId: student.clinicId, command });
      toast(result.status === 'acknowledged' ? 'Ficha actualizada' : 'Ficha sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      await receive(commandKey, command, result); if (result.status === 'acknowledged') {
        profileForm.resetDirty();
        try { await onRefresh(); }
        catch { toast('Ficha confirmada; lectura pendiente', 'yellow', 'El cambio está confirmado, pero no se pudo actualizar la vista. No repitas el alta; vuelve a consultar la ficha.'); }
        return true;
      }
      return false;
    } catch (cause) { toast('No se guardó la ficha', 'red', cause instanceof Error ? cause.message : 'Resultado desconocido; conserva el borrador.'); return false; }
    finally { commandBusy.current = false; setSaving(false); }
  };

  const changeStatus = async () => {
    if (commandBusy.current || pendingCommands.current.size || conflict) return;
    if (!canEditVersioned || student.version === null) return v2Unavailable();
    const expectedVersion = student.version;
    const action = student.status === 'active' ? 'archive' as const : 'reactivate' as const;
    if (!window.confirm(action === 'archive' ? '¿Archivar esta ficha? Los archivos y el historial no se borrarán.' : '¿Reactivar esta ficha?')) return;
    commandBusy.current = true; setSaving(true);
    try {
      const command = retain<StudentCommandV2>('status', () => ({ schemaVersion: 2 as const, operationId: newId(), idempotencyKey: newId(), studentId: student.id, expectedVersion, action, payload: null, statusConfirmation: true }));
      const result = await saveStudentV2({ clinicId: student.clinicId, command });
      toast(result.status === 'acknowledged' ? 'Estado actualizado' : 'Estado sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      await receive('status', command, result); if (result.status === 'acknowledged') await onRefresh();
    } catch (cause) { toast('No se cambió el estado', 'red', cause instanceof Error ? cause.message : 'Resultado desconocido; conserva el estado visible.'); }
    finally { commandBusy.current = false; setSaving(false); }
  };

  const openMedication = (medication?: StudentProfile['medications'][number]) => {
    if (commandBusy.current || pendingCommands.current.size || conflict) return;
    setSelectedMedication(medication ?? null);
    medicationForm.setValues(medication ? { name: medication.name, dose: medication.dose ?? '', frequency: medication.frequency ?? '', prescriber: medication.prescribedBy ?? '', startedOn: medication.startDate ?? '', endedOn: medication.endDate ?? '', notes: medication.notes ?? '' } : { name: '', dose: '', frequency: '', prescriber: '', startedOn: '', endedOn: '', notes: '' });
    medicationModal.open();
  };
  const saveMedication = async (action: 'create' | 'correct' | 'update-treatment' = 'create') => {
    if (conflict) return;
    if (pendingCommands.current.size) return retryPending();
    if (commandBusy.current) return;
    if (!canEditVersioned) return v2Unavailable();
    commandBusy.current = true; setSaving(true);
    try {
      const values = medicationForm.values;
      if (action !== 'create' && !selectedMedication) throw new Error('Selecciona el tratamiento que deseas versionar.');
      const effectiveAction: ClinicalHistoryCommand['action'] = action !== 'create' && selectedMedication?.version === null ? 'initialize-v2' : action;
      const commandKey = `medication:${effectiveAction}:${selectedMedication?.historyId ?? 'new'}`;
      const command = retain<ClinicalHistoryCommand>(commandKey, () => ({
        clinicId: student.clinicId,
        operationId: newId(),
        idempotencyKey: newId(),
        studentId: student.id,
        expectedVersion: selectedMedication?.version ?? 0,
        action: effectiveAction,
        historyId: selectedMedication?.historyId ?? newId(),
        versionId: newId(),
        supersedesVersionId: selectedMedication?.version === null ? null : selectedMedication?.versionId ?? null,
        confirmation: effectiveAction === 'update-treatment',
        payload: { kind: 'medication', descriptor: values.name, dose: values.dose || null, frequency: values.frequency || null, prescriber: values.prescriber || null, startedOn: values.startedOn || null, endedOn: values.endedOn || null, notes: values.notes || null },
      }));
      const result = await saveClinicalHistoryV2(command);
      toast(result.status === 'acknowledged' ? 'Tratamiento confirmado' : 'Tratamiento sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      await receive(commandKey, command, result); if (result.status === 'acknowledged') { medicationModal.close(); await onRefresh(); }
    } catch (cause) { toast('No se guardó el tratamiento', 'red', cause instanceof Error ? cause.message : 'Resultado desconocido; conserva el formulario.'); }
    finally { commandBusy.current = false; setSaving(false); }
  };
  const toggleMedication = async (medication: StudentProfile['medications'][number]) => {
    if (commandBusy.current || pendingCommands.current.size || conflict) return;
    if (!canEditVersioned) { v2Unavailable(); return; }
    if (medication.version === null) { toast('Tratamiento histórico V1', 'yellow', 'Inicializa una versión clínica explícita antes de finalizar o reactivar este tratamiento.'); return; }
    const action = medication.status === 'active' ? 'finish-treatment' as const : 'reactivate-treatment' as const;
    if (!window.confirm(action === 'finish-treatment' ? '¿Finalizar este tratamiento? La versión previa se conserva.' : '¿Reactivar este tratamiento?')) return;
    commandBusy.current = true; setSaving(true);
    try {
      const commandKey = `medication-status:${action}:${medication.historyId}`;
      const command = retain<ClinicalHistoryCommand>(commandKey, () => ({ clinicId: student.clinicId, operationId: newId(), idempotencyKey: newId(), studentId: student.id, expectedVersion: medication.version!, action, historyId: medication.historyId, versionId: newId(), supersedesVersionId: medication.versionId, confirmation: true, payload: { kind: 'medication', descriptor: medication.name, dose: medication.dose, frequency: medication.frequency, prescriber: medication.prescribedBy, startedOn: medication.startDate, endedOn: action === 'finish-treatment' ? new Date().toISOString().slice(0, 10) : null, notes: medication.notes } }));
      const result = await saveClinicalHistoryV2(command);
      toast(result.status === 'acknowledged' ? 'Tratamiento confirmado' : 'Tratamiento sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      await receive(commandKey, command, result); if (result.status === 'acknowledged') await onRefresh();
    } catch (cause) { toast('No se cambió el tratamiento', 'red', cause instanceof Error ? cause.message : 'Resultado desconocido; conserva el estado visible.'); }
    finally { commandBusy.current = false; setSaving(false); }
  };

  const retireHistory = async (entry: StudentProfile['history'][number]) => {
    if (commandBusy.current || conflict) return;
    if (pendingCommands.current.size) { await retryPending(); return; }
    if (!canEditVersioned) return v2Unavailable();
    if (entry.version === null) { toast('Inicializa primero la entrada V2', 'yellow', 'Crea una corrección versionada de la entrada original antes de retirarla.'); return; }
    if (entry.kind === 'medication' || entry.status !== 'active') return;
    if (!window.confirm('¿Retirar esta referencia clínica? Se conservarán su contenido y todas las versiones como evidencia.')) return;
    commandBusy.current = true; setSaving(true); setSelectedHistory(entry);
    try {
      const commandKey = `history:retire-reference:${entry.historyId}`;
      const command = retain<ClinicalHistoryCommand>(commandKey, () => ({
        clinicId: student.clinicId, operationId: newId(), idempotencyKey: newId(), studentId: student.id,
        expectedVersion: entry.version!, action: 'retire-reference', historyId: entry.historyId,
        versionId: newId(), supersedesVersionId: entry.versionId, confirmation: true,
        payload: { kind: entry.kind as 'reported_diagnosis' | 'assessment' | 'procedure', descriptor: entry.descriptor,
          dose: null, frequency: null, prescriber: null, startedOn: null, endedOn: null, notes: entry.notes },
      }));
      const result = await saveClinicalHistoryV2(command);
      await receive(commandKey, command, result);
      toast(result.status === 'acknowledged' ? 'Referencia retirada; evidencia conservada' : 'Retiro sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      if (result.status === 'acknowledged') {
        try { await onRefresh(); }
        catch { toast('Retiro confirmado; lectura pendiente', 'yellow', 'El recibo está confirmado. Vuelve a consultar la ficha sin repetir la operación.'); }
      }
    } catch (cause) { toast('Retiro sin confirmar', 'red', cause instanceof Error ? cause.message : 'Recupera la misma operación antes de continuar.'); }
    finally { commandBusy.current = false; setSaving(false); }
  };

  const openHistory = (entry?: StudentProfile['history'][number]) => {
    if (commandBusy.current || pendingCommands.current.size || conflict) return;
    setSelectedHistory(entry ?? null);
    historyForm.setValues(entry ? { kind: entry.kind, descriptor: entry.descriptor, notes: entry.notes ?? '' } : { kind: 'assessment', descriptor: '', notes: '' });
    historyModal.open();
  };
  const saveHistory = async () => {
    if (conflict) return;
    if (pendingCommands.current.size) { await retryPending(); return; }
    if (commandBusy.current) return;
    if (!canEditVersioned) return v2Unavailable();
    commandBusy.current = true; setSaving(true);
    try {
      const values = historyForm.values;
      if (values.kind === 'medication') throw new Error('Usa la pestaña Medicación para registrar tratamientos.');
      const action: ClinicalHistoryCommand['action'] = selectedHistory ? selectedHistory.version === null ? 'initialize-v2' : 'correct' : 'create';
      const commandKey = `history:${action}:${selectedHistory?.historyId ?? 'new'}`;
      const command = retain<ClinicalHistoryCommand>(commandKey, () => ({
        clinicId: student.clinicId, operationId: newId(), idempotencyKey: newId(), studentId: student.id,
        expectedVersion: selectedHistory?.version ?? 0, action,
        historyId: selectedHistory?.historyId ?? newId(), versionId: newId(),
        supersedesVersionId: selectedHistory?.version === null ? null : selectedHistory?.versionId ?? null,
        confirmation: false,
        payload: { kind: values.kind as 'reported_diagnosis' | 'assessment' | 'procedure', descriptor: values.descriptor, dose: null, frequency: null, prescriber: null, startedOn: null, endedOn: null, notes: values.notes || null },
      }));
      const result = await saveClinicalHistoryV2(command);
      toast(result.status === 'acknowledged' ? 'Entrada clínica confirmada' : 'Entrada sin confirmar', result.status === 'acknowledged' ? 'green' : 'yellow', commandMessage(result));
      await receive(commandKey, command, result);
      if (result.status === 'acknowledged') { historyModal.close(); await onRefresh(); }
    } catch (cause) { toast('No se guardó la entrada clínica', 'red', cause instanceof Error ? cause.message : 'Resultado desconocido; conserva el formulario.'); }
    finally { commandBusy.current = false; setSaving(false); }
  };

  return <Stack gap="lg">
    {conflict && <Alert color="yellow">Hay un conflicto sin revisar. Los nuevos cambios de ficha e historial clínico están bloqueados.<Button mt="sm" onClick={() => setReviewOpened(true)}>Revisar versión actual</Button></Alert>}
    <Modal opened={!!conflict && reviewOpened} onClose={() => setReviewOpened(false)} closeOnClickOutside={false} title="Revisar cambio concurrente" size="lg" zIndex={400}>
      <Stack><Alert color="yellow">{conflict?.message} Tu borrador permanece en el formulario. Revisar no guarda ni combina cambios automáticamente.</Alert>
        {reviewError && <Alert color="red">{reviewError}</Alert>}
        {conflict?.ready && <Paper withBorder p="md"><Stack gap="xs"><Title order={4}>Versión actual del servidor</Title>
          {conflict && 'historyId' in conflict.command ? conflictedHistoryEntry ? <>
            <Text>{conflictedHistoryEntry.descriptor} · {conflictedHistoryEntry.kind} · versión {conflictedHistoryEntry.version ?? 'V1'} · {conflictedHistoryEntry.status}</Text>
            {conflictedMedication && <><Text>Dosis: {conflictedMedication.dose || 'No informada'} · Frecuencia: {conflictedMedication.frequency || 'No informada'}</Text><Text>Prescriptor: {conflictedMedication.prescribedBy || 'No informado'}</Text><Text>Inicio: {conflictedMedication.startDate || 'No informado'} · Término: {conflictedMedication.endDate || 'No informado'}</Text></>}
            <Text style={{whiteSpace:'pre-wrap'}}>Notas: {conflictedHistoryEntry.notes || 'Sin notas'}</Text>
          </> : <Text>Entrada clínica no disponible en la lectura actual.</Text> : <>
            <Text>{student.displayName} · versión {student.version ?? 'V1'} · {student.status}</Text>
            <Text>ID: {student.clinicalId} · Iniciales: {student.initials} · RUT: {student.rut || 'No informado'} · Nacimiento: {student.dateOfBirth}</Text>
            <Text>Idioma: {student.primaryLanguage} · Convivencia: {student.livingArrangement || 'No informada'}</Text>
            <Text>Diagnóstico reportado: {student.diagnosis || 'No informado'}</Text><Text>Motivo: {student.consultationReason || 'No informado'}</Text>
            <Text>Hogar: {student.context.home} · Escolaridad: {student.context.school} · Adaptaciones: {student.context.adaptations}</Text>
            <Text size="sm">Referencia de fotografía: {student.photoAttachmentId || 'Ninguna'}</Text>
            {student.people.map(person => <Text size="sm" key={person.id}>{person.fullName || person.initials} · {person.relationship} · {person.phone} · {person.email} · {person.roles.join(', ')}{person.isPrimaryContact ? ' · principal' : ''}</Text>)}
            {student.siblings.map(sibling => <Text size="sm" key={sibling.id}>Hermano/a: {sibling.fullName || sibling.initials} · {sibling.birthDate} · {sibling.notes}</Text>)}
          </>}
        </Stack></Paper>}
        <Group><Button variant="light" loading={saving} onClick={() => void reviewCurrent()}>Consultar versión actual</Button>
          <Button disabled={!conflict?.ready || saving || (!!conflict && 'historyId' in conflict.command && !conflictedHistoryEntry)} onClick={acceptReview}>He revisado; volver al borrador</Button></Group>
      </Stack>
    </Modal>
    {pendingCount > 0 && <Alert color="yellow" title="Operación pendiente">El comando enviado se conserva sin cambios. Usa este reintento para recuperar su resultado antes de iniciar otro cambio.
      <Button mt="sm" onClick={() => void retryPending()} loading={saving} disabled={!canWrite}>Reintentar misma operación</Button></Alert>}
    <Paper shadow="sm" p="xl" radius="md" withBorder><Group justify="space-between" align="flex-start"><Group align="flex-start"><StudentPhotoControl clinicId={student.clinicId} studentId={student.id} initials={student.initials} attachmentId={student.photoAttachmentId} leaveGuard={photoLeaveGuard} canEdit={canEditVersioned && !saving && pendingCount === 0 && !conflict} onLink={(attachmentId) => saveProfile({ photoAttachmentId: attachmentId, commandKey: 'profile-photo' })} /><div><Title order={2}>{student.displayName}</Title><Group gap="xs" mt="xs"><Badge color={student.status === 'active' ? 'green' : 'gray'}>{student.status === 'active' ? 'Vigente' : 'Antiguo'}</Badge>{student.diagnosis && <Badge variant="light" color="blue">{student.diagnosis}</Badge>}{student.hasActiveSession && <Badge color="green">Sesión activa</Badge>}{student.familyAccessEnabled && <Badge variant="outline" color="blue">Acceso familiar</Badge>}</Group><Text size="sm" c="dimmed" mt="sm">ID clínico: {student.clinicalId} · RUT: {student.rut ?? 'No informado'} · {student.age} años</Text></div></Group><Group>{student.capabilities.includes('authorization.decide') && <ShareButton studentId={student.id} studentName={student.displayName} trigger="button" disabled={saving || pendingCount > 0 || !!conflict}/>}<Button variant="light" color={student.status === 'active' ? 'orange' : 'green'} onClick={changeStatus} disabled={!canEdit || saving || pendingCount > 0}>{student.status === 'active' ? 'Archivar ficha' : 'Reactivar ficha'}</Button><Button color="green" size="md" leftSection={<PlayCircle size={20}/>} disabled={saving || pendingCount > 0 || student.status!=='active' || !student.capabilities.includes('record.capture')} onClick={() => { if (leave()) navigate(`/session/${student.id}`); }}>Iniciar sesión</Button></Group></Group></Paper>
    {student.version === null && <Alert color="yellow" title="Ficha histórica V1">La lectura conserva los datos existentes sin inventar nombre, RUT ni contacto. Revisa Información General y usa Guardar ficha para crear explícitamente la primera versión V2.</Alert>}
    <Tabs value={activeTab} onChange={changeTab}><Tabs.List><Tabs.Tab value="general" leftSection={<User size={16} />}>Información General</Tabs.Tab><Tabs.Tab value="family" leftSection={<Users size={16} />}>Familia y Contacto</Tabs.Tab><Tabs.Tab value="history" leftSection={<Stethoscope size={16} />}>Historial Clínico</Tabs.Tab><Tabs.Tab value="documents" leftSection={<FileText size={16} />}>Documentación Legal</Tabs.Tab><Tabs.Tab value="medication" leftSection={<Pill size={16} />}>Medicación</Tabs.Tab><Tabs.Tab value="programs" leftSection={<ClipboardList size={16} />}>Programación</Tabs.Tab></Tabs.List>
      <Tabs.Panel value="general" pt="lg"><Paper shadow="xs" p="lg" radius="md" withBorder><Grid><Grid.Col span={{base:12,md:6}}><TextInput label="Identificador clínico" required maxLength={64} {...profileForm.getInputProps('clinicalId')} disabled={!canEdit || saving || pendingCount > 0}/></Grid.Col><Grid.Col span={{base:12,md:6}}><TextInput label="Iniciales clínicas" required maxLength={12} {...profileForm.getInputProps('initials')} disabled={!canEdit || saving || pendingCount > 0}/></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><TextInput label="Nombre completo" {...profileForm.getInputProps('fullName')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><TextInput label="RUT (opcional)" placeholder="12.345.678-9" {...profileForm.getInputProps('rut')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><TextInput label="Fecha de nacimiento" type="date" required {...profileForm.getInputProps('birthDate')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><TextInput label="Idioma principal" {...profileForm.getInputProps('primaryLanguage')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><TextInput label="Convivencia" {...profileForm.getInputProps('livingArrangement')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><Select label="Diagnóstico reportado" searchable clearable data={[...DEFAULT_REPORTED_DIAGNOSES, 'Otro']} value={diagnosisChoice} onChange={(value) => { setDiagnosisChoice(value ?? ''); if (!value) profileForm.setFieldValue('diagnosis', ''); else if (value !== 'Otro') profileForm.setFieldValue('diagnosis', value); else if (DEFAULT_REPORTED_DIAGNOSES.includes(profileForm.values.diagnosis as typeof DEFAULT_REPORTED_DIAGNOSES[number])) profileForm.setFieldValue('diagnosis', ''); }} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col>{diagnosisChoice === 'Otro' && <Grid.Col span={{ base: 12, md: 6 }}><Autocomplete label="Especificar diagnóstico" placeholder="Escribe o selecciona" data={[...DEFAULT_REPORTED_DIAGNOSES]} {...profileForm.getInputProps('diagnosis')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col>}<Grid.Col span={12}><Textarea label="Motivo de consulta" minRows={3} {...profileForm.getInputProps('consultationReason')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={12}><Divider label="Contexto" labelPosition="left" /></Grid.Col><Grid.Col span={12}><Textarea label="Hogar" {...profileForm.getInputProps('home')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><TextInput label="Escolaridad" {...profileForm.getInputProps('school')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col><Grid.Col span={{ base: 12, md: 6 }}><Textarea label="Adaptaciones" {...profileForm.getInputProps('adaptations')} disabled={!canEdit || saving || pendingCount > 0} /></Grid.Col></Grid><Group justify="flex-end" mt="md"><Button onClick={() => void saveProfile()} loading={saving} disabled={!canEdit}>Guardar ficha</Button></Group></Paper></Tabs.Panel>
      <Tabs.Panel value="family" pt="lg"><Stack><StudentPeoplePanel people={student.people} siblings={student.siblings} canEdit={canEdit && pendingCount === 0 && !conflict} saving={saving} pending={pendingCommands.current.has('people')} onRetry={retryPending} leaveGuard={peopleLeaveGuard} onSave={(people, siblings) => saveProfile({ commandKey: 'people', people, siblings })} /><FamilyManagementPanel clinicId={student.clinicId} studentId={student.id} canManage={student.capabilities.includes('authorization.decide') && pendingCount === 0 && !conflict} leaveGuard={familySharingLeaveGuard}/></Stack></Tabs.Panel>
      <Tabs.Panel value="history" pt="lg"><StudentClinicalHistoryPanel entries={student.history} canEdit={canEditVersioned && pendingCount === 0 && !conflict} saving={saving} onAdd={() => openHistory()} onEdit={openHistory} onRetire={(entry) => void retireHistory(entry)} /></Tabs.Panel>
      <Tabs.Panel value="documents" pt="lg"><StudentDocumentsPanel clinicId={student.clinicId} studentId={student.id} consents={student.consents} canEdit={canEditVersioned && pendingCount === 0 && !conflict} leaveGuard={documentsLeaveGuard} onRefresh={onRefresh} /></Tabs.Panel>
      <Tabs.Panel value="medication" pt="lg"><StudentMedicationPanel medications={medications} canEdit={canEditVersioned && pendingCount === 0} saving={saving} onAdd={() => openMedication()} onEdit={openMedication} onToggle={toggleMedication} /></Tabs.Panel>
      <Tabs.Panel value="programs" pt="lg"><StudentProgramsPanel key={student.clinicId+':'+student.id} clinicId={student.clinicId} studentId={student.id} onGuardChange={onProgramGuardChange}/></Tabs.Panel>
    </Tabs>
    <Modal opened={historyOpened} onClose={() => { if (!commandBusy.current && !pendingCommands.current.size) historyModal.close(); }} title={selectedHistory ? 'Corregir entrada clínica' : 'Agregar entrada clínica'}>
      <Stack>{pendingCount > 0 && <Alert color="yellow">Los datos enviados están bloqueados. Reintenta exactamente el mismo comando.<Button mt="sm" onClick={() => void retryPending()} loading={saving}>Reintentar misma operación</Button></Alert>}
        <Fieldset disabled={saving || pendingCount > 0}><Stack>
          <Select label="Tipo" required data={[{value:'reported_diagnosis',label:'Diagnóstico'},{value:'assessment',label:'Evaluación'},{value:'procedure',label:'Procedimiento'}]} disabled={!!selectedHistory} {...historyForm.getInputProps('kind')} />
          <TextInput label="Descripción" required maxLength={200} {...historyForm.getInputProps('descriptor')} />
          <Textarea label="Notas clínicas" maxLength={2000} minRows={4} {...historyForm.getInputProps('notes')} />
        </Stack></Fieldset>
        <Group justify="flex-end"><Button variant="default" disabled={saving || pendingCount > 0} onClick={historyModal.close}>Cancelar</Button><Button onClick={() => void saveHistory()} loading={saving}>{selectedHistory ? 'Guardar corrección' : 'Guardar entrada'}</Button></Group>
      </Stack>
    </Modal>
    <Modal opened={medicationOpened} onClose={() => { if (!commandBusy.current && !pendingCommands.current.size) medicationModal.close(); }} title={selectedMedication ? 'Corregir o actualizar tratamiento' : 'Agregar medicación'}><Stack>{pendingCount > 0 && <Alert color="yellow">Los datos enviados están bloqueados. Reintenta exactamente el mismo comando.<Button mt="sm" onClick={() => void retryPending()} loading={saving}>Reintentar misma operación</Button></Alert>}<Fieldset disabled={saving || pendingCount > 0}><Stack><TextInput label="Nombre del medicamento" required {...medicationForm.getInputProps('name')} /><Grid><Grid.Col span={6}><TextInput label="Dosis" {...medicationForm.getInputProps('dose')} /></Grid.Col><Grid.Col span={6}><TextInput label="Frecuencia" {...medicationForm.getInputProps('frequency')} /></Grid.Col></Grid><TextInput label="Prescriptor" {...medicationForm.getInputProps('prescriber')} /><TextInput label="Fecha de inicio (AAAA-MM-DD)" {...medicationForm.getInputProps('startedOn')} /><TextInput label="Fecha de término (AAAA-MM-DD)" {...medicationForm.getInputProps('endedOn')} /><Textarea label="Notas" {...medicationForm.getInputProps('notes')} /></Stack></Fieldset><Group justify="space-between"><Button variant="default" disabled={saving || pendingCount > 0} onClick={medicationModal.close}>Cancelar</Button>{selectedMedication ? <Group><Button variant="light" onClick={() => saveMedication('correct')} loading={saving}>Guardar corrección</Button><Button onClick={() => saveMedication('update-treatment')} loading={saving}>Actualizar tratamiento</Button></Group> : <Button onClick={() => saveMedication()} loading={saving}>Guardar</Button>}</Group></Stack></Modal>
  </Stack>;
}
