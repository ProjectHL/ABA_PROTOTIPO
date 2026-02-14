import { useState, useEffect } from 'react';
import { Stack, Select, Paper, Text, Modal } from '@mantine/core';
import { type MeasurementDimension } from '@/api/dataCollectionTypes';
import { PercentageRecorder } from './PercentageRecorder';
import { FrequencyRecorder } from './FrequencyRecorder';
import { IntervalRecorder } from './IntervalRecorder';
import { notifications } from '@mantine/notifications';

interface DataCollectionEngineProps {
    programId: string;
    programName: string;
    defaultDimension?: MeasurementDimension;
    opened: boolean;
    onClose: () => void;
}

export function DataCollectionEngine({
    programId,
    programName,
    defaultDimension = 'percentage',
    opened,
    onClose,
}: DataCollectionEngineProps) {
    const [dimension, setDimension] = useState<MeasurementDimension>(defaultDimension);
    const [_sessionData, setSessionData] = useState<Record<string, unknown> | null>(null);

    // Save to localStorage for persistence
    // Save to localStorage for persistence
    useEffect(() => {
        const savedData = localStorage.getItem(`session-${programId}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Use setTimeout to avoid synchronous setState warning during render
                setTimeout(() => setSessionData(parsed), 0);
            } catch (error) {
                console.error('Error loading saved session:', error);
            }
        }
    }, [programId]);

    const handleSave = (data: unknown) => {
        const sessionRecord = {
            programId,
            programName,
            dimension,
            data,
            timestamp: new Date().toISOString(),
        };

        // Save to localStorage
        localStorage.setItem(`session-${programId}`, JSON.stringify(sessionRecord));

        // Simulate API call
        console.log('Saving session data:', sessionRecord);

        notifications.show({
            title: 'Registro Guardado',
            message: 'Los datos se guardaron correctamente',
            color: 'green',
        });

        // Clear localStorage after successful save
        localStorage.removeItem(`session-${programId}`);

        onClose();
    };

    const handleCancel = () => {
        // Optionally clear localStorage
        const shouldClear = window.confirm('¿Deseas descartar los datos del registro actual?');
        if (shouldClear) {
            localStorage.removeItem(`session-${programId}`);
        }
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Text fw={600} size="lg">Motor de Registro de Datos</Text>}
            size="xl"
            fullScreen
        >
            <Stack gap="lg">
                {/* Dimension Selector */}
                <Paper p="md" radius="md" withBorder>
                    <Select
                        label="Dimensión de Medición"
                        description="Selecciona el tipo de registro que deseas realizar"
                        value={dimension}
                        onChange={(value) => setDimension(value as MeasurementDimension)}
                        data={[
                            { value: 'percentage', label: 'Porcentaje (Ensayos Discretos)' },
                            { value: 'frequency', label: 'Frecuencia (Conteo de Eventos)' },
                            { value: 'interval', label: 'Intervalos (Muestreo Temporal)' },
                            { value: 'duration', label: 'Duración (Tiempo Total)' },
                            { value: 'latency', label: 'Latencia (Tiempo de Respuesta)' },
                        ]}
                        size="lg"
                    />
                </Paper>

                {/* Conditional Rendering based on Dimension */}
                {dimension === 'percentage' && (
                    <PercentageRecorder
                        programName={programName}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}

                {dimension === 'frequency' && (
                    <FrequencyRecorder
                        programName={programName}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}

                {dimension === 'interval' && (
                    <IntervalRecorder
                        programName={programName}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                )}

                {(dimension === 'duration' || dimension === 'latency') && (
                    <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                        <Text c="dimmed" size="lg">
                            El registro de {dimension === 'duration' ? 'Duración' : 'Latencia'} estará disponible próximamente
                        </Text>
                    </Paper>
                )}
            </Stack>
        </Modal>
    );
}
