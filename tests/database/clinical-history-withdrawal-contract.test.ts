import {describe,it,expect} from 'vitest';
import {clinicalHistoryCommand} from '../../src/modules/students/contracts';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const current={clinicId:id,operationId:id,idempotencyKey:id,studentId:id,historyId:id,versionId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',supersedesVersionId:id,expectedVersion:2,action:'retire-reference',confirmation:true,payload:{kind:'assessment',descriptor:'Evaluación sintética',dose:null,frequency:null,prescriber:null,startedOn:null,endedOn:null,notes:'Contenido original'}};
describe('clinical reference retirement boundary',()=>{
 it('requires explicit confirmation and a current predecessor/version',()=>{
  expect(clinicalHistoryCommand.safeParse(current).success).toBe(true);
  expect(clinicalHistoryCommand.safeParse({...current,confirmation:false}).success).toBe(false);
  expect(clinicalHistoryCommand.safeParse({...current,expectedVersion:0}).success).toBe(false);
  expect(clinicalHistoryCommand.safeParse({...current,supersedesVersionId:null}).success).toBe(false);
 });
 it('separates non-medication reference retirement from finishing treatment',()=>{
  expect(clinicalHistoryCommand.safeParse({...current,payload:{...current.payload,kind:'medication'}}).success).toBe(false);
  expect(clinicalHistoryCommand.safeParse({...current,payload:{...current.payload,dose:'1'}}).success).toBe(false);
  expect(clinicalHistoryCommand.safeParse({...current,action:'finish-treatment',payload:{...current.payload,kind:'medication',endedOn:'2026-10-10'}}).success).toBe(true);
 });
 it('preserves the existing creation and correction command shapes',()=>{
  expect(clinicalHistoryCommand.safeParse({...current,action:'correct',confirmation:false}).success).toBe(true);
  expect(clinicalHistoryCommand.safeParse({...current,action:'create',confirmation:false,expectedVersion:0,supersedesVersionId:null}).success).toBe(true);
 });
});
