-- Recovered from ABA_staging migration history; schema only.
-- S-ABA-01: execute the explicit capability gate and write as the trusted function owner.
-- Direct table access remains constrained by RLS; the RPC grants only student.edit.
alter function public.save_client_context(uuid, text, text, text, integer, uuid)
  security definer;
