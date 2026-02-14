import { type ReactNode, useState, useEffect, useCallback } from 'react'; // Agregar useState, useEffect
import { useNavigate, useLocation } from 'react-router-dom';
import {
    AppShell,
    Burger,
    Group,
    NavLink,
    Text,
    Avatar,
    Menu,
    ActionIcon,
    Box,
    Select,
    Badge,
    Indicator,
    Popover,
    Stack,
    Button
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
    Home,
    Users,
    FolderOpen,
    FileCheck,
    MessageSquare,
    LogOut,
    Bell,
    Search,
    Edit,
    Building2,
    Stethoscope,
    Baby,
    Check,
    Inbox,
    Sparkles,
    HelpCircle,
    Mail,
    MessageCircle,
    ChevronRight
} from 'lucide-react';
import { type UserProfile } from '@/api/mockData';
import { useRole } from '@/hooks/useRole';
import { type UserRole } from '@/types/authUtils';
import { mockSharedAccess } from '@/api/invitationsData'; // Importar datos mock
import { notifications } from '@mantine/notifications'; // Importar sistema notificaciones
import { UpgradePlanModal } from './UpgradePlanModal'; // Importar Modal

interface MainLayoutProps {
    children: ReactNode;
    supervisor: UserProfile;
    onEditProfile: () => void;
}

export function MainLayout({ children, supervisor, onEditProfile }: MainLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [opened, { toggle }] = useDisclosure();
    const [upgradeModalOpened, { open: openUpgradeModal, close: closeUpgradeModal }] = useDisclosure(false); // Estado del modal
    const { currentRole, setRole, isTherapist } = useRole();
    const [pendingInvitations, setPendingInvitations] = useState<typeof mockSharedAccess>([]);
    const [invitationsPopoverOpened, setInvitationsPopoverOpened] = useState(false);

    // Identidad mock del profesional actual
    const currentProfessionalEmail = 'maria.gonzalez@abaprototipo.com';

    // Cargar invitaciones pendientes
    const refreshInvitations = useCallback(() => {
        if (isTherapist) {
            const pending = mockSharedAccess.filter(
                inv => inv.sharedWith === currentProfessionalEmail && inv.status === 'pending'
            );
            setPendingInvitations(pending);
        } else {
            setPendingInvitations([]);
        }
    }, [isTherapist]);

    useEffect(() => {
        // Ejecutar inicial (asíncrono para evitar warning de setState en mount)
        const timeout = setTimeout(() => refreshInvitations(), 0);

        // Simular polling o actualización cuando cambia mockSharedAccess
        const interval = setInterval(refreshInvitations, 2000);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, [refreshInvitations]);

    const handleAcceptInvitation = (invitationId: string) => {
        const inv = mockSharedAccess.find(i => i.id === invitationId);
        if (inv) {
            inv.status = 'accepted';
            notifications.show({
                title: 'Invitación Aceptada',
                message: `Ahora tienes acceso a la carpeta de ${inv.studentName}`,
                color: 'green'
            });
            refreshInvitations();
        }
    };

    const handleRejectInvitation = (invitationId: string) => {
        const inv = mockSharedAccess.find(i => i.id === invitationId);
        if (inv) {
            inv.status = 'rejected';
            notifications.show({
                title: 'Invitación Rechazada',
                message: 'Has rechazado el acceso a la carpeta',
                color: 'red'
            });
            refreshInvitations();
        }
    };

    const navItems = [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Mi Equipo', path: '/team' },
        { icon: FolderOpen, label: 'Carpetas de Estudiantes', path: '/students' },
        { icon: FileCheck, label: 'Accesos Compartidos', path: '/shared-access', restricted: true },
        { icon: MessageSquare, label: 'Chat', path: '/chat' },
    ];

    const filteredNavItems = navItems.filter(item => !isTherapist || !item.restricted);
    // ... (rest hooks)

    const getRoleIcon = () => {
        if (currentRole === 'admin') return <Building2 size={16} />;
        if (currentRole === 'supervisor') return <FileCheck size={16} />;
        if (currentRole === 'therapist') return <Stethoscope size={16} />;
        return <Baby size={16} />;
    };

    const getRoleColor = () => {
        if (currentRole === 'admin') return 'blue';
        if (currentRole === 'supervisor') return 'indigo';
        if (currentRole === 'therapist') return 'green';
        return 'violet';
    };

    return (
        <AppShell
            header={{ height: 70 }}
            navbar={{
                width: 280,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            {/* Header */}
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    {/* ... (Logo group remains same) ... */}
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Group gap="xs">
                            <Avatar color={getRoleColor()} radius="sm" size="md">
                                {getRoleIcon()}
                            </Avatar>
                            <Box>
                                <Text fw={700} size="lg">
                                    ABA Admin
                                </Text>
                                <Group gap={6}>
                                    <Text size="xs" c="dimmed">
                                        Sistema de Supervisión
                                    </Text>
                                    <Badge size="xs" variant="light" color={getRoleColor()}>
                                        {currentRole === 'admin' ? 'Admin' : currentRole === 'supervisor' ? 'Supervisor' : currentRole === 'therapist' ? 'Aplicador' : 'Familia'}
                                    </Badge>
                                </Group>
                            </Box>
                        </Group>
                    </Group>

                    <Group>
                        {/* Selector de Rol */}
                        <Select
                            placeholder="Cambiar Vista"
                            value={currentRole}
                            onChange={(value) => setRole(value as UserRole)}
                            data={[
                                { value: 'admin', label: '🏥 Admin' },
                                { value: 'supervisor', label: '📋 Supervisor' },
                                { value: 'therapist', label: '🧑‍⚕️ Aplicador' },
                                { value: 'family', label: '👨‍👩‍👧 Familia', disabled: true },
                            ]}
                            allowDeselect={false}
                            w={200}
                            disabled={false}
                        />

                        <ActionIcon variant="subtle" color="gray" size="lg">
                            <Search size={18} />
                        </ActionIcon>

                        {/* Sistema de Notificaciones */}
                        <Popover
                            width={320}
                            position="bottom-end"
                            withArrow
                            shadow="md"
                            opened={invitationsPopoverOpened}
                            onChange={setInvitationsPopoverOpened}
                        >
                            <Popover.Target>
                                <Indicator inline label={pendingInvitations.length} size={16} disabled={pendingInvitations.length === 0} color="red">
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size="lg"
                                        onClick={() => setInvitationsPopoverOpened((o) => !o)}
                                    >
                                        <Bell size={18} />
                                    </ActionIcon>
                                </Indicator>
                            </Popover.Target>
                            <Popover.Dropdown p={0}>
                                <Box p="xs" bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                                    <Text size="sm" fw={600}>Notificaciones</Text>
                                </Box>

                                {pendingInvitations.length === 0 ? (
                                    <Stack align="center" py="xl" gap="xs">
                                        <Inbox size={32} color="var(--mantine-color-gray-4)" />
                                        <Text size="sm" c="dimmed">No tienes notificaciones nuevas</Text>
                                    </Stack>
                                ) : (
                                    <Box style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {pendingInvitations.map((inv) => (
                                            <Box key={inv.id} p="md" style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
                                                <Group align="flex-start" wrap="nowrap" mb="xs">
                                                    <Avatar color="blue" size="sm" radius="xl">{inv.sharedBy.charAt(0)}</Avatar>
                                                    <div>
                                                        <Text size="sm">
                                                            <strong>Admin</strong> te invita a colaborar en la carpeta de <strong>{inv.studentName}</strong>
                                                        </Text>
                                                        <Text size="xs" c="dimmed" mt={2}>{inv.message || 'Sin mensaje adjunto'}</Text>
                                                        <Badge size="xs" mt={4} variant="dot">{inv.accessLevel}</Badge>
                                                    </div>
                                                </Group>
                                                <Group grow gap="xs">
                                                    <Button
                                                        size="xs"
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={() => handleRejectInvitation(inv.id)}
                                                    >
                                                        Rechazar
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="light"
                                                        color="blue"
                                                        leftSection={<Check size={12} />}
                                                        onClick={() => handleAcceptInvitation(inv.id)}
                                                    >
                                                        Aceptar
                                                    </Button>
                                                </Group>
                                            </Box>
                                        ))}
                                    </Box>
                                )}
                            </Popover.Dropdown>
                        </Popover>

                        <Menu shadow="md" width={220}>
                            <Menu.Target>
                                <Group gap="xs" style={{ cursor: 'pointer' }}>
                                    <Avatar src={supervisor.avatar} radius="xl" size="md" />
                                    <Box visibleFrom="sm">
                                        <Text size="sm" fw={500}>
                                            {supervisor.name}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {supervisor.profession}
                                        </Text>
                                    </Box>
                                </Group>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item leftSection={<Edit size={16} />} onClick={onEditProfile}>
                                    Editar Perfil
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    leftSection={<LogOut size={16} />}
                                    color="red"
                                    onClick={() => navigate('/login')}
                                >
                                    Cerrar Sesión
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            {/* Sidebar */}
            <AppShell.Navbar p="md">
                <AppShell.Section grow>
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <NavLink
                                key={item.path}
                                label={item.label}
                                leftSection={<Icon size={18} />}
                                active={isActive}
                                onClick={() => navigate(item.path)}
                                mb="xs"
                            />
                        );
                    })}
                </AppShell.Section>

                {/* Supervisor Profile Footer & Actions */}
                <AppShell.Section>
                    <Stack gap="xs" p="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
                        {/* Perfil */}
                        <Box>
                            <Group gap="sm" mb={4}>
                                <Avatar src={supervisor.avatar} size="md" radius="md" />
                                <Box style={{ flex: 1 }}>
                                    <Text size="sm" fw={600} lineClamp={1}>
                                        {supervisor.name}
                                    </Text>
                                    <Text size="xs" c="dimmed" lineClamp={1}>
                                        {supervisor.title}
                                    </Text>
                                </Box>
                            </Group>
                            <Text size="xs" c="dimmed" lineClamp={2} mb="sm">
                                {supervisor.description}
                            </Text>
                        </Box>

                        {/* Upgrade Plan */}
                        <Button
                            fullWidth
                            variant="gradient"
                            gradient={{ from: 'blue', to: 'cyan' }}
                            size="xs"
                            leftSection={<Sparkles size={14} />}
                            onClick={openUpgradeModal}
                        >
                            Upgrade de plan
                        </Button>

                        {/* Soporte Dropdown */}
                        <Menu position="right-end" shadow="md" width={200}>
                            <Menu.Target>
                                <Button
                                    fullWidth
                                    variant="subtle"
                                    color="gray"
                                    size="xs"
                                    justify="space-between"
                                    leftSection={<HelpCircle size={14} />}
                                    rightSection={<ChevronRight size={14} style={{ opacity: 0.5 }} />}
                                >
                                    Soporte
                                </Button>
                            </Menu.Target>

                            <Menu.Dropdown>
                                <Menu.Label>Ayuda y Contacto</Menu.Label>
                                <Menu.Item leftSection={<HelpCircle size={14} />}>
                                    Ayuda
                                </Menu.Item>
                                <Menu.Item leftSection={<Mail size={14} />}>
                                    Contacto
                                </Menu.Item>
                                <Menu.Item leftSection={<MessageCircle size={14} />}>
                                    Chat en vivo
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Stack>
                </AppShell.Section>
            </AppShell.Navbar>

            {/* Main Content */}
            <AppShell.Main>{children}</AppShell.Main>

            <UpgradePlanModal opened={upgradeModalOpened} onClose={closeUpgradeModal} />
        </AppShell>
    );
}
