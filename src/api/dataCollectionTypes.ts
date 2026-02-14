// ==================== DATA COLLECTION DTOs ====================

export type MeasurementDimension = 'percentage' | 'frequency' | 'duration' | 'latency' | 'interval';
export type TrialResponse = 'independent' | 'prompted' | 'error' | 'no-response';

// Expanded Prompt Levels for RESPONSE
export type PromptLevelResponse =
    | 'full-physical'      // AFT - Ayuda Física Total
    | 'partial-physical'   // AFP - Ayuda Física Parcial
    | 'gestural'          // AG - Ayuda Gestual
    | 'shadow'            // Sombra
    | 'model'             // Modelado
    | 'echoic-full'       // ET - Ecoica Total
    | 'echoic-partial'    // EP - Ecoica Parcial
    | 'verbal-full'       // VT - Verbal Total
    | 'verbal-partial'    // VP - Verbal Parcial
    | 'unspecified';      // Ayuda no específica

// Prompt Levels for STIMULUS
export type PromptLevelStimulus =
    | 'position'          // Posición
    | 'redundancy'        // Redundancia
    | 'movement'          // Movimiento
    | 'time-delay-0'      // Time Delay 0 segundos
    | 'time-delay-3'      // Time Delay 3 segundos
    | 'time-delay-5'      // Time Delay 5 segundos
    | 'time-delay-10';    // Time Delay 10 segundos

// Phase types
export type Phase = 'baseline' | 'treatment' | 'generalization' | 'maintenance';

// Legacy type for backward compatibility
export type PromptLevel = PromptLevelResponse;

// Trial-based recording (Percentage)
export interface Trial {
    id: string;
    number: number;
    response: TrialResponse;
    promptLevel?: PromptLevel;
    timestamp: string;
}

export interface PercentageRecord {
    dimension: 'percentage';
    programId: string;
    sessionId: string;
    totalTrials: number;
    trials: Trial[];
    independentCount: number;
    promptedCount: number;
    errorCount: number;
    noResponseCount: number;
    percentageCorrect: number;
}

// Frequency recording
export interface FrequencyRecord {
    dimension: 'frequency';
    programId: string;
    sessionId: string;
    count: number;
    startTime: string;
    endTime?: string;
    duration?: number; // in seconds
    rate?: number; // events per minute
    events: Array<{
        id: string;
        timestamp: string;
    }>;
}

// Duration recording
export interface DurationRecord {
    dimension: 'duration';
    programId: string;
    sessionId: string;
    totalDuration: number; // in seconds
    episodes: Array<{
        id: string;
        startTime: string;
        endTime?: string;
        duration?: number;
    }>;
}

// Latency recording
export interface LatencyRecord {
    dimension: 'latency';
    programId: string;
    sessionId: string;
    trials: Array<{
        id: string;
        antecedentTime: string;
        responseTime?: string;
        latency?: number; // in seconds
    }>;
    averageLatency?: number;
}

// Interval recording
export type IntervalType = 'whole' | 'partial' | 'momentary';

export interface IntervalData {
    intervalNumber: number;
    occurred: boolean | null;
    timestamp: string;
    timeRemaining?: number;
}

export interface IntervalRecord {
    dimension: 'interval';
    programId: string;
    sessionId: string;
    intervalType: IntervalType;
    numberOfIntervals: number;
    intervalDuration: number; // in seconds
    intervals: IntervalData[];
    percentageOccurrence?: number;
}

// Session metadata
export interface DataCollectionSession {
    id: string;
    studentId: string;
    programId: string;
    therapistId: string;
    dimension: MeasurementDimension;
    startTime: string;
    endTime?: string;
    status: 'in-progress' | 'completed' | 'cancelled';
    record: PercentageRecord | FrequencyRecord | DurationRecord | LatencyRecord | IntervalRecord;
    notes?: string;
}

// Helper functions
export const getResponseLabel = (response: TrialResponse): string => {
    switch (response) {
        case 'independent':
            return 'I';
        case 'prompted':
            return 'A';
        case 'error':
            return 'E';
        case 'no-response':
            return 'NR';
    }
};

export const getResponseColor = (response: TrialResponse): string => {
    switch (response) {
        case 'independent':
            return 'green';
        case 'prompted':
            return 'yellow';
        case 'error':
            return 'red';
        case 'no-response':
            return 'gray';
    }
};

export const getPromptLevelLabel = (level: PromptLevelResponse): string => {
    switch (level) {
        case 'full-physical':
            return 'AFT (Ayuda Física Total)';
        case 'partial-physical':
            return 'AFP (Ayuda Física Parcial)';
        case 'gestural':
            return 'AG (Ayuda Gestual)';
        case 'shadow':
            return 'Sombra';
        case 'model':
            return 'Modelado';
        case 'echoic-full':
            return 'ET (Ecoica Total)';
        case 'echoic-partial':
            return 'EP (Ecoica Parcial)';
        case 'verbal-full':
            return 'VT (Verbal Total)';
        case 'verbal-partial':
            return 'VP (Verbal Parcial)';
        case 'unspecified':
            return 'Ayuda no específica';
    }
};

export const getPromptLevelStimulusLabel = (level: PromptLevelStimulus): string => {
    switch (level) {
        case 'position':
            return 'Posición';
        case 'redundancy':
            return 'Redundancia';
        case 'movement':
            return 'Movimiento';
        case 'time-delay-0':
            return 'Time Delay 0 seg';
        case 'time-delay-3':
            return 'Time Delay 3 seg';
        case 'time-delay-5':
            return 'Time Delay 5 seg';
        case 'time-delay-10':
            return 'Time Delay 10 seg';
    }
};

export const getPhaseLabel = (phase: Phase): string => {
    switch (phase) {
        case 'baseline':
            return 'Línea Base';
        case 'treatment':
            return 'Tratamiento';
        case 'generalization':
            return 'Generalización';
        case 'maintenance':
            return 'Mantenimiento';
    }
};

export const getPhaseColor = (phase: Phase): string => {
    switch (phase) {
        case 'baseline':
            return 'gray';
        case 'treatment':
            return 'blue';
        case 'generalization':
            return 'violet';
        case 'maintenance':
            return 'green';
    }
};
