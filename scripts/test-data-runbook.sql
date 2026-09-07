-- 1) Inventario sin borrar. Ejecutar autenticado como admin de la clínica.
select public.mvp_cleanup_test_run(
  'REPLACE_ORGANIZATION_UUID'::uuid,
  'REPLACE_TEST_RUN_UUID'::uuid,
  null
);

-- 2) Solo tras respaldo, aceptación y comparación del inventario, ejecutar exactamente:
-- select public.mvp_cleanup_test_run(
--   'REPLACE_ORGANIZATION_UUID'::uuid,
--   'REPLACE_TEST_RUN_UUID'::uuid,
--   'DELETE TEST DATA REPLACE_TEST_RUN_UUID'
-- );

-- 3) Verificación clínica limpia; debe devolver cero.
select count(*) from public.clients
where organization_id='REPLACE_ORGANIZATION_UUID'::uuid
  and test_run_id='REPLACE_TEST_RUN_UUID'::uuid;
