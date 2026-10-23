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
