// ==================== PROGRAMS DTOs ====================

export type ProgramCategory = 'skill-acquisition' | 'behavior-management';
export type ProgramStatus = 'active' | 'achieved' | 'paused' | 'discontinued';
export type BehaviorFunction = 'attention' | 'escape' | 'sensory' | 'tangible';

export interface ProgramStep {
    id: string;
    order: number;
    description: string;
}

export interface ProgramSet {
    id: string;
    name: string;
    items: string[];
}

export interface SkillAcquisitionProgram {
    id: string;
    studentId: string;
    category: 'skill-acquisition';
    name: string;
    status: ProgramStatus;
    objective: string;
    antecedent: string;
    steps: ProgramStep[];
    procedure: string;
    sets?: ProgramSet[];
    prompts?: string;
    errorCorrection?: string;
    masteryCriteria?: string;
    generalization?: string;
    createdDate: string;
    lastModified: string;
    createdBy: string;
}

export interface BehaviorManagementProgram {
    id: string;
    studentId: string;
    category: 'behavior-management';
    name: string;
    status: ProgramStatus;
    topography: string;
    operationalDefinition: string;
    currentDimension?: string;
    functions: BehaviorFunction[];
    precursorBehaviors?: string;
    replacementBehavior?: string;
    procedure: string;
    masteryCriteria?: string;
    crisisPlan?: string;
    createdDate: string;
    lastModified: string;
    createdBy: string;
}

export type Program = SkillAcquisitionProgram | BehaviorManagementProgram;

// ==================== MOCK PROGRAMS DATA ====================

export const programsData: Program[] = [
    // Skill Acquisition Programs
    {
        id: 'prog-001',
        studentId: 'std-001',
        category: 'skill-acquisition',
        name: 'Contacto Visual',
        status: 'active',
        objective: 'El estudiante establecerá contacto visual con el terapeuta durante 3 segundos cuando se le presente su nombre.',
        antecedent: 'Terapeuta dice el nombre del estudiante',
        steps: [
            { id: 'step-001', order: 1, description: 'Llamar al estudiante por su nombre' },
            { id: 'step-002', order: 2, description: 'Esperar 2 segundos para respuesta' },
            { id: 'step-003', order: 3, description: 'Registrar si hubo contacto visual' },
        ],
        procedure: 'Se presenta el nombre del estudiante en un ambiente sin distracciones. Si el estudiante establece contacto visual dentro de 2 segundos, se proporciona reforzamiento inmediato. Si no responde, se utiliza ayuda gestual dirigiendo suavemente la mirada hacia el terapeuta.',
        createdDate: '2023-02-15',
        lastModified: '2026-01-20',
        createdBy: 'María González',
    },
    {
        id: 'prog-002',
        studentId: 'std-001',
        category: 'skill-acquisition',
        name: 'Imitación Motora Gruesa',
        status: 'active',
        objective: 'El estudiante imitará 5 acciones motoras gruesas (aplaudir, levantar brazos, tocar cabeza, saltar, girar) con precisión del 80%.',
        antecedent: 'Terapeuta modela la acción y dice "Haz esto"',
        steps: [
            { id: 'step-004', order: 1, description: 'Terapeuta modela la acción' },
            { id: 'step-005', order: 2, description: 'Dar instrucción verbal "Haz esto"' },
            { id: 'step-006', order: 3, description: 'Esperar 3 segundos para imitación' },
            { id: 'step-007', order: 4, description: 'Reforzar o proporcionar ayuda' },
        ],
        procedure: 'El terapeuta se sienta frente al estudiante y modela una acción motora gruesa. Inmediatamente después dice "Haz esto". Se espera 3 segundos para que el estudiante imite. Si imita correctamente, se refuerza con elogio y acceso a preferido. Si no imita o imita incorrectamente, se proporciona ayuda física parcial.',
        sets: [
            {
                id: 'set-001',
                name: 'Acciones Básicas',
                items: ['Aplaudir', 'Levantar brazos', 'Tocar cabeza', 'Saltar', 'Girar'],
            },
        ],
        createdDate: '2023-03-10',
        lastModified: '2026-01-18',
        createdBy: 'María González',
    },
    {
        id: 'prog-003',
        studentId: 'std-001',
        category: 'skill-acquisition',
        name: 'Identificación de Colores',
        status: 'achieved',
        objective: 'El estudiante identificará correctamente 6 colores básicos cuando se le pregunte "¿Qué color es este?"',
        antecedent: 'Terapeuta presenta tarjeta de color y pregunta',
        steps: [
            { id: 'step-008', order: 1, description: 'Presentar tarjeta de color' },
            { id: 'step-009', order: 2, description: 'Preguntar "¿Qué color es este?"' },
            { id: 'step-010', order: 3, description: 'Esperar respuesta verbal' },
            { id: 'step-011', order: 4, description: 'Reforzar respuesta correcta' },
        ],
        procedure: 'Se presentan tarjetas de colores de manera aleatoria. El terapeuta pregunta "¿Qué color es este?" y espera la respuesta verbal del estudiante. Respuestas correctas se refuerzan inmediatamente. Respuestas incorrectas se corrigen mediante modelo verbal.',
        sets: [
            {
                id: 'set-002',
                name: 'Colores Básicos',
                items: ['Rojo', 'Azul', 'Amarillo', 'Verde', 'Naranja', 'Morado'],
            },
        ],
        createdDate: '2023-04-05',
        lastModified: '2025-12-10',
        createdBy: 'María González',
    },
    {
        id: 'prog-004',
        studentId: 'std-001',
        category: 'skill-acquisition',
        name: 'Seguimiento de Instrucciones Simples',
        status: 'paused',
        objective: 'El estudiante seguirá 10 instrucciones simples de un paso con 90% de precisión.',
        antecedent: 'Terapeuta da instrucción verbal',
        steps: [
            { id: 'step-012', order: 1, description: 'Captar atención del estudiante' },
            { id: 'step-013', order: 2, description: 'Dar instrucción clara' },
            { id: 'step-014', order: 3, description: 'Esperar 5 segundos' },
            { id: 'step-015', order: 4, description: 'Registrar cumplimiento' },
        ],
        procedure: 'El terapeuta se asegura de tener la atención del estudiante antes de dar la instrucción. La instrucción se da una sola vez de manera clara. Se espera 5 segundos para que el estudiante inicie la acción. Si cumple, se refuerza. Si no cumple, se repite con ayuda física.',
        sets: [
            {
                id: 'set-003',
                name: 'Instrucciones Básicas',
                items: ['Siéntate', 'Párate', 'Ven aquí', 'Dame', 'Toca', 'Señala', 'Aplaude', 'Salta', 'Gira', 'Camina'],
            },
        ],
        createdDate: '2023-05-20',
        lastModified: '2025-11-15',
        createdBy: 'María González',
    },

    // Behavior Management Programs
    {
        id: 'prog-005',
        studentId: 'std-001',
        category: 'behavior-management',
        name: 'Reducción de Rabietas',
        status: 'active',
        topography: 'Gritos, llanto intenso, tirarse al suelo, golpear superficies',
        operationalDefinition: 'Cualquier episodio de llanto intenso (volumen superior a conversación normal) acompañado de al menos uno de los siguientes: gritos, tirarse al suelo, o golpear superficies, que dure más de 10 segundos continuos.',
        functions: ['escape', 'attention'],
        procedure: 'Extinción de escape: No se retira la demanda durante la rabieta. Atención mínima: Se mantiene proximidad física pero sin contacto visual ni verbal. Reforzamiento diferencial: Se refuerza inmediatamente cuando el estudiante se calma y cumple con la instrucción original. Sistema de economía de fichas para periodos sin rabietas.',
        createdDate: '2023-06-01',
        lastModified: '2026-01-22',
        createdBy: 'Carlos Ramírez',
    },
    {
        id: 'prog-006',
        studentId: 'std-001',
        category: 'behavior-management',
        name: 'Manejo de Conducta Autolesiva',
        status: 'active',
        topography: 'Golpearse la cabeza con las manos, morderse las manos',
        operationalDefinition: 'Cualquier instancia en la que el estudiante hace contacto con su cabeza usando sus manos con fuerza suficiente para producir sonido audible, o lleva sus manos a la boca y cierra los dientes sobre la piel.',
        functions: ['sensory', 'escape'],
        procedure: 'Bloqueo de respuesta: Intervención física inmediata para prevenir el contacto. Reforzamiento no contingente: Acceso a estimulación sensorial apropiada cada 2 minutos independiente de la conducta. Enseñanza de conducta alternativa: Entrenamiento en solicitar "break" o acceso a juguetes sensoriales. Análisis funcional continuo para ajustar intervención.',
        createdDate: '2023-07-15',
        lastModified: '2026-01-21',
        createdBy: 'Carlos Ramírez',
    },
    {
        id: 'prog-007',
        studentId: 'std-001',
        category: 'behavior-management',
        name: 'Reducción de Ecolalia No Funcional',
        status: 'discontinued',
        topography: 'Repetición de frases de programas de TV, canciones o conversaciones previas',
        operationalDefinition: 'Repetición verbal de frases completas o parciales que no son apropiadas para el contexto actual, incluyendo diálogos de medios o conversaciones pasadas, que ocurren sin función comunicativa aparente.',
        functions: ['sensory'],
        procedure: 'Interrupción y redirección: Cuando ocurre ecolalia, se interrumpe suavemente y se redirige a actividad funcional. Reforzamiento diferencial de lenguaje funcional: Se refuerza intensamente cualquier uso apropiado del lenguaje. Enseñanza de scripts funcionales para reemplazar ecolalia.',
        createdDate: '2023-08-10',
        lastModified: '2025-10-30',
        createdBy: 'María González',
    },
];
