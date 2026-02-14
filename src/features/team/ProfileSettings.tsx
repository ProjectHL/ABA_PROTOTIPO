import { useState } from 'react';
import { TextInput, Textarea, Button, Stack, Group, Avatar, FileButton, Text, Modal } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { Upload, UserCircle } from 'lucide-react';
import { type UserProfile } from '@/api/mockData';
import { AvatarSelector } from '@/components/AvatarSelector';

interface ProfileSettingsProps {
    profile: UserProfile;
    onSave: (values: Partial<UserProfile>) => Promise<void>;
}

export function ProfileSettings({ profile, onSave }: ProfileSettingsProps) {
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar);
    const [avatarModalOpened, { open: openAvatarModal, close: closeAvatarModal }] = useDisclosure(false);

    const form = useForm({
        initialValues: {
            name: profile.name,
            profession: profile.profession,
            title: profile.title,
            description: profile.description,
            email: profile.email,
            phone: profile.phone || '',
            avatar: profile.avatar // Incluimos avatar en el formulario
        },
        validate: {
            name: (value) => (value.length < 3 ? 'El nombre debe tener al menos 3 caracteres' : null),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
            profession: (value) => (value.length < 2 ? 'La profesión es requerida' : null),
        },
    });

    const handleAvatarSelect = (url: string) => {
        setAvatarUrl(url);
        form.setFieldValue('avatar', url);
        closeAvatarModal();
    };

    const handleFileUpload = (file: File | null) => {
        if (file) {
            // En un caso real, aquí subiríamos el archivo y obtendríamos la URL
            // Simulamos convirtiendo a local URL
            const localUrl = URL.createObjectURL(file);
            setAvatarUrl(localUrl);
            form.setFieldValue('avatar', localUrl);
        }
    };

    const handleSubmit = async (values: typeof form.values) => {
        try {
            await onSave(values);
        } catch (error) {
            console.error('Error saving profile:', error);
        }
    };

    return (
        <>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="lg">
                    {/* Avatar Section */}
                    <Group align="center" gap="lg">
                        <Avatar src={avatarUrl} size={100} radius="md" />
                        <div>
                            <Text size="sm" fw={500} mb="xs">Foto de Perfil</Text>
                            <Group gap="xs">
                                <FileButton onChange={handleFileUpload} accept="image/png,image/jpeg">
                                    {(props) => (
                                        <Button {...props} variant="default" size="xs" leftSection={<Upload size={14} />}>
                                            Subir Foto
                                        </Button>
                                    )}
                                </FileButton>
                                <Button
                                    variant="light"
                                    size="xs"
                                    leftSection={<UserCircle size={14} />}
                                    onClick={openAvatarModal}
                                >
                                    Elegir Avatar
                                </Button>
                            </Group>
                            <Text size="xs" c="dimmed" mt={4}>
                                JPG, PNG o selecciona un avatar predefinido
                            </Text>
                        </div>
                    </Group>

                    {/* Form Fields */}
                    <TextInput
                        label="Nombre Completo"
                        placeholder="Ej: Dr. Juan Pérez"
                        required
                        {...form.getInputProps('name')}
                    />

                    <Group grow>
                        <TextInput
                            label="Profesión"
                            placeholder="Ej: BCBA, RBT"
                            required
                            {...form.getInputProps('profession')}
                        />
                        <TextInput
                            label="Título"
                            placeholder="Ej: Supervisor Clínico"
                            required
                            {...form.getInputProps('title')}
                        />
                    </Group>

                    <Textarea
                        label="Descripción Profesional"
                        placeholder="Breve descripción de tu experiencia y especialización..."
                        minRows={4}
                        {...form.getInputProps('description')}
                    />

                    <Group grow>
                        <TextInput
                            label="Email"
                            placeholder="email@ejemplo.com"
                            type="email"
                            required
                            {...form.getInputProps('email')}
                        />
                        <TextInput
                            label="Teléfono"
                            placeholder="+56 9 1234 5678"
                            {...form.getInputProps('phone')}
                        />
                    </Group>

                    {/* Submit Button */}
                    <Group justify="flex-end" mt="md">
                        <Button
                            type="submit"
                            size="md"
                            loading={form.isSubmitting}
                        >
                            Guardar Cambios
                        </Button>
                    </Group>
                </Stack>
            </form>

            {/* Modal Selector de Avatar */}
            <Modal opened={avatarModalOpened} onClose={closeAvatarModal} title="Elige tu avatar" centered>
                <AvatarSelector currentAvatar={avatarUrl} onSelect={handleAvatarSelect} />
            </Modal>
        </>
    );
}
