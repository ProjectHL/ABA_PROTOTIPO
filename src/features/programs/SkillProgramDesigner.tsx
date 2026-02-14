import { useState } from 'react';
import {
    Modal,
    Stack,
    TextInput,
    Textarea,
    Button,
    Group,
    ActionIcon,
    Text,
    Card,
    Stepper,
    Paper,
    Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Plus, Trash, Download, X, Save } from 'lucide-react';
import { type SkillAcquisitionProgram, type ProgramStep, type ProgramSet } from '@/api/programsData';

interface SkillProgramDesignerProps {
    program?: SkillAcquisitionProgram;
    opened: boolean;
    onClose: () => void;
    onSave: (data: Partial<SkillAcquisitionProgram>) => Promise<void>;
}

export function SkillProgramDesigner({ program, opened, onClose, onSave }: SkillProgramDesignerProps) {
    const [steps, setSteps] = useState<ProgramStep[]>(program?.steps || []);
    const [sets, setSets] = useState<ProgramSet[]>(program?.sets || []);

    const form = useForm({
        initialValues: {
            name: program?.name || '',
            objective: program?.objective || '',
            antecedent: program?.antecedent || '',
            procedure: program?.procedure || '',
            prompts: program?.prompts || '',
            errorCorrection: program?.errorCorrection || '',
            masteryCriteria: program?.masteryCriteria || '',
            generalization: program?.generalization || '',
        },
        validate: {
            name: (value) => (value.length < 3 ? 'El nombre debe tener al menos 3 caracteres' : null),
            objective: (value) => (value.length < 10 ? 'El objetivo debe ser más descriptivo' : null),
        },
    });

    const handleAddStep = () => {
        const newStep: ProgramStep = { id: `step-${Date.now()}`, order: steps.length + 1, description: '' };
        setSteps([...steps, newStep]);
    };

    const handleRemoveStep = (id: string) => {
        setSteps(steps.filter((step) => step.id !== id).map((step, index) => ({ ...step, order: index + 1 })));
    };

    const handleUpdateStep = (id: string, description: string) => {
        setSteps(steps.map((step) => (step.id === id ? { ...step, description } : step)));
    };

    const handleAddSet = () => {
        const newSet: ProgramSet = { id: `set-${Date.now()}`, name: '', items: [] };
        setSets([...sets, newSet]);
    };

    const handleRemoveSet = (id: string) => {
        setSets(sets.filter((set) => set.id !== id));
    };

    const handleUpdateSetName = (id: string, name: string) => {
        setSets(sets.map((set) => (set.id === id ? { ...set, name } : set)));
    };

    const handleAddSetItem = (setId: string) => {
        setSets(sets.map((set) => set.id === setId ? { ...set, items: [...set.items, ''] } : set));
    };

    const handleUpdateSetItem = (setId: string, itemIndex: number, value: string) => {
        setSets(sets.map((set) => set.id === setId ? { ...set, items: set.items.map((item, index) => (index === itemIndex ? value : item)) } : set));
    };

    const handleRemoveSetItem = (setId: string, itemIndex: number) => {
        setSets(sets.map((set) => set.id === setId ? { ...set, items: set.items.filter((_, index) => index !== itemIndex) } : set));
    };

    const handleSubmit = async (values: typeof form.values) => {
        await onSave({ ...values, steps, sets });
        onClose();
    };

    const handleDownloadPDF = () => {
        alert('Funcionalidad de descarga PDF en desarrollo');
    };

    return (
        <Modal.Root opened={opened} onClose={onClose} size="xl" centered>
            <Modal.Overlay />
            <Modal.Content style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                {/* Modal Header - Sticky */}
                <Modal.Header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                    <Modal.Title style={{ fontSize: '1.25rem', fontWeight: 700 }}>Diseño de Programa</Modal.Title>
                    <Modal.CloseButton />
                </Modal.Header>

                {/* Modal Body - Scrollable */}
                <Modal.Body style={{ flex: 1, overflowY: 'auto' }}>
                    <form id="program-form" onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="lg">
                            {/* Campos Básicos */}
                            <TextInput
                                label="Nombre del Programa"
                                placeholder="Ej: Contacto Visual"
                                required
                                withAsterisk
                                {...form.getInputProps('name')}
                            />

                            <Textarea
                                label="Objetivo"
                                placeholder="Describe el objetivo..."
                                minRows={3}
                                autosize
                                required
                                {...form.getInputProps('objective')}
                            />

                            <Textarea
                                label="Antecedente"
                                placeholder="Estímulo previo..."
                                minRows={2}
                                autosize
                                {...form.getInputProps('antecedent')}
                            />

                            {/* Pasos */}
                            <Box>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500}>Pasos</Text>
                                    <Button variant="light" size="xs" leftSection={<Plus size={14} />} onClick={handleAddStep}>
                                        Agregar Paso
                                    </Button>
                                </Group>
                                {steps.length > 0 ? (
                                    <Stepper active={steps.length} orientation="vertical" size="sm">
                                        {steps.map((step) => (
                                            <Stepper.Step
                                                key={step.id}
                                                label={`Paso ${step.order}`}
                                                description={
                                                    <Group gap="xs" align="flex-start" wrap="nowrap" mt={4}>
                                                        <Textarea
                                                            value={step.description}
                                                            onChange={(e) => handleUpdateStep(step.id, e.currentTarget.value)}
                                                            style={{ flex: 1 }}
                                                            autosize
                                                            minRows={1}
                                                        />
                                                        <ActionIcon color="red" variant="subtle" onClick={() => handleRemoveStep(step.id)}>
                                                            <Trash size={16} />
                                                        </ActionIcon>
                                                    </Group>
                                                }
                                            />
                                        ))}
                                    </Stepper>
                                ) : (
                                    <Paper p="md" withBorder ta="center" bg="gray.0">
                                        <Text c="dimmed" size="sm">No hay pasos definidos</Text>
                                    </Paper>
                                )}
                            </Box>

                            {/* Sets */}
                            <Box>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500}>Sets de Estímulos</Text>
                                    <Button variant="light" size="xs" leftSection={<Plus size={14} />} onClick={handleAddSet}>
                                        Agregar Set
                                    </Button>
                                </Group>
                                <Stack gap="md">
                                    {sets.map((set) => (
                                        <Card key={set.id} withBorder p="sm" radius="md">
                                            <Group justify="space-between" mb="xs">
                                                <TextInput
                                                    placeholder="Nombre Set (ej: Set A)"
                                                    value={set.name}
                                                    onChange={(e) => handleUpdateSetName(set.id, e.currentTarget.value)}
                                                    style={{ flex: 1, fontWeight: 600 }}
                                                    variant="unstyled"
                                                />
                                                <ActionIcon color="red" variant="subtle" size="sm" onClick={() => handleRemoveSet(set.id)}>
                                                    <Trash size={14} />
                                                </ActionIcon>
                                            </Group>
                                            <Stack gap="xs" pl="sm" style={{ borderLeft: '2px solid var(--mantine-color-blue-1)' }}>
                                                {set.items.map((item, index) => (
                                                    <Group key={index} gap="xs" wrap="nowrap">
                                                        <Text size="xs" c="dimmed" w={15} ta="right">{index + 1}.</Text>
                                                        <TextInput
                                                            size="sm"
                                                            value={item}
                                                            onChange={(e) => handleUpdateSetItem(set.id, index, e.currentTarget.value)}
                                                            style={{ flex: 1 }}
                                                        />
                                                        <ActionIcon color="red" variant="subtle" size="xs" onClick={() => handleRemoveSetItem(set.id, index)}>
                                                            <X size={14} />
                                                        </ActionIcon>
                                                    </Group>
                                                ))}
                                                <Button variant="subtle" size="xs" onClick={() => handleAddSetItem(set.id)} leftSection={<Plus size={12} />}>
                                                    Agregar Ítem
                                                </Button>
                                            </Stack>
                                        </Card>
                                    ))}
                                    {sets.length === 0 && (
                                        <Paper p="md" withBorder ta="center" bg="gray.0">
                                            <Text c="dimmed" size="sm">No hay sets definidos</Text>
                                        </Paper>
                                    )}
                                </Stack>
                            </Box>

                            {/* Detalles Técnicos */}
                            <Textarea label="Procedimiento Detallado" minRows={3} autosize {...form.getInputProps('procedure')} />
                            <Textarea label="Ayudas y Desvanecimiento" minRows={2} autosize {...form.getInputProps('prompts')} />
                            <Textarea label="Corrección de Error" minRows={2} autosize {...form.getInputProps('errorCorrection')} />
                            <Textarea label="Criterio de Logro y Avance" minRows={2} autosize {...form.getInputProps('masteryCriteria')} />
                            <Textarea label="Generalización y Mantención" minRows={2} autosize {...form.getInputProps('generalization')} />
                        </Stack>
                    </form>
                </Modal.Body>

                {/* Modal Footer - Sticky */}
                <Box
                    style={{
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 10,
                        borderTop: '1px solid var(--mantine-color-gray-3)',
                        backgroundColor: 'var(--mantine-color-gray-0)',
                        padding: 'var(--mantine-spacing-md)'
                    }}
                >
                    <Group justify="space-between">
                        <Button variant="subtle" size="sm" leftSection={<Download size={16} />} onClick={handleDownloadPDF}>
                            Descargar PDF
                        </Button>
                        <Group>
                            <Button variant="default" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" form="program-form" leftSection={<Save size={16} />}>Guardar Programa</Button>
                        </Group>
                    </Group>
                </Box>
            </Modal.Content>
        </Modal.Root>
    );
}
