import { useState } from 'react';
import {
    SimpleGrid,
    Card,
    Avatar,
    Text,
    Badge,
    Button,
    Group,
    Stack,
    TextInput,
    Select,
    ActionIcon,
    Modal
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Search, Edit, Mail, Calendar } from 'lucide-react';
import { type UserProfile } from '@/api/mockData';
import { ProfileSettings } from './ProfileSettings';

interface TeamManagementProps {
    members: UserProfile[];
    onUpdateMember: (id: string, data: Partial<UserProfile>) => Promise<void>;
}

export function TeamManagement({ members, onUpdateMember }: TeamManagementProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
    const [editModalOpened, { open: openEditModal, close: closeEditModal }] = useDisclosure(false);

    // Filtrado de miembros
    const filteredMembers = members.filter((member) => {
        const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.profession.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = !roleFilter || member.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleEditClick = (member: UserProfile) => {
        setSelectedMember(member);
        openEditModal();
    };

    const handleSave = async (values: Partial<UserProfile>) => {
        if (selectedMember) {
            await onUpdateMember(selectedMember.id, values);
            closeEditModal();
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'supervisor':
                return 'blue';
            case 'therapist':
                return 'green';
            default:
                return 'gray';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'supervisor':
                return 'Supervisor';
            case 'therapist':
                return 'Terapeuta';
            default:
                return role;
        }
    };

    return (
        <Stack gap="lg">
            {/* Filtros */}
            <Group grow>
                <TextInput
                    placeholder="Buscar por nombre o profesión..."
                    leftSection={<Search size={16} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                />
                <Select
                    placeholder="Filtrar por rol"
                    clearable
                    data={[
                        { value: 'supervisor', label: 'Supervisor' },
                        { value: 'therapist', label: 'Terapeuta' },
                    ]}
                    value={roleFilter}
                    onChange={setRoleFilter}
                />
            </Group>

            {/* Grid de Miembros */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {filteredMembers.map((member) => (
                    <Card key={member.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Card.Section withBorder inheritPadding py="xs">
                            <Group justify="space-between">
                                <Badge variant="light" color={getRoleBadgeColor(member.role)}>
                                    {getRoleLabel(member.role)}
                                </Badge>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    onClick={() => handleEditClick(member)}
                                >
                                    <Edit size={16} />
                                </ActionIcon>
                            </Group>
                        </Card.Section>

                        <Stack gap="md" mt="md">
                            <Group>
                                <Avatar src={member.avatar} size={80} radius="md" />
                                <div style={{ flex: 1 }}>
                                    <Text fw={600} size="lg">{member.name}</Text>
                                    <Badge size="sm" variant="outline" color="blue">
                                        {member.profession}
                                    </Badge>
                                    <Text size="sm" c="dimmed" mt={4}>{member.title}</Text>
                                </div>
                            </Group>

                            <Text size="sm" c="dimmed" lineClamp={3}>
                                {member.description}
                            </Text>

                            <Stack gap="xs">
                                <Group gap="xs">
                                    <Mail size={14} color="var(--mantine-color-dimmed)" />
                                    <Text size="xs" c="dimmed">{member.email}</Text>
                                </Group>
                                {member.phone && (
                                    <Group gap="xs">
                                        <Calendar size={14} color="var(--mantine-color-dimmed)" />
                                        <Text size="xs" c="dimmed">{member.phone}</Text>
                                    </Group>
                                )}
                            </Stack>

                            <Button
                                variant="light"
                                fullWidth
                                mt="xs"
                                onClick={() => handleEditClick(member)}
                            >
                                Editar Perfil
                            </Button>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Modal de Edición */}
            <Modal
                opened={editModalOpened}
                onClose={closeEditModal}
                title={<Text fw={600} size="lg">Editar Perfil del Miembro</Text>}
                size="lg"
            >
                {selectedMember && (
                    <ProfileSettings
                        profile={selectedMember}
                        onSave={handleSave}
                    />
                )}
            </Modal>
        </Stack>
    );
}
