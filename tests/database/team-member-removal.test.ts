import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type PGlite } from '@electric-sql/pglite';
import { asUser, createTestDatabase } from './harness';

describe('team member removal (real PostgreSQL roles, synthetic identities)', () => {
    let db: PGlite;
    const orgA = randomUUID(), orgB = randomUUID();
    const admin = randomUUID(), peerAdmin = randomUUID();
    const therapist = randomUUID(), outsider = randomUUID();
    const clientId = randomUUID(), familyClientId = randomUUID();

    beforeAll(async () => {
        db = await createTestDatabase();
        for (const id of [admin, peerAdmin, therapist, outsider]) {
            await db.query('insert into auth.users(id,email) values($1,$2)', [id, `${id}@example.invalid`]);
        }
        await db.query("insert into organizations(id,name) values($1,'Dummy A'),($2,'Dummy B')", [orgA, orgB]);
        await db.query(
            "insert into memberships(organization_id,user_id,role) values($1,$3,'admin'),($1,$4,'admin'),($1,$5,'therapist'),($2,$5,'therapist')",
            [orgA, orgB, admin, peerAdmin, therapist],
        );
        await db.query(
            "insert into clients(id,organization_id,clinical_id,initials,primary_language,birth_date) values($1,$2,'T-001','T.C.','Español','2016-01-01')",
            [clientId, orgA],
        );
        await db.query(
            "insert into student_assignments(organization_id,client_id,user_id,role,created_by) values($1,$2,$3,'therapist',$4)",
            [orgA, clientId, therapist, admin],
        );
        // The same person can also be a relative of another patient.
        await db.query(
            "insert into clients(id,organization_id,clinical_id,initials,primary_language,birth_date) values($1,$2,'T-002','F.C.','Español','2017-02-02')",
            [familyClientId, orgA],
        );
        await db.query(
            "insert into student_assignments(organization_id,client_id,user_id,role,created_by) values($1,$2,$3,'family',$4)",
            [orgA, familyClientId, therapist, admin],
        );
    }, 60000);

    afterAll(async () => { await db?.close(); });

    it('requires a clinic administrator', async () => {
        await asUser(db, therapist, () =>
            expect(db.query('select public.aba_remove_team_member($1,$2)', [orgA, outsider]))
                .rejects.toMatchObject({ code: '42501' }),
        );
    });

    it('rejects removing yourself', async () => {
        await asUser(db, admin, () =>
            expect(db.query('select public.aba_remove_team_member($1,$2)', [orgA, admin]))
                .rejects.toMatchObject({ code: '22023', message: 'cannot_remove_self' }),
        );
    });

    it('does not touch a user who is not a member of the clinic', async () => {
        await asUser(db, admin, () =>
            expect(db.query('select public.aba_remove_team_member($1,$2)', [orgA, outsider]))
                .rejects.toMatchObject({ code: '22023', message: 'member_not_found' }),
        );
    });

    it('removes the membership, ends assignments and keeps identity plus audit trail', async () => {
        const receipt = (await asUser(db, admin, () =>
            db.query<{ value: { user_id: string; removed: boolean } }>(
                'select public.aba_remove_team_member($1,$2) value', [orgA, therapist],
            ),
        )).rows[0].value;
        expect(receipt).toEqual({ user_id: therapist, removed: true });

        expect((await db.query('select 1 from memberships where organization_id=$1 and user_id=$2', [orgA, therapist])).rows).toHaveLength(0);
        // Another clinic membership is untouched.
        expect((await db.query('select role,status from memberships where organization_id=$1 and user_id=$2', [orgB, therapist])).rows)
            .toEqual([{ role: 'therapist', status: 'active' }]);
        expect((await db.query(
            'select status, ended_at is not null as ended from student_assignments where organization_id=$1 and user_id=$2 and client_id=$3',
            [orgA, therapist, clientId],
        )).rows).toEqual([{ status: 'inactive', ended: true }]);
        // Family links are not team authority and stay untouched.
        expect((await db.query(
            'select status from student_assignments where client_id=$1 and user_id=$2',
            [familyClientId, therapist],
        )).rows).toEqual([{ status: 'active' }]);
        expect((await db.query(
            "select actor_user_id, subject_user_id from clinic_admin_events where organization_id=$1 and action='membership:removed'",
            [orgA],
        )).rows).toEqual([{ actor_user_id: admin, subject_user_id: therapist }]);
        // The identity survives: clinical history and audit references stay valid.
        expect((await db.query('select id from auth.users where id=$1', [therapist])).rows).toHaveLength(1);

        await asUser(db, therapist, async () => {
            expect((await db.query('select id from clients')).rows).toEqual([]);
        });
    });

    it('allows removing a suspended member', async () => {
        await db.query("insert into memberships(organization_id,user_id,role,status) values($1,$2,'therapist','inactive')", [orgA, outsider]);
        await asUser(db, admin, () => db.query('select public.aba_remove_team_member($1,$2)', [orgA, outsider]));
        expect((await db.query('select 1 from memberships where organization_id=$1 and user_id=$2', [orgA, outsider])).rows).toHaveLength(0);
    });
});
