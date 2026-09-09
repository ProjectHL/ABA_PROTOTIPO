# Operación de la PoC clínica

## Ensayo dummy

1. Configure un UUID nuevo en `ABA_TEST_RUN_ID` solo en el entorno de ensayo.
2. Cree fichas, programas y sesiones desde la aplicación. El lote se propaga desde la ficha a los registros relacionados.
3. Valide los tres perfiles, guardado, reapertura y resultados con información ficticia.
4. Consulte `mvp_cleanup_test_run(clinic_id, token, null)` para obtener el inventario. Esta llamada no borra.

## Corte a datos limpios

1. Bloquee temporalmente nuevas operaciones y cree un respaldo verificable según `docs/runbooks/BACKUP_RESTORE.md`.
2. Compare el inventario del lote con el acta de ensayo.
3. Ensaye el procedimiento en una restauración o entorno aislado.
4. Ejecute la confirmación exacta indicada por la llamada de inventario. El procedimiento borra solo descendientes de fichas de esa clínica y lote; conserva cuentas, membresías y organización.
5. Retire `ABA_TEST_RUN_ID`, reinicie la aplicación y compruebe que la lista clínica está vacía.
6. Revise `test_data_cleanup_log`, healthcheck y acceso de la profesional.

No use `DELETE` global ni elimine usuarios de Auth durante el corte. La limpieza real se ejecuta únicamente después de la aceptación de la profesional y del respaldo.

## VPS

1. Siga `deploy/README.md`: instale Docker y Compose en Linux, copie el repositorio y cree `deploy/.env` desde el ejemplo.
2. Genere una sola vez `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` como base64 de 32 bytes y consérvela entre builds y reinicios. No la publique ni la cambie durante un despliegue activo.
3. Configure un hostname que resuelva a la VPS. Construya y publique con la secuencia verificada de `deploy/README.md`. Caddy obtiene HTTPS automáticamente.
4. Verifique `/api/health` y configure en Supabase la URL pública y `/auth/callback` como redirect permitido.
5. Compruebe que `invite-clinic-member` está activa con verificación JWT. Para reconstruirla desde el repositorio use `supabase functions deploy invite-clinic-member --project-ref arfwuctpwnnuhdgjtxaa` desde una sesión CLI autorizada.
6. Habilite en Supabase Auth la protección de contraseñas filtradas y confirme que el Security Advisor deja de reportarla.
