import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { type PGlite } from '@electric-sql/pglite';
import { asUser, createTestDatabase } from './harness';
import { sessionV2Schema } from '../../src/domain/sessions/session-v2';

describe('MVP clinic contracts (real PostgreSQL roles, synthetic identities)', () => {
    let db: PGlite;
    const orgA=randomUUID(), orgB=randomUUID(), adminA=randomUUID(), adminB=randomUUID();
    const supervisor=randomUUID(), technician=randomUUID(), future=randomUUID();
    const invitedProfessional=randomUUID();
    type FixtureClient = { id: string; updated_at: string; test_run_id: string|null; version: number };
    type FamilyPayload = { clinical_id:string; initials:string; birth_date:string; primary_language:string; living_arrangement?:string|null; guardians?:{initials:string;relationship?:string}[]; siblings?:{initials:string;birth_date?:string}[] };
    let clientA: FixtureClient, clientB: FixtureClient;
    const payload: FamilyPayload={clinical_id:'DUMMY-001',initials:'A.B.',birth_date:'2015-01-01',primary_language:'Español',guardians:[{initials:'M.B.',relationship:'Madre'}],siblings:[]};
    const createFixture=async (org:string, actor:string, value:FamilyPayload=payload, testRun:string|null=null):Promise<FixtureClient> => {
        const id=randomUUID();
        const row=(await db.query<{updated_at:string;test_run_id:string|null}>(
            `insert into clients(id,organization_id,clinical_id,initials,birth_date,primary_language,living_arrangement,test_run_id)
             values($1,$2,$3,$4,$5,$6,$7,$8) returning updated_at,test_run_id`,
            [id,org,value.clinical_id,value.initials,value.birth_date,value.primary_language,value.living_arrangement??null,testRun],
        )).rows[0];
        await db.query(
            `insert into client_profiles_v2(client_id,organization_id,full_name,reported_diagnosis,consultation_reason,context_home,context_school,context_adaptations,version,created_by,updated_by,test_run_id)
             values($1,$2,$3,'','','','','',1,$4,$4,$5)`,
            [id,org,value.initials,actor,testRun],
        );
        for (const guardian of value.guardians??[]) await db.query(
            `insert into client_people_v2(id,client_id,organization_id,full_name,initials,birth_date,relationship,phone,email,roles,is_primary_contact,version,created_by,updated_by,test_run_id)
             values($1,$2,$3,null,$4,null,$5,'',null,array['family'],false,1,$6,$6,$7)`,
            [randomUUID(),id,org,guardian.initials,guardian.relationship??'',actor,testRun],
        );
        for (const sibling of value.siblings??[]) await db.query(
            `insert into client_siblings_v2(id,client_id,organization_id,full_name,initials,birth_date,notes,version,created_by,updated_by,test_run_id)
             values($1,$2,$3,null,$4,$5,'',1,$6,$6,$7)`,
            [randomUUID(),id,org,sibling.initials,sibling.birth_date??null,actor,testRun],
        );
        await db.query(
            `insert into student_assignments(organization_id,client_id,user_id,role,is_primary,created_by,test_run_id)
             values($1,$2,$3,'supervisor',true,$3,$4)`,
            [org,id,actor,testRun],
        );
        return {id,updated_at:row.updated_at,test_run_id:row.test_run_id,version:1};
    };
    const studentPayload=(overrides:Record<string,unknown>={})=>({
        schemaVersion:2 as const,clinicalId:'DUMMY-001',fullName:'A.B.',initials:'A.B.',rut:null,
        photoAttachmentId:null,birthDate:'2015-01-01',primaryLanguage:'Español',livingArrangement:'',
        reportedDiagnosis:'',consultationReason:'',context:{home:'',school:'',adaptations:''},
        people:[{id:randomUUID(),fullName:null,initials:'M.B.',birthDate:null,relationship:'Madre',phone:'',email:null,roles:['family'],isPrimaryContact:false}],
        siblings:[],...overrides,
    });
    const studentCommand=async (org:string, command:Record<string,unknown>) => {
        const r=await db.query<{value:Record<string,unknown>}>('select aba_student_command_v2($1,$2::jsonb) value',[org,JSON.stringify(command)]);
        return r.rows[0].value;
    };
    const updateCommand=(studentId:string,expectedVersion:number,value:Record<string,unknown>) => ({
        schemaVersion:2,operationId:randomUUID(),idempotencyKey:randomUUID(),studentId,expectedVersion,
        action:'update',payload:value,statusConfirmation:false,
    });
    beforeAll(async () => {
        db=await createTestDatabase();
        for (const id of [adminA,adminB,supervisor,technician,future]) await db.query('insert into auth.users(id,email) values($1,$2)',[id,`${id}@example.invalid`]);
        await db.query("insert into organizations(id,name) values($1,'Dummy A'),($2,'Dummy B')",[orgA,orgB]);
        for (const [org,id,role] of [[orgA,adminA,'admin'],[orgB,adminB,'admin'],[orgA,supervisor,'supervisor'],[orgA,technician,'therapist'],[orgA,future,'supervisor']]) {
            await db.query('insert into memberships(organization_id,user_id,role) values($1,$2,$3)',[org,id,role]);
        }
        clientA=await createFixture(orgA,adminA);
        clientB=await createFixture(orgB,adminB);
        await db.query("insert into student_assignments(organization_id,client_id,user_id,role,created_by) values($1,$2,$3,'therapist',$4),($1,$2,$5,'supervisor',$4)",[orgA,clientA.id,technician,adminA,supervisor]);
    },60000);
    afterAll(async()=>{ await db?.close(); });
    it('admin A reads all A but never B via SELECT or capabilities', async()=>{
        await asUser(db,adminA,async()=>{
            expect((await db.query('select id from clients')).rows).toEqual([{id:clientA.id}]);
            expect((await db.query<{cap:string[]}>('select get_student_capabilities($1) cap',[clientB.id])).rows[0].cap).toEqual([]);
            const rejected=await studentCommand(orgB,updateCommand(clientB.id,1,studentPayload()));
            expect(rejected).toMatchObject({status:'rejected',code:'permission-denied'});
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
        const testClient=await createFixture(orgA,adminA,{...payload,clinical_id:'DUMMY-TEST-001'},batch);
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
            await expect(studentCommand(orgA,updateCommand(clientA.id,1,studentPayload()))).resolves.toMatchObject({status:'rejected',code:'permission-denied'});
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
    it('grants access directly when the invited identity already confirmed its email',async()=>{
        const confirmed=randomUUID(), email='confirmed.member@example.invalid', operation=randomUUID();
        await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[confirmed,email]);
        await asUser(db,adminA,async()=>{
            await db.query("select mvp_begin_clinic_invitation($1,$2,$3,'therapist')",[orgA,operation,email]);
            await db.query('select mvp_complete_clinic_invitation($1,$2)',[orgA,operation]);
        });
        // A confirmed account has no token to redeem: pending would lock it out
        // of the clinic forever because no second invitation is delivered.
        expect((await db.query('select status from memberships where organization_id=$1 and user_id=$2',[orgA,confirmed])).rows)
            .toEqual([{status:'active'}]);
        await asUser(db,confirmed,async()=>{
            const context=await db.query<{choices:unknown[]}>("select (aba_identity_context())->'choices' choices");
            expect(context.rows[0].choices.length).toBeGreaterThan(0);
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
    });
    it('returns a capture boundary that covers every persisted session event',async()=>{
        const sessionId=randomUUID();
        const started='2026-10-20T10:00:00Z', paused='2026-10-20T11:00:00Z';
        await db.query(
            `insert into clinical_session_v2_state(session_id,organization_id,client_id,captured_at,created_by)
             values($1,$2,$3,$4,$5)`,
            [sessionId,orgA,clientA.id,started,adminA],
        );
        await db.query(
            `insert into clinical_session_v2_events(id,session_id,organization_id,client_id,sequence,event_type,occurred_at,actor_user_id)
             values($1,$2,$3,$4,1,'started',$5,$6),($7,$2,$3,$4,2,'paused',$8,$6)`,
            [randomUUID(),sessionId,orgA,clientA.id,started,adminA,randomUUID(),paused],
        );
        const snapshot=await asUser(db,adminA,async()=>{
            const result=await db.query<{data:{sessions:unknown[]}}>('select read_program_session_v2($1,$2) data',[orgA,clientA.id]);
            return result.rows[0].data;
        });
        const session=(snapshot.sessions as Record<string,unknown>[]).find((item)=>item.id===sessionId);
        expect(session).toBeDefined();
        expect(Date.parse(String(session!.capturedAt))).toBeGreaterThanOrEqual(Date.parse(paused));
        expect(sessionV2Schema.safeParse(session).success).toBe(true);
        await db.query('delete from clinical_session_v2_events where session_id=$1',[sessionId]);
        await db.query('delete from clinical_session_v2_state where session_id=$1',[sessionId]);
    });
    it('archives a V2 session without the removed V1 mirror',async()=>{
        const sessionId=randomUUID();
        await db.query(
            'insert into clinical_session_v2_state(session_id,organization_id,client_id,captured_at,created_by) values($1,$2,$3,now(),$4)',
            [sessionId,orgA,clientA.id,adminA],
        );
        await asUser(db,adminA,async()=>{
            const command={schemaVersion:2,operationId:randomUUID(),idempotencyKey:randomUUID(),studentId:clientA.id,sessionId,expectedVersion:0,reason:'demo'};
            const result=(await db.query<{value:{status:string}}>(
                'select command_archive_session_v2($1,$2::jsonb) value',[orgA,JSON.stringify(command)],
            )).rows[0].value;
            expect(result.status).toBe('acknowledged');
            const state=(await db.query<{archived_at:string|null}>(
                'select archived_at::text from clinical_session_v2_state where session_id=$1',[sessionId],
            )).rows[0];
            expect(state.archived_at).not.toBeNull();
        });
        await db.query('delete from clinical_session_v2_state where session_id=$1',[sessionId]);
    });
    it('updates a student through V2 with optimistic concurrency',async()=>{
        await asUser(db,adminA,async()=>{
            const updated=await studentCommand(orgA,updateCommand(clientA.id,clientA.version,studentPayload({initials:'A.C.'})));
            expect(updated.status).toBe('acknowledged');
            const stale=await studentCommand(orgA,updateCommand(clientA.id,clientA.version,studentPayload({initials:'A.D.'})));
            expect(stale).toMatchObject({status:'conflict'});
            expect((await db.query('select initials from client_people_v2 where client_id=$1 and archived_at is null',[clientA.id])).rows)
                .toEqual([{initials:'M.B.'}]);
            expect((await db.query('select version from client_profiles_v2 where client_id=$1',[clientA.id])).rows[0]).toEqual({version:2});
        });
    });
    it('rejects direct DML that would bypass clinical commands',async()=>{
        await asUser(db,adminA,async()=>{
            const privileges=(await db.query<{
                clients_update:boolean;
                people_update:boolean;
                context_update:boolean;
                history_insert:boolean;
            }>(`select
                has_table_privilege('authenticated','public.clients','update') clients_update,
                has_table_privilege('authenticated','public.client_people_v2','update') people_update,
                has_table_privilege('authenticated','public.client_context_profiles','update') context_update,
                has_table_privilege('authenticated','public.clinical_history_versions_v2','insert') history_insert
            `)).rows[0];
            expect(privileges).toEqual({
                clients_update:false,
                people_update:false,
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
        });
        await asUser(db,adminA,async()=>{
            await db.query('select mvp_open_test_batch($1,$2)',[orgA,token]);
            await db.query('select mvp_open_test_batch($1,$2)',[orgA,token]);
        });
        const dummy=await createFixture(orgA,adminA,dummyPayload,token);
        expect(dummy.test_run_id).toBe(token);
        await asUser(db,adminA,async()=>{
            await db.query('select mvp_freeze_test_batch($1,$2)',[orgA,token]);
            expect((await db.query<{cap:string[]}>('select get_student_capabilities($1) cap',[dummy.id])).rows[0].cap).toEqual([]);
            await expect(db.query("select set_student_assignment($1,$2,'therapist','active')",[dummy.id,technician]))
                .rejects.toMatchObject({code:'42501'});
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
    it('removes legacy capture and session-finish RPCs',async()=>{
        const rows=(await db.query<{save:string|null;finish:string|null}>(
            "select to_regprocedure('public.mvp_save_record(uuid,uuid,uuid,uuid,text,jsonb,integer,boolean)') save, to_regprocedure('public.mvp_finish_session(uuid)') finish",
        )).rows[0];
        expect(rows).toEqual({save:null,finish:null});
    });
    it('disallows direct session DML bypass after V2 cutover',async()=>{
        await asUser(db,technician,async()=>{
            await expect(db.query("update clinical_session_v2_state set status='draft' where session_id=$1",[randomUUID()]))
                .rejects.toMatchObject({code:'42501'});
        });
    });
    it('anonymous cannot call clinical commands',async()=>{
        await db.exec('set role anon');
        try {
            await expect(db.query('select aba_student_command_v2($1,$2::jsonb)',[orgA,JSON.stringify(updateCommand(clientA.id,1,studentPayload()))]))
                .rejects.toMatchObject({code:'42501'});
        } finally { await db.exec('reset role'); }
    });
    it('inventories then removes one dummy lot while preserving accounts and clinic',async()=>{
        const token=randomUUID();
        const historyRoot=randomUUID(), historyChild=randomUUID(), sessionId=randomUUID();
        await db.query(
            `insert into clinical_history_versions_v2(id,history_id,client_id,organization_id,kind,action,descriptor,status,version,created_by)
             values($1,$1,$2,$3,'assessment','initialize-v2','Root','superseded',1,$4),
                   ($5,$1,$2,$3,'assessment','correct','Child','active',2,$4)`,
            [historyRoot,clientA.id,orgA,adminA,historyChild],
        );
        await db.query(
            'insert into clinical_session_v2_state(session_id,organization_id,client_id,captured_at,created_by) values($1,$2,$3,now(),$4)',
            [sessionId,orgA,clientA.id,adminA],
        );
        await db.query(
            `insert into clinical_session_v2_events(id,session_id,organization_id,client_id,sequence,event_type,occurred_at,actor_user_id)
             values($1,$2,$3,$4,1,'started',now(),$5)`,
            [randomUUID(),sessionId,orgA,clientA.id,adminA],
        );
        await asUser(db,adminA,()=>db.query('select mvp_open_test_batch($1,$2)',[orgA,token]));
        await asUser(db,adminB,()=>db.query('select mvp_open_test_batch($1,$2)',[orgB,token]));
        await db.query('update clients set test_run_id=$1 where id in ($2,$3)',[token,clientA.id,clientB.id]);
        await db.query("insert into audit_events(organization_id,entity_type,entity_id,action,test_run_id) values($1,'client',$2,'updated',$3) returning id",[orgB,clientB.id,token]);
        const auditId=(await db.query<{id:string}>("select id::text from audit_events where organization_id=$1 and entity_id=$2 and test_run_id=$3 order by id desc limit 1",[orgB,clientB.id,token])).rows[0].id;
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
        expect((await db.query('select id from clinical_history_versions_v2 where client_id=$1',[clientA.id])).rows).toEqual([]);
        expect((await db.query('select session_id from clinical_session_v2_state where client_id=$1',[clientA.id])).rows).toEqual([]);
        expect((await db.query('select id from clients where id=$1',[clientB.id])).rows).toHaveLength(1);
        expect((await db.query('select id from audit_events where id=$1',[auditId])).rows).toHaveLength(1);
        expect((await db.query('select user_id from memberships where organization_id=$1',[orgA])).rows.length).toBeGreaterThan(0);
        expect((await db.query('select id from organizations where id=$1',[orgA])).rows).toHaveLength(1);
    });
});
