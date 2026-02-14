import { useState } from 'react';
import {
    Container,
    Title,
    Text,
    Table,
    Badge,
    Button,
    Group,
    Stack,
    Card,
    Avatar,
    Tooltip,
    ActionIcon,
    Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Check, X, Eye, Mail, Calendar } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { MainLayout } from '@/components/MainLayout';
import { supervisorProfile } from '@/api/mockData';
import { mockInvitations, type AccessInvitation } from '@/api/invitationsData';

export default function InvitationsPage() {
    const [supervisor] = useState(supervisorProfile);
    const [invitations, setInvitations] = useState<AccessInvitation[]>(mockInvitations);
    const [selectedInvitation, setSelectedInvitation] = useState<AccessInvitation | null>(null);
    const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
    const [, { open: openEditSupervisor }] = useDisclosure(false);

    const handleApprove = (invitationId: string) => {
        setInvitations((prev) =>
            prev.map((inv) =>
                inv.id === invitationId ? { ...inv, status: 'approved' as const } : inv
            )
        );
        notifications.show({
            title: 'Acceso Aprobado',
            message: 'El profesional ahora tiene acceso a la carpeta del estudiante.',
            color: 'green',
            icon: <Check size={18} />,
        });
    };

    const handleDeny = (invitationId: string) => {
        setInvitations((prev) =>
            prev.map((inv) =>
                inv.id === invitationId ? { ...inv, status: 'denied' as const } : inv
            )
        );
        notifications.show({
            title: 'Acceso Denegado',
            message: 'La solicitud de acceso ha sido rechazada.',
            color: 'red',
            icon: <X size={18} />,
        });
    };

    const handleViewDetails = (invitation: AccessInvitation) => {
        setSelectedInvitation(invitation);
        openDetails();
    };

    const getAccessBadgeColor = (access: string) => {
        switch (access) {
            case 'full':
                return 'blue';
            case 'read-only':
                return 'yellow';
            case 'programs-only':
                return 'violet';
            default:
                return 'gray';
        }
    };

    const getAccessLabel = (access: string) => {
        switch (access) {
            case 'full':
                return 'Acceso Completo';
            case 'read-only':
                return 'Solo Lectura';
            case 'programs-only':
                return 'Solo Programas';
            default:
                return access;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge color="orange">Pendiente</Badge>;
            case 'approved':
                return <Badge color="green">Aprobado</Badge>;
            case 'denied':
                return <Badge color="red">Denegado</Badge>;
            default:
                return <Badge color="gray">{status}</Badge>;
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');
    const processedInvitations = invitations.filter((inv) => inv.status !== 'pending');

    return (
        <MainLayout supervisor={supervisor} onEditProfile={openEditSupervisor}>
            <Container size="xl">
                <Stack gap="xl">
                    {/* Header */}
                    <div>
                        <Title order={2}>Invitaciones de Acceso</Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Gestiona las solicitudes de acceso de profesionales a las carpetas de estudiantes
                        </Text>
                    </div>

                    {/* Pending Invitations */}
                    <Card padding="lg" radius="md" withBorder>
                        <Stack gap="md">
                            <Group justify="space-between">
                                <Title order={4}>Solicitudes Pendientes</Title>
                                <Badge size="lg" variant="filled" color="orange">
                                    {pendingInvitations.length}
                                </Badge>
                            </Group>

                            {pendingInvitations.length === 0 ? (
                                <Text c="dimmed" ta="center" py="xl">
                                    No hay solicitudes pendientes
                                </Text>
                            ) : (
                                <Table.ScrollContainer minWidth={800}>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Profesional</Table.Th>
                                                <Table.Th>Estudiante</Table.Th>
                                                <Table.Th>Tipo de Acceso</Table.Th>
                                                <Table.Th>Fecha Solicitud</Table.Th>
                                                <Table.Th>Acciones</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {pendingInvitations.map((invitation) => (
                                                <Table.Tr key={invitation.id}>
                                                    <Table.Td>
                                                        <Group gap="sm">
                                                            <Avatar color="blue" radius="xl">
                                                                {invitation.professionalName.charAt(0)}
                                                            </Avatar>
                                                            <div>
                                                                <Text size="sm" fw={600}>
                                                                    {invitation.professionalName}
                                                                </Text>
                                                                <Text size="xs" c="dimmed">
                                                                    {invitation.professionalTitle}
                                                                </Text>
                                                            </div>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" fw={500}>
                                                            {invitation.studentName}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            variant="light"
                                                            color={getAccessBadgeColor(invitation.requestedAccess)}
                                                        >
                                                            {getAccessLabel(invitation.requestedAccess)}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs" c="dimmed">
                                                            {formatDate(invitation.requestDate)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Group gap="xs">
                                                            <Tooltip label="Ver detalles">
                                                                <ActionIcon
                                                                    variant="subtle"
                                                                    color="gray"
                                                                    onClick={() => handleViewDetails(invitation)}
                                                                >
                                                                    <Eye size={18} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            <Button
                                                                size="xs"
                                                                color="green"
                                                                leftSection={<Check size={14} />}
                                                                onClick={() => handleApprove(invitation.id)}
                                                            >
                                                                Permitir
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                color="red"
                                                                variant="light"
                                                                leftSection={<X size={14} />}
                                                                onClick={() => handleDeny(invitation.id)}
                                                            >
                                                                Denegar
                                                            </Button>
                                                        </Group>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Table.ScrollContainer>
                            )}
                        </Stack>
                    </Card>

                    {/* Processed Invitations */}
                    {processedInvitations.length > 0 && (
                        <Card padding="lg" radius="md" withBorder>
                            <Stack gap="md">
                                <Title order={4}>Historial de Solicitudes</Title>

                                <Table.ScrollContainer minWidth={800}>
                                    <Table striped>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Profesional</Table.Th>
                                                <Table.Th>Estudiante</Table.Th>
                                                <Table.Th>Tipo de Acceso</Table.Th>
                                                <Table.Th>Estado</Table.Th>
                                                <Table.Th>Fecha</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {processedInvitations.map((invitation) => (
                                                <Table.Tr key={invitation.id}>
                                                    <Table.Td>
                                                        <Group gap="sm">
                                                            <Avatar color="gray" radius="xl" size="sm">
                                                                {invitation.professionalName.charAt(0)}
                                                            </Avatar>
                                                            <div>
                                                                <Text size="sm" fw={500}>
                                                                    {invitation.professionalName}
                                                                </Text>
                                                                <Text size="xs" c="dimmed">
                                                                    {invitation.professionalTitle}
                                                                </Text>
                                                            </div>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm">{invitation.studentName}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            variant="light"
                                                            color={getAccessBadgeColor(invitation.requestedAccess)}
                                                            size="sm"
                                                        >
                                                            {getAccessLabel(invitation.requestedAccess)}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>{getStatusBadge(invitation.status)}</Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs" c="dimmed">
                                                            {formatDate(invitation.requestDate)}
                                                        </Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Table.ScrollContainer>
                            </Stack>
                        </Card>
                    )}
                </Stack>
            </Container>

            {/* Details Modal */}
            <Modal
                opened={detailsOpened}
                onClose={closeDetails}
                title="Detalles de la Solicitud"
                size="lg"
            >
                {selectedInvitation && (
                    <Stack gap="md">
                        <Group>
                            <Avatar color="blue" size="lg" radius="xl">
                                {selectedInvitation.professionalName.charAt(0)}
                            </Avatar>
                            <div>
                                <Text fw={600} size="lg">
                                    {selectedInvitation.professionalName}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {selectedInvitation.professionalTitle}
                                </Text>
                            </div>
                        </Group>

                        <Group gap="xs">
                            <Mail size={16} color="var(--mantine-color-dimmed)" />
                            <Text size="sm">{selectedInvitation.professionalEmail}</Text>
                        </Group>

                        <Group gap="xs">
                            <Calendar size={16} color="var(--mantine-color-dimmed)" />
                            <Text size="sm">{formatDate(selectedInvitation.requestDate)}</Text>
                        </Group>

                        <div>
                            <Text size="sm" fw={600} mb={4}>
                                Estudiante:
                            </Text>
                            <Text size="sm">{selectedInvitation.studentName}</Text>
                        </div>

                        <div>
                            <Text size="sm" fw={600} mb={4}>
                                Tipo de Acceso Solicitado:
                            </Text>
                            <Badge color={getAccessBadgeColor(selectedInvitation.requestedAccess)}>
                                {getAccessLabel(selectedInvitation.requestedAccess)}
                            </Badge>
                        </div>

                        {selectedInvitation.message && (
                            <div>
                                <Text size="sm" fw={600} mb={4}>
                                    Mensaje:
                                </Text>
                                <Card padding="sm" bg="gray.0">
                                    <Text size="sm">{selectedInvitation.message}</Text>
                                </Card>
                            </div>
                        )}

                        {selectedInvitation.status === 'pending' && (
                            <Group justify="flex-end" mt="md">
                                <Button
                                    color="red"
                                    variant="light"
                                    leftSection={<X size={16} />}
                                    onClick={() => {
                                        handleDeny(selectedInvitation.id);
                                        closeDetails();
                                    }}
                                >
                                    Denegar
                                </Button>
                                <Button
                                    color="green"
                                    leftSection={<Check size={16} />}
                                    onClick={() => {
                                        handleApprove(selectedInvitation.id);
                                        closeDetails();
                                    }}
                                >
                                    Permitir Acceso
                                </Button>
                            </Group>
                        )}
                    </Stack>
                )}
            </Modal>
        </MainLayout>
    );
}
