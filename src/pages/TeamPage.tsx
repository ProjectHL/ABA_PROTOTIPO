import { useState } from 'react';
import { Container, Title, Text, Modal, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { MainLayout } from '@/components/MainLayout';
import { TeamManagement } from '@/features/team/TeamManagement';
import { ProfileSettings } from '@/features/team/ProfileSettings';
import { supervisorProfile, therapistsData, type UserProfile } from '@/api/mockData';
import { notifications } from '@mantine/notifications';

export default function TeamPage() {
    const [supervisor, setSupervisor] = useState(supervisorProfile);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>(therapistsData);
    const [editSupervisorOpened, { open: openEditSupervisor, close: closeEditSupervisor }] = useDisclosure(false);

    // Función para actualizar el perfil del supervisor
    const handleUpdateSupervisor = async (values: Partial<UserProfile>) => {
        try {
            // Aquí iría la llamada a la API
            // await api.updateProfile(supervisor.id, values);

            setSupervisor({ ...supervisor, ...values });
            closeEditSupervisor();

            notifications.show({
                title: 'Perfil actualizado',
                message: 'Los cambios se guardaron correctamente',
                color: 'green',
            });
        } catch (_error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo actualizar el perfil',
                color: 'red',
            });
        }
    };

    // Función para actualizar miembros del equipo
    const handleUpdateMember = async (id: string, values: Partial<UserProfile>) => {
        try {
            // Aquí iría la llamada a la API
            // await api.updateTeamMember(id, values);

            setTeamMembers(
                teamMembers.map((member) =>
                    member.id === id ? { ...member, ...values } : member
                )
            );

            notifications.show({
                title: 'Miembro actualizado',
                message: 'Los cambios se guardaron correctamente',
                color: 'green',
            });
        } catch (_error) {
            notifications.show({
                title: 'Error',
                message: 'No se pudo actualizar el miembro',
                color: 'red',
            });
        }
    };

    return (
        <MainLayout supervisor={supervisor} onEditProfile={openEditSupervisor}>
            <Container size="xl">
                <Stack gap="xl">
                    {/* Header */}
                    <div>
                        <Title order={2}>Gestión de Equipo Terapéutico</Title>
                        <Text c="dimmed" size="sm">
                            Administra los perfiles de tu equipo y supervisa su desempeño
                        </Text>
                    </div>

                    {/* Team Management Component */}
                    <TeamManagement
                        members={teamMembers}
                        onUpdateMember={handleUpdateMember}
                    />
                </Stack>
            </Container>

            {/* Modal para editar perfil del supervisor */}
            <Modal
                opened={editSupervisorOpened}
                onClose={closeEditSupervisor}
                title={<Text fw={600} size="lg">Editar Mi Perfil</Text>}
                size="lg"
            >
                <ProfileSettings
                    profile={supervisor}
                    onSave={handleUpdateSupervisor}
                />
            </Modal>
        </MainLayout>
    );
}
