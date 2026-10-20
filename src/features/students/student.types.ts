import {
  displayStudentName, type AuthorizedStudentSummary, type ClinicalHistoryDto, type ConsentDto,
  type StudentDetailDto, type StudentPersonDto, type StudentSiblingDto,
} from '@/modules/students/contracts';

export interface MedicationRecord {
  id: string; historyId: string; versionId: string; version: number | null;
  name: string;
  dose: string | null;
  frequency: string | null;
  status: 'active' | 'inactive' | 'superseded' | 'entered_in_error';
  startDate: string | null;
  endDate: string | null;
  prescribedBy: string | null;
  notes: string | null;
  supersedesVersionId: string | null;
  createdAt: string;
  history?: MedicationRecord[];
}

export interface LegalDocument {
  id: string;
  name: string;
  type: 'consent' | 'medical' | 'authorization' | 'other';
  uploadDate: string;
  fileSize: string | null;
  version: number | null;
}

/** Presentation model; all values originate in an authorized DTO. */
export interface StudentProfile {
  id: string; clinicId: string; displayName: string; initials: string; photoAttachmentId: string | null;
  /** Deprecated presentation aliases kept while dependent views migrate to DTO names. */
  fullName: string | null; identityNumber: string; familyMembers: StudentPersonDto[];
  hasActiveSession: boolean; familyAccessEnabled: boolean;
  assignedProfessional: string | null;
  avatar?: string; clinicalId: string; rut: string | null; dateOfBirth: string; age: number;
  primaryLanguage: string; livingArrangement: string | null;
  diagnosis: string | null; consultationReason: string | null; context: StudentDetailDto['context'];
  status: 'active' | 'archived'; capabilities: readonly string[]; version: number | null;
  people: StudentPersonDto[]; siblings: StudentSiblingDto[]; history: ClinicalHistoryDto[]; consents: ConsentDto[];
  medications: MedicationRecord[]; legalDocuments: LegalDocument[]; registrationDate: string; updatedAt: string;
}

function calculateAge(birthDate: string): number {
  const now = new Date(); const born = new Date(`${birthDate}T00:00:00`);
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age -= 1;
  return Math.max(0, age);
}

export function medicationFromHistory(entry: ClinicalHistoryDto): MedicationRecord | null {
  if (entry.kind !== 'medication') return null;
  return { id: entry.versionId, historyId: entry.historyId, versionId: entry.versionId, version: entry.version, name: entry.descriptor, dose: entry.dose, frequency: entry.frequency,
    status: entry.status, startDate: entry.startedOn, endDate: entry.endedOn, prescribedBy: entry.prescriber,
    notes: entry.notes, supersedesVersionId: entry.supersedesVersionId, createdAt: entry.createdAt, history: [] };
}

function currentMedications(history: ClinicalHistoryDto[]): MedicationRecord[] {
  const groups = new Map<string, MedicationRecord[]>();
  for (const entry of history) {
    const medication = medicationFromHistory(entry);
    if (!medication) continue;
    const group = groups.get(medication.historyId) ?? [];
    group.push(medication); groups.set(medication.historyId, group);
  }
  return [...groups.values()].map((group) => {
    const ordered = [...group].sort((left, right) => (right.version ?? 0) - (left.version ?? 0) || right.createdAt.localeCompare(left.createdAt));
    return { ...ordered[0], history: ordered.slice(1) };
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function mapStudentDetail(dto: StudentDetailDto): StudentProfile {
  return {
    id: dto.id, clinicId: dto.clinicId, displayName: displayStudentName(dto), fullName: dto.fullName, initials: dto.initials,
    photoAttachmentId: dto.photoAttachmentId, clinicalId: dto.clinicalId, rut: dto.rut, dateOfBirth: dto.birthDate, primaryLanguage: dto.primaryLanguage, livingArrangement: dto.livingArrangement,
    age: calculateAge(dto.birthDate), diagnosis: dto.reportedDiagnosis, consultationReason: dto.consultationReason,
    context: dto.context, status: dto.status, capabilities: dto.capabilities, version: dto.version,
    identityNumber: dto.clinicalId, familyMembers: dto.people, hasActiveSession: dto.hasActiveSession, familyAccessEnabled: dto.familyAccessEnabled, assignedProfessional: dto.assignedProfessional, people: dto.people, siblings: dto.siblings, history: dto.history, consents: dto.consents,
    medications: currentMedications(dto.history),
    legalDocuments: [], registrationDate: dto.createdAt.slice(0, 10), updatedAt: dto.updatedAt,
  };
}

export function mapStudentSummary(dto: AuthorizedStudentSummary): StudentProfile {
  return {
    id: dto.id, clinicId: dto.clinicId, displayName: dto.displayName, fullName: null, initials: dto.initials,
    photoAttachmentId: dto.photoAttachmentId, clinicalId: dto.clinicalId, rut: dto.rut, dateOfBirth: '', age: 0, primaryLanguage: '', livingArrangement: null,
    identityNumber: '', diagnosis: dto.reportedDiagnosis, consultationReason: null, context: { home: '', school: '', adaptations: '' },
    status: dto.status, capabilities: dto.capabilities, version: dto.version, familyMembers: [], hasActiveSession: dto.hasActiveSession, familyAccessEnabled: dto.familyAccessEnabled, assignedProfessional: dto.assignedProfessional, people: [], siblings: [], history: [], medications: [], consents: [], legalDocuments: [], registrationDate: '', updatedAt: '',
  };
}

export const DEFAULT_REPORTED_DIAGNOSES = [
  'TEA Nivel 1', 'TEA Nivel 2', 'TEA Nivel 3', 'Retraso Global del Desarrollo',
] as const;
