export interface UserProfile {
    id: string;
    name: string;
    profession: string;
    title: string;
    description: string;
    avatar: string;
    role: 'admin' | 'supervisor' | 'therapist';
    email: string;
    phone?: string;
    joinedDate: string;
}

export const supervisorProfile: UserProfile = {
    id: 'sup-001',
    name: 'Héctor Dev',
    profession: 'BCBA',
    title: 'Supervisor Clínico',
    description: 'Analista de Conducta certificado con 10+ años de experiencia en intervenciones ABA para TEA.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hector',
    role: 'admin',
    email: 'hector@abaprototipo.com',
    phone: '+56 9 1234 5678',
    joinedDate: '2020-01-15'
};

export const therapistsData: UserProfile[] = [
    {
        id: 'ther-001',
        name: 'María González',
        profession: 'RBT',
        title: 'Terapeuta Conductual',
        description: 'Especialista en programas de habilidades sociales y comunicación funcional.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
        role: 'therapist',
        email: 'maria.gonzalez@abaprototipo.com',
        joinedDate: '2021-03-20'
    },
    {
        id: 'ther-002',
        name: 'Carlos Ramírez',
        profession: 'BCaBA',
        title: 'Asistente de Analista',
        description: 'Enfocado en reducción de conductas desafiantes y análisis funcional.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos',
        role: 'therapist',
        email: 'carlos.ramirez@abaprototipo.com',
        joinedDate: '2021-06-10'
    },
    {
        id: 'ther-003',
        name: 'Ana Martínez',
        profession: 'RBT',
        title: 'Terapeuta Conductual',
        description: 'Experiencia en programas de autonomía personal y habilidades adaptativas.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
        role: 'therapist',
        email: 'ana.martinez@abaprototipo.com',
        joinedDate: '2022-01-15'
    },
    {
        id: 'ther-004',
        name: 'Luis Torres',
        profession: 'RBT',
        title: 'Terapeuta Conductual',
        description: 'Especializado en intervenciones tempranas y programas de imitación.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luis',
        role: 'therapist',
        email: 'luis.torres@abaprototipo.com',
        joinedDate: '2022-08-01'
    },
    {
        id: 'ther-005',
        name: 'Patricia Silva',
        profession: 'BCaBA',
        title: 'Asistente de Analista',
        description: 'Coordinadora de programas de generalización y entrenamiento a padres.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Patricia',
        role: 'therapist',
        email: 'patricia.silva@abaprototipo.com',
        joinedDate: '2023-02-10'
    },
    {
        id: 'ther-006',
        name: 'Jorge Vargas',
        profession: 'RBT',
        title: 'Terapeuta Conductual',
        description: 'Experto en manejo de conductas en entornos escolares y comunitarios.',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jorge',
        role: 'therapist',
        email: 'jorge.vargas@abaprototipo.com',
        joinedDate: '2023-05-20'
    }
];

// ==================== STUDENT DTOs ====================

export interface MedicationRecord {
    id: string;
    name: string;
    dose: string;
    frequency: string;
    status: 'active' | 'inactive';
    startDate: string;
    endDate?: string;
    prescribedBy: string;
    notes?: string;
    history?: MedicationRecord[];
}

export interface FamilyMember {
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimaryContact: boolean;
}

export interface LegalDocument {
    id: string;
    name: string;
    type: 'consent' | 'medical' | 'authorization' | 'other';
    uploadDate: string;
    fileUrl: string;
    fileSize: string;
}

export interface StudentProfile {
    id: string;
    avatar: string;
    fullName: string;
    identityNumber: string;
    dateOfBirth: string;
    age: number;
    diagnosis: string;
    consultationReason: string;
    hasActiveSession: boolean;
    familyAccessEnabled: boolean;

    familyMembers: FamilyMember[];
    medications: MedicationRecord[];
    legalDocuments: LegalDocument[];

    registrationDate: string;
    lastSessionDate?: string;
    assignedTherapist?: string;
    status?: 'active' | 'inactive';
}

export const studentsData: StudentProfile[] = [
    {
        id: 'std-001',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Santiago',
        fullName: 'Santiago García Pérez',
        identityNumber: '12.345.678-9',
        dateOfBirth: '2018-03-15',
        age: 7,
        diagnosis: 'TEA Nivel 2',
        consultationReason: 'Dificultades en comunicación social y patrones de comportamiento repetitivos',
        hasActiveSession: true,
        familyAccessEnabled: true,
        registrationDate: '2023-01-10',
        lastSessionDate: '2026-01-23',
        assignedTherapist: 'María González',

        familyMembers: [
            {
                id: 'fam-001',
                name: 'Carmen Pérez López',
                relationship: 'Madre',
                phone: '+56 9 8765 4321',
                email: 'carmen.perez@email.com',
                isPrimaryContact: true,
            },
            {
                id: 'fam-002',
                name: 'Roberto García Silva',
                relationship: 'Padre',
                phone: '+56 9 8765 4322',
                email: 'roberto.garcia@email.com',
                isPrimaryContact: false,
            },
        ],

        medications: [
            {
                id: 'med-001',
                name: 'Risperidona',
                dose: '0.5 mg',
                frequency: 'Cada 12 horas',
                status: 'active',
                startDate: '2025-06-01',
                prescribedBy: 'Dr. Juan Martínez',
                notes: 'Para manejo de irritabilidad',
            },
            {
                id: 'med-002',
                name: 'Aripiprazol',
                dose: '2 mg',
                frequency: 'Una vez al día',
                status: 'inactive',
                startDate: '2024-01-10',
                endDate: '2025-05-30',
                prescribedBy: 'Dr. Ana Torres',
                notes: 'Suspendido por efectos secundarios',
            },
        ],

        legalDocuments: [
            {
                id: 'doc-001',
                name: 'Consentimiento Informado - Terapia ABA',
                type: 'consent',
                uploadDate: '2023-01-10',
                fileUrl: '/documents/consent-001.pdf',
                fileSize: '245 KB',
            },
            {
                id: 'doc-002',
                name: 'Informe Médico - Diagnóstico',
                type: 'medical',
                uploadDate: '2023-01-08',
                fileUrl: '/documents/medical-001.pdf',
                fileSize: '1.2 MB',
            },
        ],
    },
    {
        id: 'std-002',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Valentina',
        fullName: 'Valentina Rodríguez Muñoz',
        identityNumber: '23.456.789-0',
        dateOfBirth: '2019-07-22',
        age: 6,
        diagnosis: 'TEA Nivel 1',
        consultationReason: 'Dificultades en interacción social y flexibilidad cognitiva',
        hasActiveSession: false,
        familyAccessEnabled: true,
        registrationDate: '2023-03-15',
        lastSessionDate: '2026-01-20',
        assignedTherapist: 'Carlos Ramírez',

        familyMembers: [
            {
                id: 'fam-004',
                name: 'Laura Muñoz Castro',
                relationship: 'Madre',
                phone: '+56 9 7654 3210',
                email: 'laura.munoz@email.com',
                isPrimaryContact: true,
            },
        ],

        medications: [],

        legalDocuments: [
            {
                id: 'doc-004',
                name: 'Consentimiento Informado',
                type: 'consent',
                uploadDate: '2023-03-15',
                fileUrl: '/documents/consent-002.pdf',
                fileSize: '198 KB',
            },
        ],
    },
    {
        id: 'std-003',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mateo',
        fullName: 'Mateo López Fernández',
        identityNumber: '34.567.890-1',
        dateOfBirth: '2017-11-08',
        age: 8,
        diagnosis: 'TEA Nivel 3',
        consultationReason: 'Necesidad de apoyo sustancial en comunicación y conductas adaptativas',
        hasActiveSession: true,
        familyAccessEnabled: false,
        registrationDate: '2022-09-20',
        lastSessionDate: '2026-01-24',
        assignedTherapist: 'Ana Martínez',

        familyMembers: [
            {
                id: 'fam-005',
                name: 'Andrea Fernández Rojas',
                relationship: 'Madre',
                phone: '+56 9 6543 2109',
                email: 'andrea.fernandez@email.com',
                isPrimaryContact: true,
            },
        ],

        medications: [
            {
                id: 'med-005',
                name: 'Risperidona',
                dose: '1 mg',
                frequency: 'Cada 12 horas',
                status: 'active',
                startDate: '2024-02-15',
                prescribedBy: 'Dr. Carlos Vega',
            },
        ],

        legalDocuments: [
            {
                id: 'doc-005',
                name: 'Consentimiento Informado',
                type: 'consent',
                uploadDate: '2022-09-20',
                fileUrl: '/documents/consent-003.pdf',
                fileSize: '210 KB',
            },
        ],
    },
    {
        id: 'std-004',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia',
        fullName: 'Sofía Martínez Soto',
        identityNumber: '45.678.901-2',
        dateOfBirth: '2020-02-14',
        age: 5,
        diagnosis: 'Retraso Global del Desarrollo',
        consultationReason: 'Retraso en habilidades motoras y del lenguaje',
        hasActiveSession: false,
        familyAccessEnabled: true,
        registrationDate: '2024-06-01',
        assignedTherapist: 'Luis Torres',

        familyMembers: [
            {
                id: 'fam-007',
                name: 'Claudia Soto Vargas',
                relationship: 'Madre',
                phone: '+56 9 5432 1098',
                email: 'claudia.soto@email.com',
                isPrimaryContact: true,
            },
        ],

        medications: [],

        legalDocuments: [
            {
                id: 'doc-007',
                name: 'Consentimiento Informado',
                type: 'consent',
                uploadDate: '2024-06-01',
                fileUrl: '/documents/consent-004.pdf',
                fileSize: '175 KB',
            },
        ],
    },
];
