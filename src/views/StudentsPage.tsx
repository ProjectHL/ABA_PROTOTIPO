'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from '@/lib/navigation';
import { Alert, Button, Container, Loader, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { StudentDetail, StudentsList, type StudentProfile } from '@/features/students';
import { listStudents } from '@/features/students/students.repository';
import { supervisorProfile } from '@/api/mockData';

export default function StudentsPage({
    initialStudents,
}: {
    initialStudents?: StudentProfile[];
}) {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [students, setStudents] = useState<StudentProfile[]>(initialStudents ?? []);
    const [loading, setLoading] = useState(initialStudents === undefined);
    const [error, setError] = useState<string | null>(null);

    const selectedStudent = useMemo(
        () => studentId ? students.find((student) => student.id === studentId) ?? null : null,
        [studentId, students],
    );

    useEffect(() => {
        if (initialStudents !== undefined) return;

        let active = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await listStudents();
                if (active) setStudents(result);
            } catch (loadError) {
                if (active) setError(loadError instanceof Error ? loadError.message : 'No fue posible consultar las carpetas autorizadas.');
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => { active = false; };
    }, [initialStudents]);

    const explainWriteBlock = async () => {
        notifications.show({
            title: 'Edición aún no disponible',
            message: 'SDD-02 no define el contrato de escritura clínica. No se guardó ningún cambio.',
            color: 'yellow',
        });
    };

    return (
        <MainLayout supervisor={supervisorProfile} onEditProfile={() => {}}>
            <Container size="xl">
                <Stack gap="xl">
                    {selectedStudent ? (
                        <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/students')} w="fit-content">
                            Volver a la lista
                        </Button>
                    ) : (
                        <div>
                            <Title order={2}>Carpetas de Estudiantes</Title>
                            <Text c="dimmed" size="sm">Consulta las carpetas a las que tu membresía tiene acceso.</Text>
                        </div>
                    )}

                    {loading && <Stack align="center" py="xl"><Loader /><Text c="dimmed">Cargando carpetas autorizadas…</Text></Stack>}
                    {error && <Alert icon={<AlertCircle size={16} />} title="No se pudieron cargar las carpetas" color="red">{error}</Alert>}
                    {!loading && !error && selectedStudent && <StudentDetail student={selectedStudent} onUpdate={explainWriteBlock} />}
                    {!loading && !error && !selectedStudent && <StudentsList students={students} />}
                    {!loading && !error && studentId && !selectedStudent && (
                        <Alert color="yellow" title="Carpeta no disponible">No existe o no tienes acceso a esta carpeta.</Alert>
                    )}
                </Stack>
            </Container>
        </MainLayout>
    );
}
