// ==================== DASHBOARD DTOs ====================

export interface ActiveSession {
    id: string;
    studentId: string;
    studentName: string;
    therapistId: string;
    therapistName: string;
    programId: string;
    programName: string;
    startDate: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    duration: number; // in minutes
    status: 'in-progress' | 'paused';
}

export interface CompletedSession {
    id: string;
    studentId: string;
    studentName: string;
    therapistId: string;
    therapistName: string;
    programId: string;
    programName: string;
    startDate: string; // YYYY-MM-DD
    startTime: string; // HH:MM
    endTime: string; // HH:MM
    duration: number; // in minutes
}

export interface DashboardKPI {
    label: string;
    value: number | string;
    change?: number; // percentage change
    trend?: 'up' | 'down' | 'neutral';
    color: string;
}

export interface ProgramHistory {
    id: string;
    programName: string;
    studentName: string;
    achievedDate: string;
    category: 'skill-acquisition' | 'behavior-management';
    successRate: number;
}

// ==================== MOCK DASHBOARD DATA ====================

// Helper function to calculate start time based on elapsed minutes
const getStartTime = (elapsedMinutes: number): string => {
    const now = new Date();
    const startTime = new Date(now.getTime() - elapsedMinutes * 60000);
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getTodayDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Crear sesiones con datos calculados dinámicamente
const createActiveSessions = (): ActiveSession[] => [
    {
        id: 'session-001',
        studentId: 'std-001',
        studentName: 'Santiago García Pérez',
        therapistId: 'ther-001',
        therapistName: 'María González',
        programId: 'prog-001',
        programName: 'Contacto Visual',
        startDate: getTodayDate(),
        startTime: getStartTime(10), // 10 min transcurridos, 50 restantes
        duration: 60,
        status: 'in-progress',
    },
    {
        id: 'session-002',
        studentId: 'std-002',
        studentName: 'Valentina Rodríguez Muñoz',
        therapistId: 'ther-002',
        therapistName: 'Carlos Ramírez',
        programId: 'prog-002',
        programName: 'Imitación Motora Gruesa',
        startDate: getTodayDate(),
        startTime: getStartTime(27), // 27 min transcurridos, 33 restantes
        duration: 60,
        status: 'in-progress',
    },
    {
        id: 'session-003',
        studentId: 'std-003',
        studentName: 'Mateo López Fernández',
        therapistId: 'ther-003',
        therapistName: 'Ana Martínez',
        programId: 'prog-005',
        programName: 'Reducción de Rabietas',
        startDate: getTodayDate(),
        startTime: getStartTime(50), // 50 min transcurridos, 10 restantes
        duration: 60,
        status: 'in-progress',
    },
];

export const mockActiveSessions: ActiveSession[] = createActiveSessions();

export const mockCompletedSessions: CompletedSession[] = [
    {
        id: 'completed-001',
        studentId: 'std-004',
        studentName: 'Sofía Martínez Soto',
        therapistId: 'ther-004',
        therapistName: 'Luis Torres',
        programId: 'prog-004',
        programName: 'Seguimiento de Instrucciones Simples',
        startDate: getTodayDate(),
        startTime: '13:00',
        endTime: '14:00',
        duration: 60,
    },
    {
        id: 'completed-002',
        studentId: 'std-001',
        studentName: 'Santiago García Pérez',
        therapistId: 'ther-005',
        therapistName: 'Patricia Silva',
        programId: 'prog-003',
        programName: 'Identificación de Colores',
        startDate: getTodayDate(),
        startTime: '12:00',
        endTime: '13:00',
        duration: 60,
    },
    {
        id: 'completed-003',
        studentId: 'std-002',
        studentName: 'Valentina Rodríguez Muñoz',
        therapistId: 'ther-006',
        therapistName: 'Jorge Vargas',
        programId: 'prog-002',
        programName: 'Imitación Motora Gruesa',
        startDate: '2026-01-31',
        startTime: '16:00',
        endTime: '17:00',
        duration: 60,
    },
];

export const mockDashboardKPIs: DashboardKPI[] = [
    {
        label: 'Programas Activos',
        value: 12,
        change: 8.5,
        trend: 'up',
        color: 'blue',
    },
    {
        label: 'Sesiones Hoy',
        value: 8,
        change: -5.2,
        trend: 'down',
        color: 'green',
    },
    {
        label: 'Estudiantes Activos',
        value: 24,
        change: 12.3,
        trend: 'up',
        color: 'violet',
    },
];

export const mockProgramHistory: ProgramHistory[] = [
    {
        id: 'hist-001',
        programName: 'Identificación de Colores',
        studentName: 'Santiago García Pérez',
        achievedDate: '2025-12-10',
        category: 'skill-acquisition',
        successRate: 95,
    },
    {
        id: 'hist-002',
        programName: 'Imitación Motora Fina',
        studentName: 'Valentina Rodríguez Muñoz',
        achievedDate: '2025-12-05',
        category: 'skill-acquisition',
        successRate: 92,
    },
    {
        id: 'hist-003',
        programName: 'Reducción de Gritos',
        studentName: 'Mateo López Fernández',
        achievedDate: '2025-11-28',
        category: 'behavior-management',
        successRate: 88,
    },
    {
        id: 'hist-004',
        programName: 'Seguimiento de Instrucciones',
        studentName: 'Sofía Martínez Soto',
        achievedDate: '2025-11-20',
        category: 'skill-acquisition',
        successRate: 90,
    },
];

// Mock data for charts
export interface ChartDataPoint {
    date: string;
    value: number;
    label?: string;
}

export const mockLineChartData: ChartDataPoint[] = [
    { date: '2026-01-18', value: 75 },
    { date: '2026-01-19', value: 82 },
    { date: '2026-01-20', value: 78 },
    { date: '2026-01-21', value: 85 },
    { date: '2026-01-22', value: 88 },
    { date: '2026-01-23', value: 92 },
    { date: '2026-01-24', value: 87 },
];

export interface BarChartDataPoint {
    category: string;
    value: number;
    color: string;
}

export const mockBarChartData: BarChartDataPoint[] = [
    { category: 'Contacto Visual', value: 85, color: 'blue' },
    { category: 'Imitación', value: 92, color: 'green' },
    { category: 'Colores', value: 95, color: 'violet' },
    { category: 'Instrucciones', value: 78, color: 'orange' },
    { category: 'Rabietas', value: 70, color: 'red' },
];
