import {
    Modal,
    Stack,
    TextInput,
    Textarea,
    Button,
    Group,
    MultiSelect,
    Box
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Download, Save } from 'lucide-react';
import { type BehaviorManagementProgram, type BehaviorFunction } from '@/api/programsData';

interface BehaviorProgramDesignerProps {
    program?: BehaviorManagementProgram;
    opened: boolean;
    onClose: () => void;
    onSave: (data: Partial<BehaviorManagementProgram>) => Promise<void>;
}

export function BehaviorProgramDesigner({ program, opened, onClose, onSave }: BehaviorProgramDesignerProps) {
    const form = useForm({
        initialValues: {
            name: program?.name || '',
            topography: program?.topography || '',
            operationalDefinition: program?.operationalDefinition || '',
            currentDimension: program?.currentDimension || '',
            precursorBehaviors: program?.precursorBehaviors || '',
            functions: program?.functions || [],
            replacementBehavior: program?.replacementBehavior || '',
            procedure: program?.procedure || '',
            masteryCriteria: program?.masteryCriteria || '',
            crisisPlan: program?.crisisPlan || '',
        },
        validate: {
            name: (value) => (value.length < 3 ? 'El nombre debe tener al menos 3 caracteres' : null),
            topography: (value) => (value.length < 10 ? 'La topografía debe ser más descriptiva' : null),
            operationalDefinition: (value) =>
                value.length < 20 ? 'La definición operacional debe ser más específica' : null,
            functions: (value) => (value.length === 0 ? 'Selecciona al menos una función' : null),
        },
    });

    const behaviorFunctions: { value: BehaviorFunction; label: string }[] = [
        { value: 'attention', label: 'Atención: La conducta está mantenida por acceso a atención de otra(s) persona(s)' },
        { value: 'escape', label: 'Escape: La conducta está mantenida por escapar de situaciones aversivas, como demandas' },
        { value: 'sensory', label: 'Automática/sensorial: La conducta está mantenida por estimulación sensorial' },
        { value: 'tangible', label: 'Tangible: La conducta está mantenida por acceso a tangibles (no es socialmente mediado)' },
    ];

    const handleSubmit = async (values: typeof form.values) => {
        await onSave(values);
        onClose();
    };

    const handleDownloadPDF = () => {
        // Simulación de descarga
        alert('Funcionalidad de descarga PDF en desarrollo');
    };

    return (
        <Modal.Root
            opened={opened}
            onClose={onClose}
            size="xl"
            centered
        >
            <Modal.Overlay />
            <Modal.Content style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', maxWidth: '120vw' }}>
                {/* Modal Header - Sticky */}
                <Modal.Header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                    <Modal.Title style={{ fontSize: '1.25rem', fontWeight: 700 }}>Diseño de Programa - Manejo de Conducta</Modal.Title>
                    <Modal.CloseButton />
                </Modal.Header>

                {/* Modal Body - Scrollable */}
                <Modal.Body style={{ flex: 1, overflowY: 'auto' }}>
                    <form id="behavior-program-form" onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="lg">
                            {/* Información Básica */}
                            <TextInput
                                label="Nombre del Programa"
                                placeholder="Ej: Reducción de Rabietas"
                                required
                                withAsterisk
                                {...form.getInputProps('name')}
                            />

                            {/* Descripción de la Conducta */}
                            <Textarea
                                label="Topografía"
                                description="Describe la forma física de la conducta (qué se ve)"
                                placeholder="Ej: Gritos, llanto intenso, tirarse al suelo, golpear superficies..."
                                minRows={3}
                                autosize
                                required
                                {...form.getInputProps('topography')}
                            />

                            <Textarea
                                label="Definición Operacional"
                                description="Define la conducta de manera objetiva y medible"
                                placeholder="Ej: Cualquier episodio de llanto intenso (volumen superior a conversación normal) acompañado de al menos uno de los siguientes: gritos, tirarse al suelo, o golpear superficies, que dure más de 10 segundos continuos."
                                minRows={4}
                                autosize
                                required
                                {...form.getInputProps('operationalDefinition')}
                            />

                            <Textarea
                                label="Dimensión Actual de la Conducta"
                                description="Describe la línea base actual de la conducta (frecuencia, duración, intensidad, etc.)"
                                placeholder="Ej: Gritos: duración promedio de 30 minutos por episodio. Golpear la cabeza: frecuencia promedio de 5 golpes durante 1 hora"
                                minRows={2}
                                autosize
                                {...form.getInputProps('currentDimension')}
                            />

                            <Textarea
                                label="Conductas Precursoras"
                                description="Las conductas precursoras son las conductas que ocurren justo antes de una conducta escale. Por ejemplo, fruncir el ceño; morder el dedo; etc."
                                placeholder="Ej: Fruncir el ceño, morder el dedo, respiración agitada..."
                                minRows={2}
                                autosize
                                {...form.getInputProps('precursorBehaviors')}
                            />

                            {/* Análisis Funcional */}
                            <MultiSelect
                                label="Funciones de la Conducta"
                                description="Selecciona las funciones identificadas mediante análisis funcional"
                                placeholder="Selecciona una o más funciones"
                                data={behaviorFunctions}
                                required
                                {...form.getInputProps('functions')}
                            />

                            {/* Conducta de Reemplazo */}
                            <Textarea
                                label="Conducta de Reemplazo"
                                description="La conducta de reemplazo es la conducta a enseñar que sea funcionalmente equivalente a la conducta a disminuir y socialmente significativa"
                                placeholder="Ej: Pedir ayuda verbalmente o mediante comunicación alternativa cuando se enfrenta a una tarea difícil..."
                                minRows={3}
                                autosize
                                {...form.getInputProps('replacementBehavior')}
                            />

                            {/* Procedimiento de Intervención */}
                            <Textarea
                                label="Procedimiento Detallado"
                                description="Describe el plan de intervención basado en las funciones identificadas"
                                placeholder="Incluye estrategias de prevención y reacción de la conducta"
                                minRows={6}
                                autosize
                                {...form.getInputProps('procedure')}
                            />

                            {/* Criterio de Logro */}
                            <Textarea
                                label="Criterio de Logro"
                                description="Define los criterios específicos para considerar que el programa ha sido exitoso"
                                placeholder="Ej: Gritos: Duración de menos de 1 minuto por episodio durante al menos 3 sesiones consecutivas. Golpear la cabeza: Frecuencia 'cero' de ocurrencia durante al menos 3 sesiones consecutivas. Conducta de reemplazo: El estudiante realiza pedidos con palabras con al menos el 80% de respuestas correctas e independientes en 3 sesiones consecutivas"
                                minRows={3}
                                autosize
                                {...form.getInputProps('masteryCriteria')}
                            />

                            {/* Plan de Crisis */}
                            <Textarea
                                label="Plan de Crisis (Opcional)"
                                description="Describe el protocolo a seguir en caso de escalamiento severo de la conducta"
                                placeholder="Ej: Si la conducta escala a agresión física, aplicar protocolo de seguridad: 1) Asegurar el entorno, 2) Mantener distancia segura, 3) Contactar a supervisor..."
                                minRows={4}
                                autosize
                                {...form.getInputProps('crisisPlan')}
                            />
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
                            <Button type="submit" form="behavior-program-form" leftSection={<Save size={16} />}>Guardar Programa</Button>
                        </Group>
                    </Group>
                </Box>
            </Modal.Content>
        </Modal.Root>
    );
}
