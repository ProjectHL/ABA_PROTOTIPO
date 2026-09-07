import { describe, expect, it } from 'vitest';
import { mapClientToStudentProfile } from './students.repository';

describe('mapClientToStudentProfile', () => {
    it('mapea solo el contrato clínico disponible sin inventar PII', () => {
        const student = mapClientToStudentProfile({
            id: '00000000-0000-0000-0000-000000000001',
            clinical_id: 'ABA-001',
            initials: 'A.B.',
            birth_date: '2018-06-15',
            status: 'active',
            created_at: '2026-01-02T00:00:00.000Z',
        });

        expect(student.fullName).toBe('A.B.');
        expect(student.identityNumber).toBe('ABA-001');
        expect(student.diagnosis).toBe('No disponible en esta vista');
        expect(student.familyMembers).toEqual([]);
        expect(student.medications).toEqual([]);
    });
});
