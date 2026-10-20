-- Signed Storage URLs cannot be revoked when a clinical version or a professional
-- permission changes. Serve bytes through a session-bound route that revalidates
-- the exact resource and version on every request instead.
drop policy if exists clinical_attachment_read_authorized on storage.objects;
create policy clinical_attachment_read_authorized on storage.objects
for select to authenticated using (
  bucket_id = 'clinical-attachments'
  and storage.allow_only_operation('object.get_authenticated')
  and private.can_read_attachment_object(bucket_id, name, (select auth.uid()))
);
