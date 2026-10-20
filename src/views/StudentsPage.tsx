'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from '@/lib/navigation';
import { Alert, Autocomplete, Button, Container, Fieldset, Group, Loader, Modal, Select, Stack, Text, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { StudentDetail, StudentsList, type StudentProfile } from '@/features/students';
import { getAuthorizedStudent, listAuthorizedStudents, saveStudentV2 } from '@/modules/students/student.server';
import { DEFAULT_REPORTED_DIAGNOSES, mapStudentDetail, mapStudentSummary } from '@/features/students/student.types';
import { useIdentity } from '@/context/IdentityContext';
import { studentCommandV2Schema } from '@/domain/students/student-v2';

/** Official original route, now fed exclusively by the authorized student boundary. */
export default function StudentsPage() {
  const { studentId } = useParams();
  const { identity } = useIdentity();
  return <StudentsWorkspace key={`${identity?.userId ?? ''}:${identity?.active?.id ?? ''}:${studentId ?? 'list'}`}/>;
}

function StudentsWorkspace() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { identity, loading: identityLoading, error: identityError } = useIdentity();
  const clinicId = identity?.active?.id ?? null;
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [detail, setDetail] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpened, createModal] = useDisclosure(false);
  const createCommandRef = useRef<unknown>(null);
  const creatingRef = useRef(false);
  const detailLeaveGuard = useRef<(() => boolean) | null>(null);
  const createForm = useForm({
    initialValues: { fullName: '', initials: '', clinicalId: '', birthDate: '', diagnosis: '', customDiagnosis: '' },
    validate: {
      diagnosis: (value) => value ? null : 'Selecciona un diagnóstico o la opción Otro.',
      customDiagnosis: (value, values) => values.diagnosis === 'Otro' && value.trim().length < 2 ? 'Especifica el diagnóstico reportado.' : null,
    },
  });

  const selectedSummary = useMemo(() => studentId ? students.find((student) => student.id === studentId) ?? null : null, [studentId, students]);
  const existingDiagnoses = useMemo(() => [...new Set(students.map((student) => student.diagnosis).filter((value): value is string => !!value))], [students]);
  const diagnosisOptions = useMemo(() => [...new Set([...DEFAULT_REPORTED_DIAGNOSES, ...existingDiagnoses, 'Otro'])], [existingDiagnoses]);

  const refreshList = async () => {
    if (!clinicId) return;
    const rows = await listAuthorizedStudents(clinicId);
    setStudents(rows.map(mapStudentSummary));
  };

  const refreshDetail = async () => {
    if (!clinicId || !studentId) return;
    const row = await getAuthorizedStudent(studentId, clinicId);
    setDetail(row ? mapStudentDetail(row) : null);
  };

  const createStudent = async () => {
    if (!clinicId || creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    try {
      const values = createForm.values;
      const reportedDiagnosis = values.diagnosis === 'Otro' ? values.customDiagnosis.trim() : values.diagnosis;
      const command = studentCommandV2Schema.parse(createCommandRef.current ?? {
        schemaVersion: 2 as const, operationId: crypto.randomUUID(), idempotencyKey: crypto.randomUUID(), studentId: crypto.randomUUID(), expectedVersion: 0,
        action: 'create' as const, statusConfirmation: false,
        payload: { schemaVersion: 2 as const, clinicalId: values.clinicalId, fullName: values.fullName, initials: values.initials, rut: null, photoAttachmentId: null, birthDate: values.birthDate, primaryLanguage: 'No informado', livingArrangement: '', reportedDiagnosis, consultationReason: '', context: { home: '', school: '', adaptations: '' }, people: [], siblings: [] },
      });
      createCommandRef.current = command;
      const result = await saveStudentV2({ clinicId, command });
      if (result.status !== 'acknowledged') {
        createCommandRef.current = null;
        notifications.show({ title: 'Ficha sin confirmar', color: 'yellow', message: result.message });
        return;
      }
      notifications.show({ title: 'Ficha creada', color: 'green', message: result.replayed ? 'Se recuperó el recibo de la operación previa.' : 'El servidor confirmó la nueva ficha.' });
      createCommandRef.current = null; createModal.close(); createForm.reset();
      try { await refreshList(); }
      catch { notifications.show({ title: 'Ficha creada; lista sin actualizar', color: 'yellow', message: 'El alta ya fue confirmada. Abriremos su ficha; no repitas la creación.' }); }
      navigate(`/students/${command.studentId}`);
    } catch (cause) {
      notifications.show({ title: 'No se creó la ficha', color: 'red', message: cause instanceof Error ? cause.message : 'Resultado desconocido; conserva los datos e intenta con la misma operación si estaban disponibles.' });
    } finally { creatingRef.current = false; setCreating(false); }
  };

  const leaveNow = () => {
    if (detailLeaveGuard.current && !detailLeaveGuard.current()) return false;
    if (creatingRef.current || createCommandRef.current) {
      notifications.show({ title: 'Ficha pendiente', color: 'yellow', message: 'Reintenta la operación pendiente antes de cambiar de clínica, salir o navegar.' });
      return false;
    }
    return !createOpened || window.confirm('¿Descartar el formulario de nueva ficha?');
  };
  const leave = async () => leaveNow();
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (createOpened || creatingRef.current || createCommandRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [createOpened]);

  useEffect(() => {
    let live = true;
    if (identityLoading) return () => { live = false; };
    if (!clinicId) { setStudents([]); setDetail(null); setLoading(false); setError(identityError ?? 'Selecciona una clínica autorizada.'); return () => { live = false; }; }
    setLoading(true); setError(null);
    void refreshList().catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : 'No fue posible consultar las fichas autorizadas.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  // The clinic is captured by the identity provider; refreshList is intentionally recreated per render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, identityLoading, identityError]);

  useEffect(() => {
    let live = true;
    if (!studentId || !clinicId) { setDetail(null); return () => { live = false; }; }
    setLoading(true); setError(null);
    void refreshDetail().catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : 'No fue posible cargar la ficha autorizada.'); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, clinicId]);

  return (
    <MainLayout slots={{ beforeNavigate: leave, beforeNativeNavigate: leaveNow, beforeClinicChange: leave, beforeSignOut: leave }}>
      <Container size="xl">
        <Stack gap="xl">
          {studentId ? (
            <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={async () => { if (await leave()) navigate('/students'); }} w="fit-content">Volver a la lista</Button>
          ) : (
            <div><Title order={2}>Carpetas de Estudiantes</Title><Text c="dimmed" size="sm">Gestiona las fichas clínicas autorizadas para tu clínica activa.</Text></div>
          )}
          {loading && <Stack align="center" py="xl"><Loader /><Text c="dimmed">Cargando fichas autorizadas…</Text></Stack>}
          {error && <Alert icon={<AlertCircle size={16} />} title="No se pudieron cargar las fichas" color="red">{error}</Alert>}
          {!loading && !error && studentId && detail && <StudentDetail key={detail.id} student={detail} leaveGuard={detailLeaveGuard} onRefresh={async () => { await refreshList(); await refreshDetail(); }} />}
          {!loading && !error && !studentId && <StudentsList students={students} onCreate={identity?.active && identity.active.role !== 'therapist' ? createModal.open : undefined} />}
          {!loading && !error && studentId && !detail && <Alert color="yellow" title="Carpeta no disponible">No existe o no tienes acceso vigente a esta carpeta.</Alert>}
          {!loading && !error && studentId && !selectedSummary && detail && <Alert color="blue" title="Ficha cargada">La ficha fue abierta directamente y sigue sujeta a autorización vigente.</Alert>}
        </Stack>
      </Container>
      <Modal opened={createOpened} onClose={() => { if (!creating && !createCommandRef.current) createModal.close(); }} closeOnClickOutside={false} closeOnEscape={!creating&&!createCommandRef.current} withCloseButton={!creating&&!createCommandRef.current} title="Nueva ficha clínica">
        <form onSubmit={createForm.onSubmit(createStudent)}>
          <Stack>
            {createCommandRef.current !== null && <Alert color="yellow">Resultado pendiente. Reintenta la misma operación antes de cerrar; los datos enviados se conservan.</Alert>}
            <Fieldset disabled={creating||!!createCommandRef.current}><Stack>
            <TextInput label="Nombre completo" required {...createForm.getInputProps('fullName')} />
            <TextInput label="Iniciales clínicas" required maxLength={12} {...createForm.getInputProps('initials')} />
            <TextInput label="Identificador clínico" required maxLength={64} {...createForm.getInputProps('clinicalId')} />
            <TextInput label="Fecha de nacimiento (AAAA-MM-DD)" required placeholder="2020-01-31" {...createForm.getInputProps('birthDate')} />
            <Select label="Diagnóstico inicial reportado" required searchable data={diagnosisOptions} {...createForm.getInputProps('diagnosis')} />
            {createForm.values.diagnosis === 'Otro' && <Autocomplete label="Especificar diagnóstico" required data={existingDiagnoses} {...createForm.getInputProps('customDiagnosis')} />}
            </Stack></Fieldset>
            <Group justify="flex-end"><Button variant="default" disabled={creating||!!createCommandRef.current} onClick={createModal.close}>Cancelar</Button><Button type="submit" loading={creating}>{createCommandRef.current?'Reintentar misma ficha':'Crear ficha'}</Button></Group>
          </Stack>
        </form>
      </Modal>
    </MainLayout>
  );
}
