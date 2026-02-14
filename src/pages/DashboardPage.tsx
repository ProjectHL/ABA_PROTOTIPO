import { useState } from 'react';
import { Box, Grid, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/MainLayout';
import { supervisorProfile } from '@/api/mockData';
import {
    mockActiveSessions,
    mockCompletedSessions,
    mockDashboardKPIs,
} from '@/api/dashboardData';
import {
    WelcomeCard,
    ActiveSessionCard,
    CompletedSessionsCard,
    KPICards,
    ProgressLineChart,
    ProgramsBarChart,
} from '@/features/dashboard';

export default function DashboardPage() {
    const [supervisor] = useState(supervisorProfile);
    const [, { open: openEditSupervisor }] = useDisclosure(false);
    const navigate = useNavigate();

    const handleViewProgram = (_programId: string, studentId: string) => {
        // Redirigir a la pestaña de programas del estudiante
        navigate(`/students/${studentId}?tab=programs`);
    };

    return (
        <MainLayout supervisor={supervisor} onEditProfile={openEditSupervisor}>
            <Box w="100%" px="md">
                <Grid gutter="lg">
                    {/* Primera Columna - Información y Sesiones */}
                    <Grid.Col span={{ base: 12, lg: 5 }}>
                        <Stack gap="lg" pr="md">
                            {/* Card de Bienvenida */}
                            <WelcomeCard supervisor={supervisor} />

                            {/* Sesiones Activas */}
                            <ActiveSessionCard
                                sessions={mockActiveSessions}
                                onViewProgram={handleViewProgram}
                            />

                            {/* Sesiones Finalizadas */}
                            <CompletedSessionsCard
                                sessions={mockCompletedSessions}
                                onViewProgram={handleViewProgram}
                            />
                        </Stack>
                    </Grid.Col>

                    {/* Segunda Columna - KPIs y Gráficos */}
                    <Grid.Col span={{ base: 12, lg: 7 }}>
                        <Stack gap="lg">
                            {/* KPIs */}
                            <KPICards kpis={mockDashboardKPIs} />

                            {/* Gráfico de Líneas */}
                            <ProgressLineChart
                                title="N° de sesiones registradas por estudiante"
                                description="Visualización comparativa de sesiones realizadas en el tiempo"
                            />

                            {/* Gráfico de Barras */}
                            <ProgramsBarChart />
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Box>
        </MainLayout>
    );
}
