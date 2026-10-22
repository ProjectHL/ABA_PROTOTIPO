import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { type PGlite } from '@electric-sql/pglite';
import { asUser, createTestDatabase } from './harness';

describe('MVP clinic contracts (real PostgreSQL roles, synthetic identities)', () => {
    let db: PGlite;
    const orgA=randomUUID(), orgB=randomUUID(), adminA=randomUUID(), adminB=randomUUID();
    const supervisor=randomUUID(), technician=randomUUID(), future=randomUUID();
    const invitedProfessional=randomUUID();
    let clientA: { id: string; updated_at: string }, clientB: { id: string };
    const payload={clinical_id:'DUMMY-001',initials:'A.B.',birth_date:'2015-01-01',primary_language:'Español',guardians:[{initials:'M.B.',relationship:'Madre'}],siblings:[]};
    const command=async (org:string, client:string|null, version:string|null, value=payload, testRun:string|null=null) => {
        const r=await db.query<{ value: typeof clientA & {test_run_id:string|null} }>('select public.mvp_save_student($1,$2,$3,$4::jsonb,$5) value',[org,client,version,JSON.stringify(value),testRun]);
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
    it('revives a soft-deleted identity on a new invitation',async()=>{
        const email='deleted.professional@example.invalid';
        const deletedUser=randomUUID();
        await db.query('insert into auth.users(id,email,deleted_at) values($1,$2,now())',[deletedUser,email]);
        const operation=randomUUID();
        await asUser(db,adminA,async()=>{
            await db.query("select mvp_begin_clinic_invitation($1,$2,$3,'therapist')",[orgA,operation,email]);
            const completed=(await db.query<{value:{user_id:string}}>(
                'select mvp_complete_clinic_invitation($1,$2) value',[orgA,operation],
            )).rows[0].value;
            expect(completed.user_id).toBe(deletedUser);
        });
        expect((await db.query<{deleted_at:string|null}>('select deleted_at::text from auth.users where id=$1',[deletedUser])).rows[0].deleted_at).toBeNull();
        expect((await db.query("select status from memberships where organization_id=$1 and user_id=$2",[orgA,deletedUser])).rows)
            .toEqual([{status:'pending'}]);
    });
    it('test-run assignments inherit the student batch',async()=>{
        const batch=randomUUID();
        await db.query('insert into test_data_batches(organization_id,id,created_by) values($1,$2,$3)',[orgA,batch,adminA]);
        const testClient=await asUser(db,adminA,()=>command(orgA,null,null,{...payload,clinical_id:'DUMMY-TEST-001'},batch));
        await asUser(db,adminA,async()=>{
            const assigned=(await db.query<{user_id:string;test_run_id:string|null}>(
                "select user_id,test_run_id from set_student_assignment($1,$2,'therapist','active')",[testClient.id,technician],
            )).rows[0];
            expect(assigned).toMatchObject({user_id:technician,test_run_id:batch});
            await db.query("select set_student_assignment($1,$2,'therapist','inactive')",[testClient.id,technician]);
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
    it('retries a durable invitation without duplicate membership or audit',async()=>{
        const firstOperation=randomUUID(), retryOperation=randomUUID();
        const email='new.professional@example.invalid';
        await asUser(db,supervisor,()=>expect(
            db.query("select mvp_begin_clinic_invitation($1,$2,$3,'supervisor')",[orgA,firstOperation,email]),
        ).rejects.toMatchObject({code:'42501'}));
        await asUser(db,adminA,async()=>{
            const first=(await db.query<{value:{operation_id:string;status:string}}>(
                "select mvp_begin_clinic_invitation($1,$2,$3,'supervisor') value",
                [orgA,firstOperation,email],
            )).rows[0].value;
            expect(first).toMatchObject({operation_id:firstOperation,status:'pending'});
            const retried=(await db.query<{value:{operation_id:string;status:string}}>(
                "select mvp_begin_clinic_invitation($1,$2,$3,'supervisor') value",
                [orgA,retryOperation,email],
            )).rows[0].value;
            expect(retried).toMatchObject({operation_id:firstOperation,status:'pending'});
            await expect(db.query('select mvp_complete_clinic_invitation($1,$2)',[orgA,firstOperation]))
                .rejects.toMatchObject({code:'22023'});
        });
        await db.query('insert into auth.users(id,email) values($1,$2)',[invitedProfessional,email]);
        await asUser(db,adminA,async()=>{
            const completed=(await db.query<{value:{operation_id:string;status:string;user_id:string;role:string}}>(
                'select mvp_complete_clinic_invitation($1,$2) value',[orgA,firstOperation],
            )).rows[0].value;
            expect(completed).toMatchObject({operation_id:firstOperation,status:'completed',user_id:invitedProfessional,role:'supervisor'});
            await db.query('select mvp_complete_clinic_invitation($1,$2)',[orgA,firstOperation]);
        });
        expect((await db.query('select user_id,role,status from memberships where organization_id=$1 and user_id=$2',[orgA,invitedProfessional])).rows)
            .toEqual([{user_id:invitedProfessional,role:'supervisor',status:'pending'}]);
        // An invitation is not access: the pending member sees no clinical data.
        await asUser(db,invitedProfessional,async()=>{
            expect((await db.query('select id from clients')).rows).toEqual([]);
            // Identity context exposes no clinic choice while the invitation is pending.
            expect((await db.query<{choices:unknown[]}>("select (aba_identity_context())->'choices' choices")).rows[0].choices).toEqual([]);
        });
        expect((await db.query("select id from clinic_admin_events where organization_id=$1 and subject_user_id=$2 and action='invitation_completed:supervisor'",[orgA,invitedProfessional])).rows)
            .toHaveLength(1);
        // A pending invitation must stay eligible for an explicit resend; the
        // old `active`-only rule hid every existing guest from that panel.
        await asUser(db,adminA,async()=>{
            const listed=(await db.query<{value:{email:string;accepted:boolean;eligible:boolean}[]}>(
                'select aba_team_invitation_deliveries($1) value',[orgA],
            )).rows[0].value;
            expect(listed.find(row=>row.email==='new.professional@example.invalid')).toMatchObject({accepted:false,eligible:true});
        });
    });
    it('keeps the session capture time immutable across later commands',async()=>{
        const sessionId=randomUUID();
        const envelope=(expectedVersion:number,occurredAt:string,notes:string)=>({
            schemaVersion:2,operationId:randomUUID(),idempotencyKey:randomUUID(),
            studentId:clientA.id,sessionId,expectedVersion,action:'update-notes',
            occurredAt,notes,programs:[],terminalConfirmation:false,
        });
        const captured=new Date('2026-10-20T10:00:00Z').toISOString();
        const edited=new Date('2026-10-20T11:00:00Z').toISOString();
        await asUser(db,adminA,async()=>{
            const first=(await db.query<{status:string}>(
                "select (command_session_v2($1,$2::jsonb))->>'status' status",[orgA,JSON.stringify(envelope(0,captured,'primera'))],
            )).rows[0];
            expect(first).toMatchObject({status:'acknowledged'});
            const second=(await db.query<{status:string}>(
                "select (command_session_v2($1,$2::jsonb))->>'status' status",[orgA,JSON.stringify(envelope(1,edited,'editada'))],
            )).rows[0];
            expect(second).toMatchObject({status:'acknowledged'});
            const state=(await db.query<{captured_at:string}>(
                'select captured_at::text from clinical_session_v2_state where session_id=$1',[sessionId],
            )).rows[0];
            expect(Date.parse(state.captured_at)).toBe(Date.parse(captured));
        });
        // Leave no clinical rows behind for the cleanup contract test.
        await db.query('delete from clinical_session_v2_events where session_id=$1',[sessionId]);
        await db.query('delete from clinical_session_v2_state where session_id=$1',[sessionId]);
        await db.query('delete from clinical_sessions where id=$1',[sessionId]);
    });
    it('atomic family edit survives reread and rejects stale version',async()=>{
        await asUser(db,adminA,async()=>{
            const edited=await command(orgA,clientA.id,clientA.updated_at,{...payload,initials:'A.C.'});
            await expect(command(orgA,clientA.id,clientA.updated_at)).rejects.toMatchObject({code:'40001'});
            expect((await db.query('select initials from guardians where client_id=$1',[clientA.id])).rows).toEqual([{initials:'M.B.'}]);
            clientA=edited;
        });
    });
    it('rejects direct DML that would bypass clinical commands',async()=>{
        await asUser(db,adminA,async()=>{
            const privileges=(await db.query<{
                clients_update:boolean;
                guardians_update:boolean;
                context_update:boolean;
                history_insert:boolean;
            }>(`select
                has_table_privilege('authenticated','public.clients','update') clients_update,
                has_table_privilege('authenticated','public.guardians','update') guardians_update,
                has_table_privilege('authenticated','public.client_context_profiles','update') context_update,
                has_table_privilege('authenticated','public.clinical_history_entries','insert') history_insert
            `)).rows[0];
            expect(privileges).toEqual({
                clients_update:false,
                guardians_update:false,
                context_update:false,
                history_insert:false,
            });
            await expect(db.query("update clients set initials='X.X.' where id=$1",[clientA.id]))
                .rejects.toMatchObject({code:'42501'});
        });
    });
    it('governs dummy batches and freezes all capability paths',async()=>{
        const token=randomUUID();
        const dummyPayload={...payload,clinical_id:'DUMMY-BATCH',initials:'D.B.'};
        await asUser(db,supervisor,async()=>{
            await expect(db.query('select mvp_open_test_batch($1,$2)',[orgA,token]))
                .rejects.toMatchObject({code:'42501'});
            await expect(command(orgA,null,null,dummyPayload,token))
                .rejects.toMatchObject({code:'42501'});
        });
        await asUser(db,adminA,async()=>{
            await db.query('select mvp_open_test_batch($1,$2)',[orgA,token]);
            await db.query('select mvp_open_test_batch($1,$2)',[orgA,token]);
            const dummy=await command(orgA,null,null,dummyPayload,token);
            expect(dummy.test_run_id).toBe(token);
            await db.query('select mvp_freeze_test_batch($1,$2)',[orgA,token]);
            expect((await db.query<{cap:string[]}>('select get_student_capabilities($1) cap',[dummy.id])).rows[0].cap).toEqual([]);
            await expect(command(orgA,null,null,{...dummyPayload,clinical_id:'DUMMY-FROZEN'},token))
                .rejects.toMatchObject({code:'22023'});
        });
    });
    it('keeps legacy program write RPCs closed after V2 cutover',async()=>{
        const design={kind:'acquisition',goal:'Identificar',skillArea:'Lenguaje',antecedent:'Tarjeta',steps:['Presentar'],teachingProcedure:'Ensayo',sets:['Set A'],promptLevels:['Independiente'],errorCorrection:'Modelar',masteryCriterion:'80%'};
        await asUser(db,adminA,async()=>{
            await expect(db.query("select create_program_draft($1,'acquisition','Programa dummy',$2::jsonb)",
                [clientA.id,JSON.stringify(design)])).rejects.toMatchObject({code:'42501'});
            await expect(db.query("select transition_program($1,$2,'active')",[randomUUID(),randomUUID()]))
                .rejects.toMatchObject({code:'42501'});
        });
    });
    it('keeps legacy capture and session-finish RPCs closed',async()=>{
        const save=(client:string)=>db.query(
            "select mvp_save_record($1,$2,$3,$4,'percentage',$5::jsonb,$6,$7)",
            [randomUUID(),randomUUID(),client,randomUUID(),JSON.stringify({trials:[true,false]}),0,false],
        );
        await asUser(db,technician,async()=>{
            await expect(save(clientA.id)).rejects.toMatchObject({code:'42501'});
            await expect(db.query('select mvp_finish_session($1)',[randomUUID()])).rejects.toMatchObject({code:'42501'});
        });
        await asUser(db,adminB,()=>expect(save(clientB.id)).rejects.toMatchObject({code:'42501'}));
    });
    it('disallows direct session DML bypass after V2 cutover',async()=>{
        await asUser(db,technician,async()=>{
            await expect(db.query("update clinical_sessions set status='draft' where id=$1",[randomUUID()]))
                .rejects.toMatchObject({code:'42501'});
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
        await asUser(db,adminA,()=>db.query('select mvp_open_test_batch($1,$2)',[orgA,token]));
        await asUser(db,adminB,()=>db.query('select mvp_open_test_batch($1,$2)',[orgB,token]));
        await db.query('update clients set test_run_id=$1 where id in ($2,$3)',[token,clientA.id,clientB.id]);
        await db.query("insert into audit_events(organization_id,entity_type,entity_id,action,test_run_id) values($1,'client',$2,'updated',$3) returning id",[orgB,clientB.id,token]);
        const auditId=(await db.query<{id:string}>("select id::text from audit_events where organization_id=$1 and entity_id=$2 and test_run_id=$3 order by id desc limit 1",[orgB,clientB.id,token])).rows[0].id;
        await db.query("insert into clinical_audit_events(organization_id,client_id,entity_type,entity_id,action,test_run_id) values($1,$2,'assessment',$3,'updated',$4)",[orgB,clientB.id,foreignClinicalAudit,token]);
        await asUser(db,adminA,async()=>{
            const openDry=(await db.query<{value:{executed:boolean;clients:number;required_confirmation:string;status:string}}>('select mvp_cleanup_test_run($1,$2,null) value',[orgA,token])).rows[0].value;
            expect(openDry).toMatchObject({executed:false,clients:1,status:'open'});
            await expect(db.query('select mvp_cleanup_test_run($1,$2,$3)',[orgA,token,openDry.required_confirmation]))
                .rejects.toMatchObject({code:'22023'});
            await db.query('select mvp_freeze_test_batch($1,$2)',[orgA,token]);
            const dry=(await db.query<{value:{executed:boolean;clients:number;required_confirmation:string;status:string}}>('select mvp_cleanup_test_run($1,$2,null) value',[orgA,token])).rows[0].value;
            expect(dry).toMatchObject({executed:false,clients:1,status:'frozen'});
            await db.query('select mvp_cleanup_test_run($1,$2,$3)',[orgA,token,dry.required_confirmation]);
            const repeated=(await db.query<{value:{executed:boolean;already_cleaned:boolean;status:string}}>('select mvp_cleanup_test_run($1,$2,$3) value',[orgA,token,dry.required_confirmation])).rows[0].value;
            expect(repeated).toMatchObject({executed:false,already_cleaned:true,status:'cleaned'});
        });
        expect((await db.query('select id from clients where id=$1',[clientA.id])).rows).toEqual([]);
        expect((await db.query('select id from clients where id=$1',[clientB.id])).rows).toHaveLength(1);
        expect((await db.query('select id from audit_events where id=$1',[auditId])).rows).toHaveLength(1);
        expect((await db.query('select id from clinical_audit_events where entity_id=$1',[foreignClinicalAudit])).rows).toHaveLength(1);
        expect((await db.query('select user_id from memberships where organization_id=$1',[orgA])).rows.length).toBeGreaterThan(0);
        expect((await db.query('select id from organizations where id=$1',[orgA])).rows).toHaveLength(1);
    });
});
