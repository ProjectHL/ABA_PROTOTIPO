import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Text, Button, Stack } from '@mantine/core';
import { ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/MainLayout';
import { StudentsList, StudentDetail, type CreateStudentData } from '@/features/students';
import { supervisorProfile, studentsData, type StudentProfile } from '@/api/mockData';
import { notifications } from '@mantine/notifications';

export default function StudentsPage() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [students, setStudents] = useState<StudentProfile[]>(studentsData);

    const selectedStudent = studentId ? students.find((s) => s.id === studentId) : null;

    const handleUpdateStudent = async (data: Partial<StudentProfile>) => {
        try {
            // Aquí iría la llamada a la API
            // await api.updateStudent(studentId, data);

            setStudents(
                students.map((student) =>
                    student.id === studentId ? { ...student, ...data } : student
                )
            );

            notifications.show({
                title: 'Estudiante actualizado',
                message: 'Los cambios se guardaron correctamente',
                color: 'green',
            });
        } catch (_error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo actualizar el estudiante',
                color: 'red',
            });
        }
    };

    const handleCreateStudent = (data: CreateStudentData) => {
        const newStudent: StudentProfile = {
            id: `std-new-${Date.now()}`,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.fullName.replace(/\s+/g, '')}`,
            fullName: data.fullName,
            identityNumber: data.identityNumber,
            dateOfBirth: data.dateOfBirth.toISOString().split('T')[0],
            age: new Date().getFullYear() - data.dateOfBirth.getFullYear(),
            diagnosis: data.diagnosis,
            consultationReason: 'Nuevo Ingreso',
            hasActiveSession: false,
            familyAccessEnabled: false,
            registrationDate: new Date().toISOString().split('T')[0],
            familyMembers: [],
            medications: [],
            legalDocuments: []
        };

        setStudents([...students, newStudent]);

        notifications.show({
            title: 'Carpeta Creada',
            message: 'Estudiante registrado exitosamente',
            color: 'green'
        });
    };

    return (
        <MainLayout supervisor={supervisorProfile} onEditProfile={() => { }}>
            <Container size="xl">
                <Stack gap="xl">
                    {/* Header */}
                    {selectedStudent ? (
                        <div>
                            <Button
                                variant="subtle"
                                leftSection={<ArrowLeft size={16} />}
                                onClick={() => navigate('/students')}
                                mb="md"
                            >
                                Volver a la lista
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <Title order={2}>Carpetas de Estudiantes</Title>
                            <Text c="dimmed" size="sm">
                                Gestiona la información clínica y familiar de tus estudiantes
                            </Text>
                        </div>
                    )}

                    {/* Content */}
                    {selectedStudent ? (
                        <StudentDetail student={selectedStudent} onUpdate={handleUpdateStudent} />
                    ) : (
                        <StudentsList students={students} onCreateStudent={handleCreateStudent} />
                    )}
                </Stack>
            </Container>
        </MainLayout>
    );
}
