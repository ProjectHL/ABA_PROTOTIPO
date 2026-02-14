// Definiciones básicas de tipos para los datos analíticos
export type AnalysisMetric = 'percentage' | 'frequency' | 'duration' | 'rate';
export type AnalysisPhase = 'baseline' | 'intervention' | 'generalization' | 'maintenance';

export interface DataPoint {
    id: string;
    sessionId: string;
    studentId: string;
    programId: string;
    therapistId: string;
    date: string; // ISO format
    value: number; // El valor principal (score, count, seconds)
    notes?: string;
    phase: AnalysisPhase;
}

export interface KPIStats {
    totalSessions: number;
    averageValue: number;
    maxValue: number;
    minValue: number;
    trend: 'up' | 'down' | 'stable';
    lastValue: number;
    trendPercentage: number;
}

// Simulador de datos variados para diferentes tipos de programas
export const generateMockData = (
    programId: string,
    metric: AnalysisMetric,
    startDate: Date,
    days: number = 30
): DataPoint[] => {
    const data: DataPoint[] = [];
    let currentValue = metric === 'percentage' ? 20 : 5; // Valor inicial
    let phase: AnalysisPhase = 'baseline';

    for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);

        // Simular cambio de fase a los 10 días
        if (i > 10) phase = 'intervention';
        if (i > 25) phase = 'maintenance';

        // Variabilidad aleatoria
        let change = (Math.random() - 0.5) * 10;

        // Tendencia general según métrica
        if (phase === 'intervention') {
            if (metric === 'percentage') {
                if (currentValue < 90) change += 2; // Tendencia positiva
            } else if (metric === 'frequency') {
                if (currentValue > 0) change -= 0.5; // Tendencia negativa (reducir conducta)
            }
        }

        currentValue += change;

        // Límites
        if (metric === 'percentage') currentValue = Math.max(0, Math.min(100, currentValue));
        if (metric === 'frequency') currentValue = Math.max(0, currentValue);

        // Algunos días sin datos (fin de semana simulado)
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            data.push({
                id: `dp-${programId}-${i}`,
                sessionId: `sess-${i}`,
                studentId: 'sim-student',
                programId,
                therapistId: Math.random() > 0.5 ? 'th-1' : 'th-2',
                date: currentDate.toISOString().split('T')[0],
                value: Math.round(currentValue * 10) / 10,
                notes: Math.random() > 0.8 ? 'Observación clínica relevante' : undefined,
                phase
            });
        }
    }
    return data;
};

// Cálculo de estadísticas
export const calculateKPIs = (data: DataPoint[]): KPIStats => {
    if (data.length === 0) {
        return {
            totalSessions: 0,
            averageValue: 0,
            maxValue: 0,
            minValue: 0,
            trend: 'stable',
            lastValue: 0,
            trendPercentage: 0
        };
    }

    const values = data.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    // Tendencia simple: Comparar primera mitad vs segunda mitad
    const mid = Math.floor(values.length / 2);
    const firstHalfAvg = values.slice(0, mid).reduce((a, b) => a + b, 0) / mid || 0;
    const secondHalfAvg = values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid) || 0;

    const trendDiff = secondHalfAvg - firstHalfAvg;
    const trendPercentage = firstHalfAvg !== 0 ? (trendDiff / firstHalfAvg) * 100 : 0;

    return {
        totalSessions: data.length,
        averageValue: Math.round(avg * 10) / 10,
        maxValue: Math.max(...values),
        minValue: Math.min(...values),
        trend: trendDiff > 0.5 ? 'up' : trendDiff < -0.5 ? 'down' : 'stable',
        lastValue: values[values.length - 1],
        trendPercentage: Math.round(trendPercentage * 10) / 10
    };
};
