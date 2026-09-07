import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { type PGlite } from '@electric-sql/pglite';
import { asUser, createTestDatabase } from './harness';

describe('MVP clinic contracts (real PostgreSQL roles, synthetic identities)', () => {
    let db: PGlite;
    const orgA=randomUUID(), orgB=randomUUID(), adminA=randomUUID(), adminB=randomUUID();
    const supervisor=randomUUID(), technician=randomUUID(), future=randomUUID();
    let clientA: { id: string; updated_at: string }, clientB: { id: string };
    let program: { id: string; program_id: string };
    const sessionId=randomUUID(), recordId=randomUUID();
    const payload={clinical_id:'DUMMY-001',initials:'A.B.',birth_date:'2015-01-01',primary_language:'Español',guardians:[{initials:'M.B.',relationship:'Madre'}],siblings:[]};
    const command=async (org:string, client:string|null, version:string|null, value=payload) => {
        const r=await db.query<{ value: typeof clientA }>('select public.mvp_save_student($1,$2,$3,$4::jsonb,null) value',[org,client,version,JSON.stringify(value)]);
        return r.rows[0].value;
    };
    beforeAll(async () => {
        db=await createTestDatabase();
        for (const id of [adminA,adminB,supervisor,technician,future]) await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${id}@example.invalid`]);
        await db.query("insert into organizations(id,name) values($1,'Dummy A'),($2,'Dummy B')",[orgA,orgB]);
        for (const [org,id,role] of [[orgA,adminA,'admin'],[orgB,adminB,'admin'],[orgA,supervisor,'supervisor'],[orgA,technician,'therapist'],[orgA,future,'supervisor']]) {
            await db.query('insert into memberships(organization_id,user_id,role) values($1,$2,$3)',[org,id,role]);
        }
        clientA=await asUser(db,adminA,()=>command(orgA,null,null));
        clientB=await asUser(db,adminB,()=>command(orgB,null,null));
        await db.query("insert into student_assignments(organization_id,client_id,user_id,role,created_by) values($1,$2,$3,'therapist',$4),($1,$2,$5,'supervisor',$4)",[orgA,clientA.id,technician,adminA,supervisor]);
    },60000);
    afterAll(async()=>{ await db?.close(); });
    it('admin A reads all A but never B via SELECT or capabilities', async()=>{
        await asUser(db,adminA,async()=>{
            expect((await db.query('select id from clients')).rows).toEqual([{id:clientA.id}]);
            expect((await db.query<{cap:string[]}>('select get_student_capabilities($1) cap',[clientB.id])).rows[0].cap).toEqual([]);
            await expect(command(orgB,clientB.id,clientA.updated_at)).rejects.toMatchObject({code:'42501'});
        });
    });
    it('rejects moving a student into a different clinic',async()=>{
        await asUser(db,adminA,()=>expect(db.query('update clients set organization_id=$1 where id=$2',[orgB,clientA.id])).rejects.toMatchObject({code:'42501'}));
    });
    it('technician reads assigned student but cannot edit',async()=>{
        await asUser(db,technician,async()=>{
            expect((await db.query('select id from clients')).rows).toHaveLength(1);
            await expect(command(orgA,clientA.id,clientA.updated_at)).rejects.toMatchObject({code:'42501'});
        });
    });
    it('non-primary supervisor cannot decide/revoke authorizations',async()=>{
        await asUser(db,supervisor,async()=>{
            const cap=(await db.query<{cap:string[]}>('select get_student_capabilities($1) cap',[clientA.id])).rows[0].cap;
            expect(cap).toContain('student.edit'); expect(cap).not.toContain('authorization.decide');
        });
    });
    it('future primary supervisor has no capabilities or privileged helper access',async()=>{
        await db.query("update student_assignments set is_primary=false where client_id=$1",[clientA.id]);
        await db.query("insert into student_assignments(organization_id,client_id,user_id,role,is_primary,effective_at,created_by) values($1,$2,$3,'supervisor',true,now()+interval '1 day',$4)",[orgA,clientA.id,future,adminA]);
        await asUser(db,future,async()=>{
            expect((await db.query<{ok:boolean}>('select private.is_primary_student_supervisor($1) ok',[clientA.id])).rows[0].ok).toBe(false);
            expect((await db.query('select id from clients')).rows).toEqual([]);
        });
    });
    it('suspension denies immediately and prevents last-admin removal',async()=>{
        await asUser(db,adminA,async()=>{
            await expect(db.query("select mvp_set_member($1,$2,'admin','inactive')",[orgA,adminA])).rejects.toMatchObject({code:'22023'});
            await db.query("select mvp_set_member($1,$2,'therapist','inactive')",[orgA,technician]);
        });
        await asUser(db,technician,async()=>{expect((await db.query('select id from clients')).rows).toEqual([]);});
        await asUser(db,adminA,()=>db.query("select mvp_set_member($1,$2,'therapist','active')",[orgA,technician]));
    });
    it('atomic family edit survives reread and rejects stale version',async()=>{
        await asUser(db,adminA,async()=>{
            const edited=await command(orgA,clientA.id,clientA.updated_at,{...payload,initials:'A.C.'});
            await expect(command(orgA,clientA.id,clientA.updated_at)).rejects.toMatchObject({code:'40001'});
            expect((await db.query('select initials from guardians where client_id=$1',[clientA.id])).rows).toEqual([{initials:'M.B.'}]);
            clientA=edited;
        });
    });
    it('creates and activates a versioned program with audit',async()=>{
        const design={kind:'acquisition',goal:'Identificar',skillArea:'Lenguaje',antecedent:'Tarjeta',steps:['Presentar'],teachingProcedure:'Ensayo',sets:['Set A'],promptLevels:['Independiente'],errorCorrection:'Modelar',masteryCriterion:'80%'};
        await asUser(db,adminA,async()=>{
            program=(await db.query<{value: typeof program}>("select to_jsonb(create_program_draft($1,'acquisition','Programa dummy',$2::jsonb)) value",[clientA.id,JSON.stringify(design)])).rows[0].value;
            await db.query("select transition_program($1,$2,'active')",[program.program_id,program.id]);
        });
    });
    const save=(value:unknown,version:number,submit:boolean, client=clientA.id)=>db.query<{value:{version:number;submitted:boolean}}>(
        "select mvp_save_record($1,$2,$3,$4,'percentage',$5::jsonb,$6,$7) value",[recordId,sessionId,client,program.id,JSON.stringify(value),version,submit]);
    it('saves draft, retries idempotently, refuses empty/mismatched recordings',async()=>{
        await asUser(db,technician,async()=>{
            await expect(save({trials:[]},0,false)).rejects.toMatchObject({code:'22023'});
            expect((await save({trials:[true,false]},0,false)).rows[0].value.version).toBe(1);
            expect((await save({trials:[true,false]},0,false)).rows[0].value.version).toBe(1);
            await expect(save({trials:[true]},0,false)).rejects.toMatchObject({code:'40001'});
            await expect(db.query('select mvp_finish_session($1)',[sessionId])).rejects.toMatchObject({code:'22023'});
        });
        await asUser(db,adminB,()=>expect(save({trials:[true]},0,false,clientB.id)).rejects.toBeDefined());
    });
    it('submits and finishes without duplicate records; disallows direct bypass',async()=>{
        await asUser(db,technician,async()=>{
            expect((await save({trials:[true,false]},1,true)).rows[0].value.submitted).toBe(true);
            await db.query('select mvp_finish_session($1)',[sessionId]);
            await db.query('select mvp_finish_session($1)',[sessionId]);
            expect((await db.query('select id from session_program_records')).rows).toHaveLength(1);
            await expect(db.query("update clinical_sessions set status='draft' where id=$1",[sessionId])).rejects.toMatchObject({code:'42501'});
            await expect(save({trials:[false]},2,true)).rejects.toMatchObject({code:'40001'});
        });
    });
    it('anonymous cannot call clinical commands',async()=>{
        await db.exec('set role anon');
        try { await expect(command(orgA,null,null)).rejects.toMatchObject({code:'42501'}); }
        finally { await db.exec('reset role'); }
    });
    it('inventories then removes one dummy lot while preserving accounts and clinic',async()=>{
        const token=randomUUID();
        const foreignClinicalAudit=randomUUID();
        await db.query('update clients set test_run_id=$1 where id in ($2,$3)',[token,clientA.id,clientB.id]);
        await db.query("insert into audit_events(organization_id,entity_type,entity_id,action,test_run_id) values($1,'client',$2,'updated',$3) returning id",[orgB,clientB.id,token]);
        const auditId=(await db.query<{id:string}>("select id::text from audit_events where organization_id=$1 and entity_id=$2 and test_run_id=$3 order by id desc limit 1",[orgB,clientB.id,token])).rows[0].id;
        await db.query("insert into clinical_audit_events(organization_id,client_id,entity_type,entity_id,action,test_run_id) values($1,$2,'assessment',$3,'updated',$4)",[orgB,clientB.id,foreignClinicalAudit,token]);
        await asUser(db,adminA,async()=>{
            const dry=(await db.query<{value:{executed:boolean;clients:number;required_confirmation:string}}>('select mvp_cleanup_test_run($1,$2,null) value',[orgA,token])).rows[0].value;
            expect(dry).toMatchObject({executed:false,clients:1});
            await db.query('select mvp_cleanup_test_run($1,$2,$3)',[orgA,token,dry.required_confirmation]);
        });
        expect((await db.query('select id from clients where id=$1',[clientA.id])).rows).toEqual([]);
        expect((await db.query('select id from clients where id=$1',[clientB.id])).rows).toHaveLength(1);
        expect((await db.query('select id from audit_events where id=$1',[auditId])).rows).toHaveLength(1);
        expect((await db.query('select id from clinical_audit_events where entity_id=$1',[foreignClinicalAudit])).rows).toHaveLength(1);
        expect((await db.query('select user_id from memberships where organization_id=$1',[orgA])).rows.length).toBeGreaterThan(0);
        expect((await db.query('select id from organizations where id=$1',[orgA])).rows).toHaveLength(1);
    });
});
