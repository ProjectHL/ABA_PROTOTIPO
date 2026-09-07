import { describe,expect,it } from 'vitest';
import { commandSchema,measurement,metric,studentInput } from './contracts';

describe('clinical input contracts',()=>{
    it('rejects civil identity aliases, future birth dates and extra fields',()=>{
        expect(studentInput.safeParse({clinical_id:'A',initials:'A.B.',birth_date:'2099-01-01',primary_language:'Español',living_arrangement:'',guardians:[],siblings:[]}).success).toBe(false);
        expect(studentInput.safeParse({clinical_id:'A',initials:'A.B.',birth_date:'2015-01-01',primary_language:'Español',living_arrangement:'',guardians:[],siblings:[],rut:'1-9'}).success).toBe(false);
    });
    it('keeps unobserved interval different from no occurrence',()=>{
        const draft=measurement.parse({dimension:'interval',payload:{type:'whole',duration_seconds:30,intervals:[true,false,null]}});
        expect(metric(draft).value).toBe(50);
    });
    it('rejects empty trials and invalid frequency denominators',()=>{
        expect(measurement.safeParse({dimension:'percentage',payload:{trials:[]}}).success).toBe(false);
        expect(measurement.safeParse({dimension:'frequency',payload:{count:1,duration_seconds:0}}).success).toBe(false);
    });
    it('accepts only valid clinic invitation roles and normalized emails',()=>{
        expect(commandSchema.parse({op:'invite',email:' Admin@Example.com ',role:'supervisor'})).toMatchObject({email:'Admin@Example.com',role:'supervisor'});
        expect(commandSchema.safeParse({op:'invite',email:'not-an-email',role:'supervisor'}).success).toBe(false);
        expect(commandSchema.safeParse({op:'invite',email:'admin@example.com',role:'superadmin'}).success).toBe(false);
    });
});
