import { Modal, Select, Textarea, Button, Stack, Group, Text } from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { Mail, Lock, MessageSquare } from 'lucide-react';
import { mockSharedAccess } from '../../api/invitationsData';
import { therapistsData } from '@/api/mockData';

interface ShareStudentModalProps {
    opened: boolean;
    onClose: () => void;
    studentId: string;
    studentName: string;
    onShare: (email: string, accessLevel: string, message?: string) => void;
}

const ShareStudentModal = ({ opened, onClose, studentId, studentName, onShare }: ShareStudentModalProps) => {
    const [email, setEmail] = useState('');
    const [accessLevel, setAccessLevel] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<{ email?: string; accessLevel?: string }>({});

    // Mapear terapeutas para el Select
    const professionalOptions = therapistsData.map(therapist => ({
        value: therapist.email,
        label: `${therapist.name} - ${therapist.profession}`,
    }));

    const messageTemplates = [
        'Solicito tu colaboración para la evaluación inicial del estudiante.',
        'Necesito tu apoyo profesional en el seguimiento del caso.',
        'Te comparto acceso para coordinación interdisciplinaria.',
        'Requiero tu evaluación especializada para el plan de intervención.',
        'Comparto acceso para revisión de programas educativos.',
    ];

    const accessLevelOptions = [
        { value: 'full', label: '🔵 Acceso Completo - Ver y editar todo' },
        { value: 'read-only', label: '🟡 Solo Lectura - Ver sin editar' },
        { value: 'programs-only', label: '🟣 Solo Programas - Acceso limitado a programas' },
    ];

    // Validar email
    const validateEmail = (val: string): boolean => {
        if (!val || val.trim() === '') {
            setErrors(prev => ({ ...prev, email: 'El profesional es requerido' }));
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
            setErrors(prev => ({ ...prev, email: 'El formato del email no es válido' }));
            return false;
        }

        // Verificar duplicados
        const existing = mockSharedAccess.find(
            inv => inv.sharedWith.toLowerCase() === val.toLowerCase() && inv.studentId === studentId
        );

        if (existing) {
            if (existing.status === 'pending') {
                const errorMsg = 'Ya existe una invitación pendiente para este profesional';
                setErrors(prev => ({ ...prev, email: errorMsg }));
                notifications.show({
                    title: 'Invitación Duplicada',
                    message: errorMsg,
                    color: 'yellow',
                    autoClose: false,
                });
                return false;
            }

            if (existing.status === 'accepted') {
                const errorMsg = 'Este profesional ya tiene acceso a esta carpeta';
                setErrors(prev => ({ ...prev, email: errorMsg }));
                notifications.show({
                    title: 'Acceso Existente',
                    message: errorMsg,
                    color: 'yellow',
                    autoClose: false,
                });
                return false;
            }

            if (existing.status === 'rejected') {
                setErrors(prev => ({
                    ...prev,
                    email: 'Este profesional rechazó previamente. Use el botón "Reenviar" en la tabla de invitaciones.'
                }));
                return false;
            }
        }

        setErrors(prev => ({ ...prev, email: undefined }));
        return true;
    };

    // Validar nivel de acceso
    const validateAccessLevel = (): boolean => {
        if (!accessLevel) {
            setErrors(prev => ({ ...prev, accessLevel: 'Debe seleccionar un nivel de acceso' }));
            return false;
        }
        setErrors(prev => ({ ...prev, accessLevel: undefined }));
        return true;
    };

    // Limpiar formulario al cerrar
    const handleClose = () => {
        setEmail('');
        setAccessLevel(null);
        setMessage('');
        setErrors({});
        onClose();
    };

    // Manejar envío
    const handleSubmit = () => {
        const isEmailValid = validateEmail(email);
        const isAccessLevelValid = validateAccessLevel();

        if (!isEmailValid || !isAccessLevelValid) {
            return;
        }

        // Llamar callback
        onShare(email, accessLevel!, message || undefined);

        // Mostrar notificación de éxito
        notifications.show({
            title: 'Invitación Enviada',
            message: `Invitación enviada a ${email}`,
            color: 'green',
            autoClose: false,
        });

        // Limpiar y cerrar
        handleClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={`Compartir Carpeta de ${studentName}`}
            size="lg"
        >
            <Stack gap="md">
                {/* Selector de Profesional */}
                <Select
                    label="Seleccionar Profesional"
                    placeholder="Buscar por nombre o cargo"
                    leftSection={<Mail size={16} />}
                    data={professionalOptions}
                    value={email}
                    onChange={(value) => {
                        setEmail(value || '');
                        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    onBlur={() => validateEmail(email)}
                    error={errors.email}
                    searchable
                    clearable
                    nothingFoundMessage="No se encontraron profesionales"
                    required
                />

                {/* Nivel de Acceso */}
                <Select
                    label="Nivel de Acceso"
                    placeholder="Seleccione un nivel"
                    leftSection={<Lock size={16} />}
                    data={accessLevelOptions}
                    value={accessLevel}
                    onChange={(value) => {
                        setAccessLevel(value);
                        if (errors.accessLevel) setErrors(prev => ({ ...prev, accessLevel: undefined }));
                    }}
                    error={errors.accessLevel}
                    required
                />

                {/* Mensaje con Plantillas */}
                <div>
                    <Textarea
                        label="Mensaje (opcional)"
                        placeholder="Escribe un mensaje personalizado o selecciona una plantilla..."
                        leftSection={<MessageSquare size={16} />}
                        value={message}
                        onChange={(e) => setMessage(e.currentTarget.value)}
                        minRows={3}
                        maxRows={5}
                        maxLength={500}
                    />
                    <Text size="xs" c="dimmed" mt={4}>
                        {message.length}/500 caracteres
                    </Text>

                    {/* Plantillas Sugeridas */}
                    <Text size="sm" fw={500} mt="md" mb="xs">
                        Plantillas sugeridas:
                    </Text>
                    <Stack gap="xs">
                        {messageTemplates.map((template, index) => (
                            <Button
                                key={index}
                                variant="light"
                                size="xs"
                                onClick={() => setMessage(template)}
                                fullWidth
                                styles={{
                                    root: { justifyContent: 'flex-start', height: 'auto', padding: '8px 12px' },
                                    label: { whiteSpace: 'normal', textAlign: 'left' },
                                }}
                            >
                                {template}
                            </Button>
                        ))}
                    </Stack>
                </div>

                {/* Botones */}
                <Group justify="flex-end" mt="md">
                    <Button variant="subtle" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit}>
                        Enviar Invitación
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
};

export default ShareStudentModal;
