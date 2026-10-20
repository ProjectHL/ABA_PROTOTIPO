-- Covers the optional auth.users reference used to audit manually opened batches.
create index test_data_batches_created_by_idx
  on public.test_data_batches(created_by)
  where created_by is not null;
