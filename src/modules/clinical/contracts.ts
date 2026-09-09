import { z } from 'zod';
const text=(n:number)=>z.string().trim().min(1).max(n);
const optionalText=(n:number)=>z.string().trim().max(n).default('');
export const uuid=z.uuid();
const date=z.iso.date().refine(s=>s<=new Date().toISOString().slice(0,10),'La fecha no puede ser futura');
const optionalDate=z.union([date,z.literal('')]).default('');
export const studentInput=z.object({
    clinical_id:text(64),initials:text(12),birth_date:date,primary_language:text(32),living_arrangement:optionalText(500),
    guardians:z.array(z.object({initials:text(12),birth_date:optionalDate,relationship:optionalText(80),phone:optionalText(40)}).strict()).max(20),
    siblings:z.array(z.object({initials:text(12),birth_date:optionalDate}).strict()).max(30),
}).strict();
export const measurement=z.discriminatedUnion('dimension',[
    z.object({dimension:z.literal('percentage'),payload:z.object({trials:z.array(z.boolean()).min(1).max(1000)}).strict()}),
    z.object({dimension:z.literal('frequency'),payload:z.object({count:z.number().int().nonnegative().max(1000000),duration_seconds:z.number().positive().max(86400)}).strict()}),
    z.object({dimension:z.literal('interval'),payload:z.object({type:z.enum(['whole','partial','momentary']),duration_seconds:z.number().positive().max(86400),intervals:z.array(z.boolean().nullable()).min(1).max(1000)}).strict()}),
]);
export const designSchema=z.discriminatedUnion('kind',[
    z.object({kind:z.literal('acquisition'),goal:text(2000),skillArea:text(200),antecedent:text(2000),steps:z.array(text(1000)).min(1).max(100),teachingProcedure:text(2000),sets:z.array(text(1000)).min(1).max(100),promptLevels:z.array(text(200)).min(1).max(50),errorCorrection:text(2000),masteryCriterion:text(1000)}).strict(),
    z.object({kind:z.literal('behavior'),topography:text(2000),operationalDefinition:text(2000),hypothesizedFunction:text(1000),replacementBehavior:text(1000),measurementUnit:z.enum(['frequency','interval']),preventionStrategy:text(2000),responseStrategy:text(2000),masteryCriterion:text(1000)}).strict(),
]);
const client={clientId:uuid};
export const commandSchema=z.discriminatedUnion('op',[
    z.object({op:z.literal('student'),id:uuid.nullable(),expected:z.string().nullable(),payload:studentInput}).strict(),
    z.object({op:z.literal('context'),...client,expected:z.number().int().positive().optional(),home:optionalText(2000),school:optionalText(500),adaptations:optionalText(2000)}).strict(),
    z.object({op:z.literal('history'),...client,kind:z.enum(['reported_diagnosis','assessment','procedure','medication']),descriptor:text(200),occurred:optionalDate,dose:optionalText(120),prescriber:optionalText(120),started:optionalDate,ended:optionalDate,supersedes:uuid.optional()}).strict(),
    z.object({op:z.literal('consent'),...client,purpose:text(80),notice:text(80),grantor:text(120),channel:text(80),reference:optionalText(200),status:z.enum(['pending_review','valid','revoked','expired']),supersedes:uuid.optional()}).strict(),
    z.object({op:z.literal('program'),...client,title:text(160),design:designSchema,predecessor:uuid.optional()}).strict(),
    z.object({op:z.literal('transition'),...client,programId:uuid,versionId:uuid,status:z.enum(['active','paused','achieved','discontinued'])}).strict(),
    z.object({op:z.literal('record'),...client,id:uuid,sessionId:uuid,versionId:uuid,expected:z.number().int().nonnegative(),submit:z.boolean(),measurement}).strict(),
    z.object({op:z.literal('finish'),...client,sessionId:uuid}).strict(),
    z.object({op:z.literal('invite'),operationId:uuid,email:z.string().trim().email().max(254),role:z.enum(['admin','supervisor','therapist'])}).strict(),
    z.object({op:z.literal('member'),userId:uuid,role:z.enum(['admin','supervisor','therapist']),status:z.enum(['active','inactive'])}).strict(),
    z.object({op:z.literal('assignment'),...client,userId:uuid,role:z.enum(['supervisor','therapist']),status:z.enum(['active','inactive'])}).strict(),
]);
export type ClinicalCommand=z.input<typeof commandSchema>;
export type StudentInput=z.input<typeof studentInput>;
export type Measurement=z.infer<typeof measurement>;
export function metric(value: Measurement): { value: number | null; unit: string } {
    if(value.dimension==='percentage') return {value:100*value.payload.trials.filter(Boolean).length/value.payload.trials.length,unit:'% independientes'};
    if(value.dimension==='frequency') return {value:60*value.payload.count/value.payload.duration_seconds,unit:'eventos/min'};
    const observed=value.payload.intervals.filter(x=>x!==null);
    return {value:observed.length?100*observed.filter(Boolean).length/observed.length:null,unit:'% intervalos observados'};
}
