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
    Tabs,
    Accordion,
    Avatar,
    Tooltip,
    ActionIcon,
    Modal,
    Select,
    TextInput
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Eye, X, RotateCcw, Settings, Trash2, Send, Share2, FolderOpen } from 'lucide-react';
import { notifications } from '@mantine/notifications';
import { MainLayout } from '@/components/MainLayout';
import { supervisorProfile, studentsData as mockStudents, type StudentProfile } from '@/api/mockData';
import { mockSharedAccess, type SharedAccess } from '@/api/invitationsData';
import ShareStudentModal from '@/features/students/ShareStudentModal';

export default function SharedAccessPage() {
    const [supervisor] = useState(supervisorProfile);
    const [sharedAccess, setSharedAccess] = useState<SharedAccess[]>(mockSharedAccess);
    const [selectedAccess, setSelectedAccess] = useState<SharedAccess | null>(null);

    // Estado para compartir desde lista de estudiantes
    const [shareModalOpened, { open: openShareModal, close: closeShareModal }] = useDisclosure(false);
    const [studentToShare, setStudentToShare] = useState<StudentProfile | null>(null);

    // Modales
    const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
    const [changeAccessOpened, { open: openChangeAccess, close: closeChangeAccess }] = useDisclosure(false);
    const [revokeOpened, { open: openRevoke, close: closeRevoke }] = useDisclosure(false);
    const [, { open: openEditSupervisor }] = useDisclosure(false);

    // Estado para cambiar nivel de acceso
    const [newAccessLevel, setNewAccessLevel] = useState<string | null>(null);

    // ==================== HANDLERS ====================

    const handleOpenShare = (student: StudentProfile) => {
        setStudentToShare(student);
        openShareModal();
    };

    const handleShareSubmit = (email: string, accessLevel: string, message?: string) => {
        if (!studentToShare) return;

        const newInvitation: SharedAccess = {
            id: `inv-${Date.now()}`,
            sharedBy: supervisor.id,
            sharedWith: email,
            studentId: studentToShare.id,
            studentName: studentToShare.fullName,
            professionalName: undefined,
            professionalTitle: undefined,
            sharedDate: new Date().toISOString(),
            accessLevel: accessLevel as 'full' | 'read-only' | 'programs-only',
            status: 'pending',
            message,
        };

        setSharedAccess((prev) => [newInvitation, ...prev]);

        // También actualizamos el mock global para consistencia
        mockSharedAccess.unshift(newInvitation);
    };

    const handleCancel = (accessId: string) => {
        setSharedAccess((prev) => prev.filter((acc) => acc.id !== accessId));
        notifications.show({
            title: 'Invitación Cancelada',
            message: 'La invitación ha sido eliminada',
            color: 'orange',
            autoClose: false,
        });
    };

    const handleResend = (access: SharedAccess) => {
        // Crear nueva invitación (nuevo ID)
        const newInvitation: SharedAccess = {
            ...access,
            id: `inv-${Date.now()}`,
            sharedDate: new Date().toISOString(),
            status: 'pending',
        };

        setSharedAccess((prev) => [newInvitation, ...prev]);

        notifications.show({
            title: 'Invitación Reenviada',
            message: `Nueva invitación enviada a ${access.sharedWith}`,
            color: 'blue',
            autoClose: false,
        });
    };

    const handleViewDetails = (access: SharedAccess) => {
        setSelectedAccess(access);
        openDetails();
    };

    const handleOpenChangeAccess = (access: SharedAccess) => {
        setSelectedAccess(access);
        setNewAccessLevel(access.accessLevel);
        openChangeAccess();
    };

    const handleSaveAccessLevel = () => {
        if (!selectedAccess || !newAccessLevel) return;

        setSharedAccess((prev) =>
            prev.map((acc) =>
                acc.id === selectedAccess.id
                    ? { ...acc, accessLevel: newAccessLevel as 'full' | 'read-only' | 'programs-only' }
                    : acc
            )
        );

        notifications.show({
            title: 'Nivel de Acceso Actualizado',
            message: 'El nivel de acceso ha sido modificado correctamente',
            color: 'green',
            autoClose: false,
        });

        closeChangeAccess();
    };

    const handleOpenRevoke = (access: SharedAccess) => {
        setSelectedAccess(access);
        openRevoke();
    };

    const handleConfirmRevoke = () => {
        if (!selectedAccess) return;

        setSharedAccess((prev) => prev.filter((acc) => acc.id !== selectedAccess.id));

        notifications.show({
            title: 'Acceso Removido Satisfactoriamente',
            message: `El acceso de ${selectedAccess.professionalName || selectedAccess.sharedWith} ha sido revocado`,
            color: 'red',
            autoClose: false,
        });

        closeRevoke();
    };

    // ==================== HELPERS ====================

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
            case 'accepted':
                return <Badge color="green">Aceptada</Badge>;
            case 'rejected':
                return <Badge color="red">Rechazada</Badge>;
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
        });
    };

    // ==================== FILTROS ====================

    const allInvitations = sharedAccess;
    const activeAccess = sharedAccess.filter((acc) => acc.status === 'accepted');

    // Agrupar accesos activos por estudiante
    const groupedByStudent = activeAccess.reduce((acc, access) => {
        if (!acc[access.studentId]) {
            acc[access.studentId] = {
                studentName: access.studentName,
                accesses: [],
            };
        }
        acc[access.studentId].accesses.push(access);
        return acc;
    }, {} as Record<string, { studentName: string; accesses: SharedAccess[] }>);

    // ==================== RENDER ====================

    return (
        <MainLayout supervisor={supervisor} onEditProfile={openEditSupervisor}>
            <Container size="xl">
                <Stack gap="xl">
                    {/* Header */}
                    <div>
                        <Title order={2}>Accesos Compartidos</Title>
                        <Text c="dimmed" size="sm" mt={4}>
                            Gestiona las invitaciones enviadas, accesos activos y comparte nuevas carpetas
                        </Text>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="share" variant="pills">
                        <Tabs.List>
                            <Tabs.Tab value="share" leftSection={<FolderOpen size={16} />}>
                                Repertorio General
                            </Tabs.Tab>
                            <Tabs.Tab value="sent" leftSection={<Send size={16} />}>
                                Invitaciones Enviadas
                                <Badge ml="xs" size="sm" variant="filled">
                                    {allInvitations.length}
                                </Badge>
                            </Tabs.Tab>
                            <Tabs.Tab value="active" leftSection={<Settings size={16} />}>
                                Accesos Activos
                                <Badge ml="xs" size="sm" variant="filled" color="green">
                                    {activeAccess.length}
                                </Badge>
                            </Tabs.Tab>
                        </Tabs.List>

                        {/* TAB 1: Repertorio General (Lista de Estudiantes) */}
                        <Tabs.Panel value="share" pt="lg">
                            <Table.ScrollContainer minWidth={800}>
                                <Table striped highlightOnHover verticalSpacing="sm">
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Estudiantes</Table.Th>
                                            <Table.Th>Diagnóstico / Edad</Table.Th>
                                            <Table.Th>Estado de Sesión</Table.Th>
                                            <Table.Th>Acciones</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {mockStudents.map((student) => (
                                            <Table.Tr key={student.id}>
                                                <Table.Td>
                                                    <Group gap="sm">
                                                        <Avatar src={student.avatar} radius="xl" size="sm" />
                                                        <Text size="sm" fw={500}>
                                                            {student.fullName}
                                                        </Text>
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Stack gap={2}>
                                                        <Text size="sm">
                                                            {student.diagnosis}
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            {student.age} años • RUT: {student.identityNumber}
                                                        </Text>
                                                    </Stack>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Badge
                                                        variant="light"
                                                        color={student.hasActiveSession ? 'green' : 'gray'}
                                                        size="sm"
                                                    >
                                                        {student.hasActiveSession ? 'Activa' : 'Inactiva'}
                                                    </Badge>
                                                </Table.Td>
                                                <Table.Td>
                                                    <Button
                                                        leftSection={<Share2 size={16} />}
                                                        variant="light"
                                                        size="xs"
                                                        onClick={() => handleOpenShare(student)}
                                                    >
                                                        Compartir
                                                    </Button>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Table.ScrollContainer>
                        </Tabs.Panel>

                        {/* TAB 2: Invitaciones Enviadas */}
                        <Tabs.Panel value="sent" pt="lg">
                            {allInvitations.length === 0 ? (
                                <Text c="dimmed" ta="center" py="xl">
                                    No hay invitaciones enviadas
                                </Text>
                            ) : (
                                <Table.ScrollContainer minWidth={800}>
                                    <Table striped highlightOnHover>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Profesional</Table.Th>
                                                <Table.Th>Estudiante</Table.Th>
                                                <Table.Th>Tipo de Acceso</Table.Th>
                                                <Table.Th>Estado</Table.Th>
                                                <Table.Th>Fecha de Envío</Table.Th>
                                                <Table.Th>Acciones</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {allInvitations.map((access) => (
                                                <Table.Tr key={access.id}>
                                                    <Table.Td>
                                                        <Group gap="sm">
                                                            <Avatar color="blue" radius="xl" size="sm">
                                                                {access.professionalName?.charAt(0) || access.sharedWith.charAt(0).toUpperCase()}
                                                            </Avatar>
                                                            <div>
                                                                <Text size="sm" fw={500}>
                                                                    {access.professionalName || access.sharedWith}
                                                                </Text>
                                                                {access.professionalTitle && (
                                                                    <Text size="xs" c="dimmed">
                                                                        {access.professionalTitle}
                                                                    </Text>
                                                                )}
                                                            </div>
                                                        </Group>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" fw={500}>
                                                            {access.studentName}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            variant="light"
                                                            color={getAccessBadgeColor(access.accessLevel)}
                                                        >
                                                            {getAccessLabel(access.accessLevel)}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>{getStatusBadge(access.status)}</Table.Td>
                                                    <Table.Td>
                                                        <Text size="xs" c="dimmed">
                                                            {formatDate(access.sharedDate)}
                                                        </Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Group gap="xs">
                                                            <Tooltip label="Ver detalles">
                                                                <ActionIcon
                                                                    variant="subtle"
                                                                    color="gray"
                                                                    onClick={() => handleViewDetails(access)}
                                                                >
                                                                    <Eye size={18} />
                                                                </ActionIcon>
                                                            </Tooltip>
                                                            {access.status === 'pending' && (
                                                                <Tooltip label="Cancelar invitación">
                                                                    <ActionIcon
                                                                        variant="subtle"
                                                                        color="red"
                                                                        onClick={() => handleCancel(access.id)}
                                                                    >
                                                                        <X size={18} />
                                                                    </ActionIcon>
                                                                </Tooltip>
                                                            )}
                                                            {access.status === 'rejected' && (
                                                                <Tooltip label="Reenviar invitación">
                                                                    <ActionIcon
                                                                        variant="subtle"
                                                                        color="blue"
                                                                        onClick={() => handleResend(access)}
                                                                    >
                                                                        <RotateCcw size={18} />
                                                                    </ActionIcon>
                                                                </Tooltip>
                                                            )}
                                                        </Group>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Table.ScrollContainer>
                            )}
                        </Tabs.Panel>

                        {/* TAB 2: Accesos Activos (Agrupados por Estudiante) */}
                        <Tabs.Panel value="active" pt="lg">
                            {activeAccess.length === 0 ? (
                                <Text c="dimmed" ta="center" py="xl">
                                    No hay accesos activos
                                </Text>
                            ) : (
                                <Accordion variant="separated">
                                    {Object.entries(groupedByStudent).map(([studentId, { studentName, accesses }]) => (
                                        <Accordion.Item key={studentId} value={studentId}>
                                            <Accordion.Control>
                                                <Group justify="space-between" pr="md">
                                                    <Text fw={600}>{studentName}</Text>
                                                    <Badge size="lg" variant="filled" color="green">
                                                        {accesses.length} {accesses.length === 1 ? 'profesional' : 'profesionales'}
                                                    </Badge>
                                                </Group>
                                            </Accordion.Control>
                                            <Accordion.Panel>
                                                <Table striped>
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>Profesional</Table.Th>
                                                            <Table.Th>Tipo de Acceso</Table.Th>
                                                            <Table.Th>Fecha de Aceptación</Table.Th>
                                                            <Table.Th>Acciones</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {accesses.map((access) => (
                                                            <Table.Tr key={access.id}>
                                                                <Table.Td>
                                                                    <Group gap="sm">
                                                                        <Avatar color="green" radius="xl" size="sm">
                                                                            {access.professionalName?.charAt(0) || access.sharedWith.charAt(0).toUpperCase()}
                                                                        </Avatar>
                                                                        <div>
                                                                            <Text size="sm" fw={500}>
                                                                                {access.professionalName || access.sharedWith}
                                                                            </Text>
                                                                            {access.professionalTitle && (
                                                                                <Text size="xs" c="dimmed">
                                                                                    {access.professionalTitle}
                                                                                </Text>
                                                                            )}
                                                                        </div>
                                                                    </Group>
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    <Badge
                                                                        variant="light"
                                                                        color={getAccessBadgeColor(access.accessLevel)}
                                                                    >
                                                                        {getAccessLabel(access.accessLevel)}
                                                                    </Badge>
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    <Text size="xs" c="dimmed">
                                                                        {formatDate(access.sharedDate)}
                                                                    </Text>
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    <Group gap="xs">
                                                                        <Tooltip label="Cambiar nivel de acceso">
                                                                            <ActionIcon
                                                                                variant="subtle"
                                                                                color="blue"
                                                                                onClick={() => handleOpenChangeAccess(access)}
                                                                            >
                                                                                <Settings size={18} />
                                                                            </ActionIcon>
                                                                        </Tooltip>
                                                                        <Tooltip label="Revocar acceso">
                                                                            <ActionIcon
                                                                                variant="subtle"
                                                                                color="red"
                                                                                onClick={() => handleOpenRevoke(access)}
                                                                            >
                                                                                <Trash2 size={18} />
                                                                            </ActionIcon>
                                                                        </Tooltip>
                                                                    </Group>
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}
                                                    </Table.Tbody>
                                                </Table>
                                            </Accordion.Panel>
                                        </Accordion.Item>
                                    ))}
                                </Accordion>
                            )}
                        </Tabs.Panel>
                    </Tabs>
                </Stack>
            </Container>

            {/* Modal: Ver Detalles */}
            <Modal
                opened={detailsOpened}
                onClose={closeDetails}
                title="Detalles de la Invitación"
                size="md"
            >
                {selectedAccess && (
                    <Stack gap="md">
                        <Group>
                            <Avatar color="blue" size="lg" radius="xl">
                                {selectedAccess.professionalName?.charAt(0) || selectedAccess.sharedWith.charAt(0).toUpperCase()}
                            </Avatar>
                            <div>
                                <Text fw={600} size="lg">
                                    {selectedAccess.professionalName || 'Profesional no registrado'}
                                </Text>
                                <Text size="sm" c="dimmed">
                                    {selectedAccess.professionalTitle || selectedAccess.sharedWith}
                                </Text>
                            </div>
                        </Group>

                        <TextInput
                            label="Email"
                            value={selectedAccess.sharedWith}
                            readOnly
                        />

                        <TextInput
                            label="Estudiante"
                            value={selectedAccess.studentName}
                            readOnly
                        />

                        <div>
                            <Text size="sm" fw={600} mb={4}>
                                Tipo de Acceso:
                            </Text>
                            <Badge color={getAccessBadgeColor(selectedAccess.accessLevel)} size="lg">
                                {getAccessLabel(selectedAccess.accessLevel)}
                            </Badge>
                        </div>

                        <div>
                            <Text size="sm" fw={600} mb={4}>
                                Estado:
                            </Text>
                            {getStatusBadge(selectedAccess.status)}
                        </div>

                        <TextInput
                            label="Fecha de Envío"
                            value={formatDate(selectedAccess.sharedDate)}
                            readOnly
                        />

                        {selectedAccess.message && (
                            <div>
                                <Text size="sm" fw={600} mb={4}>
                                    Mensaje:
                                </Text>
                                <Text size="sm" p="sm" bg="gray.0" style={{ borderRadius: '4px' }}>
                                    {selectedAccess.message}
                                </Text>
                            </div>
                        )}
                    </Stack>
                )}
            </Modal>

            {/* Modal: Cambiar Nivel de Acceso */}
            <Modal
                opened={changeAccessOpened}
                onClose={closeChangeAccess}
                title="Cambiar Nivel de Acceso"
                size="md"
            >
                {selectedAccess && (
                    <Stack gap="md">
                        <Text size="sm">
                            Modificar el nivel de acceso de <strong>{selectedAccess.professionalName || selectedAccess.sharedWith}</strong> a <strong>{selectedAccess.studentName}</strong>
                        </Text>

                        <div>
                            <Text size="sm" fw={600} mb="xs">
                                Nivel Actual:
                            </Text>
                            <Badge color={getAccessBadgeColor(selectedAccess.accessLevel)} size="lg">
                                {getAccessLabel(selectedAccess.accessLevel)}
                            </Badge>
                        </div>

                        <Select
                            label="Nuevo Nivel de Acceso"
                            placeholder="Seleccione un nivel"
                            data={[
                                { value: 'full', label: '🔵 Acceso Completo - Ver y editar todo' },
                                { value: 'read-only', label: '🟡 Solo Lectura - Ver sin editar' },
                                { value: 'programs-only', label: '🟣 Solo Programas - Acceso limitado a programas' },
                            ]}
                            value={newAccessLevel}
                            onChange={setNewAccessLevel}
                            required
                        />

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={closeChangeAccess}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveAccessLevel} disabled={!newAccessLevel}>
                                Guardar Cambios
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Modal: Confirmar Revocar Acceso */}
            <Modal
                opened={revokeOpened}
                onClose={closeRevoke}
                title="Revocar Acceso"
                size="md"
            >
                {selectedAccess && (
                    <Stack gap="md">
                        <Text size="sm">
                            ¿Estás seguro de revocar el acceso de <strong>{selectedAccess.professionalName || selectedAccess.sharedWith}</strong> a <strong>{selectedAccess.studentName}</strong>?
                        </Text>

                        <Text size="sm" c="red" fw={600}>
                            ⚠️ Esta acción no se puede deshacer
                        </Text>

                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={closeRevoke}>
                                Cancelar
                            </Button>
                            <Button color="red" onClick={handleConfirmRevoke}>
                                Revocar Acceso
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
            {/* Modal de Compartir Nuevo (Tab Repertorio) */}
            {studentToShare && (
                <ShareStudentModal
                    opened={shareModalOpened}
                    onClose={closeShareModal}
                    studentId={studentToShare.id}
                    studentName={studentToShare.fullName}
                    onShare={handleShareSubmit}
                />
            )}
        </MainLayout>
    );
}
