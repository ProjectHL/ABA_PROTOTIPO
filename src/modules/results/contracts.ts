import { z } from 'zod';

export const resultGoalDimension=z.enum(['percentage','frequency','interval','duration','latency']);
export const resultGoalSchema=z.object({id:z.uuid(),clinicId:z.uuid(),studentId:z.uuid(),programId:z.uuid(),dimension:resultGoalDimension,
  comparator:z.enum(['at-least','at-most']),targetValue:z.number().finite(),label:z.string().min(1).max(160),version:z.number().int().positive(),
  archivedAt:z.iso.datetime({offset:true}).nullable(),createdAt:z.iso.datetime({offset:true}),updatedAt:z.iso.datetime({offset:true})}).strict();
export const resultGoalCommandSchema=z.object({schemaVersion:z.literal(2),operationId:z.uuid(),idempotencyKey:z.uuid(),studentId:z.uuid(),programId:z.uuid(),goalId:z.uuid(),
  expectedVersion:z.number().int().nonnegative(),action:z.enum(['create','update','archive']),dimension:resultGoalDimension,comparator:z.enum(['at-least','at-most']),
  targetValue:z.number().finite(),label:z.string().trim().min(1).max(160)}).strict().superRefine((value,ctx)=>{
    if((value.dimension==='percentage'||value.dimension==='interval')&&(value.targetValue<0||value.targetValue>100))ctx.addIssue({code:'custom',path:['targetValue'],message:'La meta porcentual debe estar entre 0 y 100'});
  });
export type ResultGoal=z.infer<typeof resultGoalSchema>;
export type ResultGoalCommand=z.infer<typeof resultGoalCommandSchema>;
