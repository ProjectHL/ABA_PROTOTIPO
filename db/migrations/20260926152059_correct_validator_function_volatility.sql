-- Correct optimizer promises only; keep function bodies, identities and ACLs.
-- Date/timestamptz input and jsonb_build_object are STABLE in PostgreSQL.
-- Include reviewed private callers so they do not promise immutable results.
begin;
alter function private.command_version_conflict_result(uuid,uuid,uuid,bigint,bigint,text) stable;
alter function private.command_rejected_result(uuid,uuid,uuid,text,text,jsonb) stable;
alter function private.is_iso_date_text(text) stable;
alter function private.is_iso_date_not_after(text,date) stable;
alter function private.student_input_v2_valid(jsonb,date) stable;
alter function private.student_command_v2_valid(jsonb,date) stable;
alter function private.clinical_history_command_v2_valid(jsonb,date) stable;
alter function private.a3_iso_timestamp_valid(jsonb) stable;
alter function private.a3_measurement_v2_valid(jsonb,boolean) stable;
alter function private.a5_document_v2_valid(jsonb) stable;
commit;
