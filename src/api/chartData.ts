// Mock data for charts
export interface SessionDataPoint {
    session: number;
    date: string;
    independent: number;
    prompted: number;
    error: number;
    percentage: number;
    phase?: string;
}

export interface PhaseChange {
    session: number;
    phaseName: string;
    color: string;
}

// Generate realistic learning curve data
export const generateMockSessionData = (_programId: string): SessionDataPoint[] => {
    // Simulate a learning curve with phases
    const data: SessionDataPoint[] = [];

    // Baseline phase (sessions 1-5): Low performance
    for (let i = 1; i <= 5; i++) {
        data.push({
            session: i,
            date: new Date(2026, 0, i).toISOString().split('T')[0],
            independent: Math.floor(Math.random() * 20) + 10, // 10-30%
            prompted: Math.floor(Math.random() * 30) + 40, // 40-70%
            error: Math.floor(Math.random() * 20) + 10, // 10-30%
            percentage: Math.floor(Math.random() * 20) + 10,
            phase: 'baseline',
        });
    }

    // Intervention phase (sessions 6-15): Gradual improvement
    for (let i = 6; i <= 15; i++) {
        const progress = (i - 6) / 10; // 0 to 1
        data.push({
            session: i,
            date: new Date(2026, 0, i).toISOString().split('T')[0],
            independent: Math.floor(30 + progress * 40 + Math.random() * 10), // 30-80%
            prompted: Math.floor(40 - progress * 30 + Math.random() * 10), // 40-10%
            error: Math.floor(20 - progress * 15 + Math.random() * 5), // 20-5%
            percentage: Math.floor(30 + progress * 50 + Math.random() * 10),
            phase: 'intervention',
        });
    }

    // Maintenance phase (sessions 16-20): High stable performance
    for (let i = 16; i <= 20; i++) {
        data.push({
            session: i,
            date: new Date(2026, 0, i).toISOString().split('T')[0],
            independent: Math.floor(Math.random() * 10) + 85, // 85-95%
            prompted: Math.floor(Math.random() * 5) + 5, // 5-10%
            error: Math.floor(Math.random() * 5), // 0-5%
            percentage: Math.floor(Math.random() * 10) + 85,
            phase: 'maintenance',
        });
    }

    return data;
};

export const phaseChanges: PhaseChange[] = [
    { session: 1, phaseName: 'Línea Base', color: '#868e96' },
    { session: 6, phaseName: 'Intervención', color: '#228be6' },
    { session: 16, phaseName: 'Mantenimiento', color: '#40c057' },
];
