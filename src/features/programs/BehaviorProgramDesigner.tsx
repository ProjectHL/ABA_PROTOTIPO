import type { ReactNode } from 'react';
import { useDesignerSubmission } from './useDesignerSubmission';
import { Alert } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { useIdentity } from '@/context/IdentityContext';
import {
    Modal,
    Stack,
    TextInput,
    Textarea,
    Button,
    Group,
    MultiSelect,
    Box,
    Select
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Download, Save } from 'lucide-react';
import { type BehaviorManagementProgram, type BehaviorFunction } from '@/api/programsData';
import { downloadProgramDesignPdf, type ProgramDesignPdfInput } from './program-design-pdf';
import { downloadProgramDesignCsv, type ProgramDesignExportContext } from './program-design-csv';

interface BehaviorProgramDesignerProps {
    program?: Omit<BehaviorManagementProgram,'status'> & {status:BehaviorManagementProgram['status']|'draft'} & Partial<BehaviorDesignExtras>;
    opened: boolean;
    locked?: boolean;
    closeBlocked?: boolean;
    operationNotice?: ReactNode;
    exportContext?: ProgramDesignExportContext;
    onClose: () => void;
    onSave: (data: Partial<BehaviorManagementProgram> & BehaviorDesignExtras) => Promise<void>;
    onPublish?: (data: Partial<BehaviorManagementProgram> & BehaviorDesignExtras) => Promise<void>;
}

export type BehaviorDesignExtras={measurementDimension:'percentage'|'frequency'|'interval'|'duration'|'latency';hypothesizedFunctionNotes:string;preventionStrategy:string;responseStrategy:string};

export function BehaviorProgramDesigner({ program, opened, onClose, onSave, onPublish, locked=false, closeBlocked=false, operationNotice, exportContext }: BehaviorProgramDesignerProps) {
    const { identity, verified } = useIdentity();
    const exportScopeKey = JSON.stringify([opened, verified, identity?.userId, identity?.active?.id, program?.id, exportContext?.versionId]);
    const liveExportScope = useRef(exportScopeKey);
    liveExportScope.current = exportScopeKey;
    const exportMounted = useRef(true);
    const exportEpoch = useRef(0);
    const exportBusy = useRef(false);
    useEffect(() => { exportMounted.current = true; return () => { exportMounted.current = false; }; }, []);
    useEffect(() => { const epoch = exportEpoch; return () => { epoch.current += 1; }; }, [exportScopeKey]);
    const [exportError, setExportError] = useState('');
    const [exporting, setExporting] = useState(false);
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
            measurementDimension: program?.measurementDimension || 'frequency' as BehaviorDesignExtras['measurementDimension'],
            hypothesizedFunctionNotes: program?.hypothesizedFunctionNotes || '',
            preventionStrategy: program?.preventionStrategy || '',
            responseStrategy: program?.responseStrategy || '',
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

    // Rehidrata el borrador sólo al abrir o cambiar de programa; incluir el objeto form reiniciaría el efecto en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(()=>{if(!opened)return;form.setValues({name:program?.name||'',topography:program?.topography||'',operationalDefinition:program?.operationalDefinition||'',currentDimension:program?.currentDimension||'',precursorBehaviors:program?.precursorBehaviors||'',functions:program?.functions||[],replacementBehavior:program?.replacementBehavior||'',procedure:program?.procedure||'',masteryCriteria:program?.masteryCriteria||'',crisisPlan:program?.crisisPlan||'',measurementDimension:program?.measurementDimension||'frequency',hypothesizedFunctionNotes:program?.hypothesizedFunctionNotes||'',preventionStrategy:program?.preventionStrategy||'',responseStrategy:program?.responseStrategy||''});form.resetDirty();},[opened,program?.id]);

    const {submit,requestClose,submitting,saveError}=useDesignerSubmission(onClose,closeBlocked,()=>form.isDirty());
    const handleSubmit = async (values: typeof form.values) => {
        if(locked)return;
        await submit(()=>onSave(values));
    };
    const handlePublish=async()=>{if(locked||form.validate().hasErrors||!onPublish)return;await submit(()=>onPublish(form.values));};
    const visibleExport = (): ProgramDesignPdfInput => ({
        title:form.values.name,
        kind:'Manejo de conducta',
        measurementDimension:form.values.measurementDimension,
        sections:[
            {label:'Topografía',value:form.values.topography},
            {label:'Definición operacional',value:form.values.operationalDefinition},
            {label:'Dimensión actual de la conducta',value:form.values.currentDimension},
            {label:'Conductas precursoras',value:form.values.precursorBehaviors},
            {label:'Funciones de la conducta',value:form.values.functions.map(value=>behaviorFunctions.find(item=>item.value===value)?.label??value)},
            {label:'Notas de hipótesis funcional',value:form.values.hypothesizedFunctionNotes},
            {label:'Conducta de reemplazo',value:form.values.replacementBehavior},
            {label:'Procedimiento detallado',value:form.values.procedure},
            {label:'Estrategia de prevención',value:form.values.preventionStrategy},
            {label:'Estrategia de respuesta',value:form.values.responseStrategy},
            {label:'Criterio de logro',value:form.values.masteryCriteria},
            {label:'Plan de crisis',value:form.values.crisisPlan},
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
                    design: { schemaVersion: 2, kind: 'behavior', ...fields },
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
        <Modal.Root
            opened={opened}
            onClose={requestClose}
            size="xl"
            centered
        >
            <Modal.Overlay />
            <Modal.Content style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh', maxWidth: '120vw' }}>
                {/* Modal Header - Sticky */}
                <Modal.Header style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' }}>
                    <Modal.Title style={{ fontSize: '1.25rem', fontWeight: 700 }}>Diseño de Programa - Manejo de Conducta</Modal.Title>
                    <Modal.CloseButton disabled={submitting||closeBlocked} />
                </Modal.Header>

                {/* Modal Body - Scrollable */}
                <Modal.Body style={{ flex: 1, overflowY: 'auto' }}>
                    {operationNotice}
                    {exportError&&<Alert color="red" role="alert" mb="sm">{exportError}</Alert>}
                    {saveError&&<Alert color="orange" mb="sm">{saveError}</Alert>}
                    <form id="behavior-program-form" onSubmit={form.onSubmit(handleSubmit)}><fieldset disabled={locked||submitting} style={{border:0,padding:0,margin:0,minWidth:0}}>
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

                            <Select label="Dimensión de medición" required data={[['percentage','Porcentaje'],['frequency','Frecuencia'],['interval','Intervalos'],['duration','Duración'],['latency','Latencia']].map(([value,label])=>({value,label}))} {...form.getInputProps('measurementDimension')} />

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

                            <Textarea label="Notas de hipótesis funcional" minRows={2} autosize {...form.getInputProps('hypothesizedFunctionNotes')} />

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

                            <Textarea label="Estrategia de prevención" minRows={3} autosize {...form.getInputProps('preventionStrategy')} />
                            <Textarea label="Estrategia de respuesta" minRows={3} autosize {...form.getInputProps('responseStrategy')} />

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
                            <Button disabled={locked||submitting} type="submit" form="behavior-program-form" leftSection={<Save size={16} />}>Guardar Programa</Button>
                        </Group>
                    </Group>
                </Box>
            </Modal.Content>
        </Modal.Root>
    );
}
