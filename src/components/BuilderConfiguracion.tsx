import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import * as z from "zod"
import { Settings2, Save, Info, CheckCircle2 } from "lucide-react"
import {
    Button,
    Card,
    TextInput,
    Select,
    NumberInput,
    Checkbox,
    Group,
    Stack,
    Text,
    // Badge, // Removed unused
    Divider,
    ActionIcon
} from '@mantine/core'
import { notifications } from '@mantine/notifications'

const formSchema = z.object({
    nombrePrograma: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    dimension: z.enum(["porcentaje", "frecuencia", "duracion", "intervalos"]),
    numeroEnsayos: z.number().min(1, "Mínimo 1 ensayo").max(100).optional(),
    codigosAyuda: z.array(z.string()).optional(),
    notasSupervisor: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const codigosDisponibles = [
    { id: "AFT", label: "Ayuda Física Total (AFT)" },
    { id: "AFP", label: "Ayuda Física Parcial (AFP)" },
    { id: "AG", label: "Ayuda Gestual (AG)" },
    { id: "AV", label: "Ayuda Verbal (AV)" },
    { id: "AM", label: "Ayuda de Modelado (AM)" },
    { id: "AP", label: "Ayuda Posicional (AP)" },
]

export function BuilderConfiguracion() {
    const form = useForm<FormValues>({
        mode: 'uncontrolled',
        validate: zodResolver(formSchema),
        initialValues: {
            nombrePrograma: "",
            dimension: "porcentaje",
            numeroEnsayos: 10,
            codigosAyuda: ["AFT", "AFP", "AG"],
            notasSupervisor: "",
        },
    })

    const watchDimension = form.getValues().dimension

    function onSubmit(values: FormValues) {
        notifications.show({
            title: 'Configuración guardada exitosamente',
            message: `Programa: ${values.nombrePrograma} (${values.dimension})`,
            color: 'green',
        })
        console.log(values)
    }

    return (
        <Card shadow="xl" padding="lg" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="lg" bg="blue.0">
                <Group gap="md">
                    <ActionIcon size="xl" variant="filled" color="blue" radius="md">
                        <Settings2 size={24} />
                    </ActionIcon>
                    <div>
                        <Text fw={700} size="xl">Configuración de Programa</Text>
                        <Text size="sm" c="dimmed">Define la metodología de registro y parámetros clínicos.</Text>
                    </div>
                </Group>
            </Card.Section>

            <form onSubmit={form.onSubmit(onSubmit)}>
                <Stack gap="xl" mt="lg">
                    {/* Sección General */}
                    <Stack gap="md">
                        <Group gap="xs">
                            <Info size={16} color="var(--mantine-color-blue-6)" />
                            <Text size="sm" fw={700} tt="uppercase" c="dimmed">General</Text>
                        </Group>

                        <TextInput
                            label="Nombre del Programa"
                            placeholder="Ej: Contacto Visual, Tacto de Objetos..."
                            key={form.key('nombrePrograma')}
                            {...form.getInputProps('nombrePrograma')}
                            withAsterisk
                        />

                        <Select
                            label="Dimensión de Medida"
                            placeholder="Selecciona una dimensión"
                            description="Determina cómo se recolectarán los datos en sesión."
                            data={[
                                { value: 'porcentaje', label: 'Porcentaje (Ensayos)' },
                                { value: 'frecuencia', label: 'Frecuencia (Conteo)' },
                                { value: 'duracion', label: 'Duración (Tiempo)' },
                                { value: 'intervalos', label: 'Intervalos' },
                            ]}
                            key={form.key('dimension')}
                            {...form.getInputProps('dimension')}
                            withAsterisk
                        />
                    </Stack>

                    <Divider />

                    {/* Sección Condicional */}
                    <Stack gap="md" style={{ minHeight: '120px' }}>
                        {watchDimension === "porcentaje" && (
                            <Stack gap="md">
                                <Group gap="xs">
                                    <CheckCircle2 size={16} color="var(--mantine-color-green-6)" />
                                    <Text size="sm" fw={700} tt="uppercase" c="dimmed">Configuración de Ensayos</Text>
                                </Group>
                                <NumberInput
                                    label="Número de Ensayos por Sesión"
                                    description="Recomendado: 10 ensayos estándar."
                                    min={1}
                                    max={100}
                                    style={{ maxWidth: '200px' }}
                                    key={form.key('numeroEnsayos')}
                                    {...form.getInputProps('numeroEnsayos')}
                                />
                            </Stack>
                        )}

                        {watchDimension === "frecuencia" && (
                            <Stack gap="md">
                                <Group gap="xs">
                                    <CheckCircle2 size={16} color="var(--mantine-color-blue-6)" />
                                    <Text size="sm" fw={700} tt="uppercase" c="dimmed">Códigos de Ayuda Permitidos</Text>
                                </Group>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' }}>
                                    {codigosDisponibles.map((item) => (
                                        <Card key={item.id} padding="sm" withBorder bg="gray.0">
                                            <Checkbox
                                                label={item.label}
                                                checked={form.getValues().codigosAyuda?.includes(item.id)}
                                                onChange={(event) => {
                                                    const current = form.getValues().codigosAyuda || [];
                                                    const updated = event.currentTarget.checked
                                                        ? [...current, item.id]
                                                        : current.filter(id => id !== item.id);
                                                    form.setFieldValue('codigosAyuda', updated);
                                                }}
                                            />
                                        </Card>
                                    ))}
                                </div>
                            </Stack>
                        )}

                        {(watchDimension === "duracion" || watchDimension === "intervalos") && (
                            <Card padding="xl" withBorder style={{ borderStyle: 'dashed' }} bg="gray.0">
                                <Stack align="center" gap="xs">
                                    <Text c="dimmed" fw={500}>Configuración avanzada de cronómetro e intervalos...</Text>
                                    <Text size="xs" c="dimmed">Módulo en desarrollo para Fase 2.</Text>
                                </Stack>
                            </Card>
                        )}
                    </Stack>
                </Stack>

                <Card.Section withBorder inheritPadding py="md" mt="lg" bg="gray.0">
                    <Group justify="flex-end" gap="sm">
                        <Button variant="subtle" onClick={() => form.reset()}>
                            Descartar
                        </Button>
                        <Button type="submit" leftSection={<Save size={16} />}>
                            Guardar Configuración
                        </Button>
                    </Group>
                </Card.Section>
            </form>
        </Card>
    )
}
