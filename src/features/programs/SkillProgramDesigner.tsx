import { useEffect, useRef, useState } from 'react';
import { useIdentity } from '@/context/IdentityContext';
import type { ReactNode } from 'react';
import { Alert } from '@mantine/core';
import { useDesignerSubmission } from './useDesignerSubmission';
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
    Box,
    Select,
    TagsInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Plus, Trash, Download, X, Save, ArrowUp, ArrowDown } from 'lucide-react';
import { type SkillAcquisitionProgram, type ProgramStep, type ProgramSet } from '@/api/programsData';
import { downloadProgramDesignPdf, type ProgramDesignPdfInput } from './program-design-pdf';
import { downloadProgramDesignCsv, type ProgramDesignExportContext } from './program-design-csv';

interface SkillProgramDesignerProps {
    program?: Omit<SkillAcquisitionProgram,'status'> & {status:SkillAcquisitionProgram['status']|'draft'} & Partial<SkillDesignExtras>;
    opened: boolean;
    locked?: boolean;
    closeBlocked?: boolean;
    operationNotice?: ReactNode;
    exportContext?: ProgramDesignExportContext;
    onClose: () => void;
    onSave: (data: Partial<SkillAcquisitionProgram> & SkillDesignExtras) => Promise<void>;
    onPublish?: (data: Partial<SkillAcquisitionProgram> & SkillDesignExtras) => Promise<void>;
}

export type SkillDesignExtras = { measurementDimension: 'percentage'|'frequency'|'interval'|'duration'|'latency'; skillArea:string; teachingProcedure:string; promptLevels:string[] };

export function SkillProgramDesigner({ program, opened, onClose, onSave, onPublish, locked=false, closeBlocked=false, operationNotice, exportContext }: SkillProgramDesignerProps) {
    const { identity, verified } = useIdentity();
    const exportScopeKey = JSON.stringify([opened, verified, identity?.userId, identity?.active?.id, program?.id, exportContext?.versionId]);
    const liveExportScope = useRef(exportScopeKey);
    liveExportScope.current = exportScopeKey;
    const exportMounted = useRef(true);
    const exportEpoch = useRef(0);
    const exportBusy = useRef(false);
    useEffect(() => { exportMounted.current = true; return () => { exportMounted.current = false; }; }, []);
    useEffect(() => { const epoch = exportEpoch; return () => { epoch.current += 1; }; }, [exportScopeKey]);
    const [steps, setSteps] = useState<ProgramStep[]>(program?.steps || []);
    const [sets, setSets] = useState<ProgramSet[]>(program?.sets || []);

    const [exportError, setExportError] = useState('');
    const [exporting, setExporting] = useState(false);
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
            measurementDimension: program?.measurementDimension || 'percentage' as SkillDesignExtras['measurementDimension'],
            skillArea: program?.skillArea || '',
            teachingProcedure: program?.teachingProcedure || '',
            promptLevels: program?.promptLevels || [],
        },
        validate: {
            name: (value) => (value.length < 3 ? 'El nombre debe tener al menos 3 caracteres' : null),
            objective: (value) => (value.length < 10 ? 'El objetivo debe ser más descriptivo' : null),
        },
    });
    // Rehidrata el borrador sólo al abrir o cambiar de programa; incluir el objeto form reiniciaría el efecto en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(()=>{if(!opened)return;setSteps(program?.steps||[]);setSets(program?.sets||[]);form.setValues({name:program?.name||'',objective:program?.objective||'',antecedent:program?.antecedent||'',procedure:program?.procedure||'',prompts:program?.prompts||'',errorCorrection:program?.errorCorrection||'',masteryCriteria:program?.masteryCriteria||'',generalization:program?.generalization||'',measurementDimension:program?.measurementDimension||'percentage',skillArea:program?.skillArea||'',teachingProcedure:program?.teachingProcedure||'',promptLevels:program?.promptLevels||[]});form.resetDirty();},[opened,program?.id]);

    const handleAddStep = () => {
        const newStep: ProgramStep = { id: `step-${Date.now()}`, order: steps.length + 1, description: '' };
        setSteps([...steps, newStep]);
    };

    const handleRemoveStep = (id: string) => {
        setSteps(steps.filter((step) => step.id !== id).map((step, index) => ({ ...step, order: index + 1 })));
    };

    const handleMoveStep = (id: string, direction: -1 | 1) => {
        if (locked || submitting) return;
        setSteps((current) => {
            const index = current.findIndex((step) => step.id === id);
            const target = index + direction;
            if (index < 0 || target < 0 || target >= current.length) return current;
            const reordered = [...current];
            [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
            return reordered.map((step, position) => ({ ...step, order: position + 1 }));
        });
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

    const {submit,requestClose,submitting,saveError}=useDesignerSubmission(onClose,closeBlocked,()=>form.isDirty()||JSON.stringify(steps)!==JSON.stringify(program?.steps??[])||JSON.stringify(sets)!==JSON.stringify(program?.sets??[]));
    const handleSubmit = async (values: typeof form.values) => {
        if(locked)return;
        await submit(()=>onSave({...values,steps,sets}));
    };
    const handlePublish=async()=>{if(locked||form.validate().hasErrors||!onPublish)return;await submit(()=>onPublish({...form.values,steps,sets}));};
    const visibleExport = (): ProgramDesignPdfInput => ({
        title:form.values.name,
        kind:'Habilidad',
        measurementDimension:form.values.measurementDimension,
        sections:[
            {label:'Objetivo',value:form.values.objective},
            {label:'Área de habilidad',value:form.values.skillArea},
            {label:'Antecedente',value:form.values.antecedent},
            {label:'Pasos',value:[...steps].sort((a,b)=>a.order-b.order).map(step=>`${step.order}. ${step.description}`)},
            {label:'Sets de estímulos',value:sets.flatMap((set,index)=>[
                `${set.name.trim()||`Set ${index+1}`}:`,
                ...set.items.map((item,itemIndex)=>`   ${itemIndex+1}. ${item}`),
            ])},
            {label:'Procedimiento detallado',value:form.values.procedure},
            {label:'Procedimiento de enseñanza',value:form.values.teachingProcedure},
            {label:'Ayudas y desvanecimiento',value:form.values.prompts},
            {label:'Niveles de ayuda',value:form.values.promptLevels},
            {label:'Corrección de error',value:form.values.errorCorrection},
            {label:'Criterio de logro y avance',value:form.values.masteryCriteria},
            {label:'Generalización y mantención',value:form.values.generalization},
        ],
    });

    const handleExport = async (format: 'pdf' | 'csv') => {
        const startedScope = exportScopeKey;
        const startedEpoch = exportEpoch.current;
        const isCurrent = () => exportMounted.current && exportEpoch.current === startedEpoch && liveExportScope.current === startedScope && opened && verified && !!identity?.userId && !!identity.active;
        if (exportBusy.current || !isCurrent()) return;
        exportBusy.current = true;
        setExportError('');
        setExporting(true);
        try {
            const input = visibleExport();
            if (format === 'pdf') await downloadProgramDesignPdf(input, isCurrent);
            else {
                const { name, ...fields } = form.values;
                downloadProgramDesignCsv({ ...input, context: exportContext, draft: {
                    title: name,
                    design: { schemaVersion: 2, kind: 'acquisition', ...fields, steps, sets },
                } });
            }
        } catch (cause) {
            if (isCurrent()) setExportError(cause instanceof Error ? cause.message : 'No se pudo generar la exportación. El borrador se conserva.');
        } finally {
            exportBusy.current = false;
            if (exportMounted.current) setExporting(false);
        }
    };

    return (
        <Modal.Root opened={opened} onClose={requestClose} size="xl" centered>
            <Modal.Overlay />
            <Modal.Content style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                {/* Modal Header - Sticky */}
                <Modal.Header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                    <Modal.Title style={{ fontSize: '1.25rem', fontWeight: 700 }}>Diseño de Programa</Modal.Title>
                    <Modal.CloseButton disabled={submitting||closeBlocked} />
                </Modal.Header>

                {/* Modal Body - Scrollable */}
                <Modal.Body style={{ flex: 1, overflowY: 'auto' }}>
                    {operationNotice}
                    {exportError&&<Alert color="red" role="alert" mb="sm">{exportError}</Alert>}
                    {saveError&&<Alert color="orange" mb="sm">{saveError}</Alert>}
                    <form id="program-form" onSubmit={form.onSubmit(handleSubmit)}><fieldset disabled={locked||submitting} style={{border:0,padding:0,margin:0,minWidth:0}}>
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

                            <Select label="Dimensión de medición" required data={[['percentage','Porcentaje'],['frequency','Frecuencia'],['interval','Intervalos'],['duration','Duración'],['latency','Latencia']].map(([value,label])=>({value,label}))} {...form.getInputProps('measurementDimension')} />
                            <TextInput label="Área de habilidad" maxLength={200} {...form.getInputProps('skillArea')} />

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
                                        {steps.map((step, index) => (
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
                                                        <Stack gap={2}>
                                                            <ActionIcon type="button" variant="subtle" aria-label={'Mover paso ' + step.order + ' hacia arriba'} disabled={locked || submitting || index === 0} onClick={() => handleMoveStep(step.id, -1)}><ArrowUp size={16} /></ActionIcon>
                                                            <ActionIcon type="button" variant="subtle" aria-label={'Mover paso ' + step.order + ' hacia abajo'} disabled={locked || submitting || index === steps.length - 1} onClick={() => handleMoveStep(step.id, 1)}><ArrowDown size={16} /></ActionIcon>
                                                        </Stack>
                                                        <ActionIcon type="button" aria-label={'Retirar paso ' + step.order} color="red" variant="subtle" onClick={() => handleRemoveStep(step.id)}>
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
                            <Textarea label="Procedimiento de enseñanza" minRows={2} autosize {...form.getInputProps('teachingProcedure')} />
                            <Textarea label="Ayudas y Desvanecimiento" minRows={2} autosize {...form.getInputProps('prompts')} />
                            <TagsInput label="Niveles de ayuda" description="Máximo 50 niveles, 200 caracteres cada uno" maxTags={50} {...form.getInputProps('promptLevels')} />
                            <Textarea label="Corrección de Error" minRows={2} autosize {...form.getInputProps('errorCorrection')} />
                            <Textarea label="Criterio de Logro y Avance" minRows={2} autosize {...form.getInputProps('masteryCriteria')} />
                            <Textarea label="Generalización y Mantención" minRows={2} autosize {...form.getInputProps('generalization')} />
                        </Stack>
                    </fieldset></form>
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
                        <Group gap="xs">
                            <Button variant="subtle" size="sm" leftSection={<Download size={16} />} disabled={submitting||exporting} onClick={()=>void handleExport('pdf')} title="Descarga el borrador visible sin guardar ni publicar cambios">Descargar PDF</Button>
                            <Button variant="subtle" size="sm" leftSection={<Download size={16} />} disabled={submitting||exporting} onClick={()=>void handleExport('csv')} title="Descarga todos los campos y JSON del borrador visible sin guardar ni publicar cambios">Descargar CSV</Button>
                        </Group>
                        <Group>
                            <Button variant="default" onClick={requestClose}>Cancelar</Button>
                            {onPublish&&<Button variant="light" disabled={locked||submitting} onClick={()=>void handlePublish()}>Guardar y publicar</Button>}
                            <Button disabled={locked||submitting} type="submit" form="program-form" leftSection={<Save size={16} />}>Guardar Programa</Button>
                        </Group>
                    </Group>
                </Box>
            </Modal.Content>
        </Modal.Root>
    );
}
