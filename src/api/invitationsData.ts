// ==================== SHARED ACCESS DTOs ====================

/**
 * Representa una invitación de acceso compartido a una carpeta de estudiante
 * Flujo: Supervisor COMPARTE → Profesional ACEPTA/RECHAZA
 */
export interface SharedAccess {
    id: string;
    sharedBy: string; // ID del supervisor que comparte
    sharedWith: string; // Email del profesional
    studentId: string;
    studentName: string;
    professionalName?: string; // Nombre si está registrado, null si no
    professionalTitle?: string; // Título profesional
    sharedDate: string; // ISO date - Fecha en que se compartió
    accessLevel: 'full' | 'read-only' | 'programs-only';
    status: 'pending' | 'accepted' | 'rejected';
    message?: string; // Mensaje opcional del supervisor
}

// ==================== HELPER: GENERAR DATOS MOCK ====================

/**
 * Genera datos mock de invitaciones compartidas
 * @param count Número de invitaciones a generar (default: 12)
 */
function generateMockSharedAccess(count: number = 12): SharedAccess[] {
    const supervisorId = 'sup-001'; // María González (del supervisorProfile)

    const professionals = [
        { name: 'Dr. Roberto Sánchez', title: 'Psicólogo Clínico', email: 'roberto.sanchez@example.com' },
        { name: 'Lic. Carmen Flores', title: 'Terapeuta Ocupacional', email: 'carmen.flores@example.com' },
        { name: 'Mg. Laura Mendoza', title: 'Fonoaudióloga', email: 'laura.mendoza@example.com' },
        { name: 'Dr. Andrés Vargas', title: 'Neurólogo Infantil', email: 'andres.vargas@example.com' },
        { name: 'Lic. Patricia Ruiz', title: 'Psicopedagoga', email: 'patricia.ruiz@example.com' },
        { name: 'Dra. Sofía Morales', title: 'Psiquiatra Infantil', email: 'sofia.morales@example.com' },
        { name: 'Lic. Diego Torres', title: 'Terapeuta ABA', email: 'diego.torres@example.com' },
        { name: 'Mg. Ana Castillo', title: 'Educadora Especial', email: 'ana.castillo@example.com' },
    ];

    const students = [
        { id: 'std-001', name: 'Santiago García Pérez' },
        { id: 'std-002', name: 'Valentina Rodríguez Muñoz' },
        { id: 'std-003', name: 'Mateo López Fernández' },
        { id: 'std-004', name: 'Sofía Martínez Soto' },
        { id: 'std-005', name: 'Lucas Hernández Díaz' },
    ];

    const accessLevels: Array<'full' | 'read-only' | 'programs-only'> = ['full', 'read-only', 'programs-only'];

    const messages = [
        'Solicito tu colaboración para la evaluación inicial del estudiante.',
        'Necesito tu apoyo profesional en el seguimiento del caso.',
        'Te comparto acceso para coordinación interdisciplinaria.',
        'Requiero tu evaluación especializada para el plan de intervención.',
        'Comparto acceso para revisión de programas educativos.',
        'Necesito tu opinión profesional sobre el progreso del estudiante.',
    ];

    const invitations: SharedAccess[] = [];

    // Generar invitaciones
    for (let i = 0; i < count; i++) {
        const professional = professionals[i % professionals.length];
        const student = students[i % students.length];
        const accessLevel = accessLevels[i % accessLevels.length];

        // Distribuir estados: ~40% pending, ~50% accepted, ~10% rejected
        let status: 'pending' | 'accepted' | 'rejected';
        if (i < Math.floor(count * 0.4)) {
            status = 'pending';
        } else if (i < Math.floor(count * 0.9)) {
            status = 'accepted';
        } else {
            status = 'rejected';
        }

        // Generar fechas (últimos 30 días)
        const daysAgo = Math.floor(Math.random() * 30);
        const sharedDate = new Date();
        sharedDate.setDate(sharedDate.getDate() - daysAgo);

        invitations.push({
            id: `inv-${String(i + 1).padStart(3, '0')}`,
            sharedBy: supervisorId,
            sharedWith: professional.email,
            studentId: student.id,
            studentName: student.name,
            professionalName: professional.name,
            professionalTitle: professional.title,
            sharedDate: sharedDate.toISOString(),
            accessLevel,
            status,
            message: i % 2 === 0 ? messages[i % messages.length] : undefined,
        });
    }

    // Ordenar por fecha (más recientes primero)
    return invitations.sort((a, b) =>
        new Date(b.sharedDate).getTime() - new Date(a.sharedDate).getTime()
    );
}

// ==================== MOCK DATA ====================

export const mockSharedAccess: SharedAccess[] = generateMockSharedAccess(15);

// ==================== EXPORTS ====================

// Exportar también la función generadora por si se necesita
export { generateMockSharedAccess };
