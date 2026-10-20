# R4 — volatilidad y clasificación de lint SQL

Fecha: 2026-09-26. Checkout autorizado: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.
Revisión de fuente/catálogo, no QA funcional. Sin reset, seeds ni datos nuevos.

## Corrección integrada

Migración forward `20260926152059_correct_validator_function_volatility.sql`,
generada mediante CLI 2.117 y aplicada mediante install-local-schema.ps1.
95 migraciones sincronizadas; tipos regenerados desde el stack aislado.

Diez funciones privadas pasan de IMMUTABLE a STABLE, sin cambiar cuerpo,
firma, ACL, search_path ni lógica de validación:

- command_version_conflict_result y command_rejected_result: jsonb_build_object es STABLE.
- is_iso_date_text e is_iso_date_not_after: conversiones de texto a date.
- a3_iso_timestamp_valid y a3_measurement_v2_valid: conversiones a timestamptz.
- clinical_history_command_v2_valid: conversiones de fechas y validadores dependientes.
- student_input_v2_valid, student_command_v2_valid y a5_document_v2_valid:
  llamadas a los validadores anteriores; revisión transitiva de cuerpos actuales.

Se revisaron las funciones completas y sus dependencias. No se encontró uso de
estas funciones en definiciones de índices ni dependencias de objetos declaradas
por pg_depend. La revisión textual de cuerpos incluye los callers IMMUTABLE,
porque PostgreSQL no registra todas las llamadas internas PL/pgSQL en pg_depend.

Fuente de criterio: [volatilidad PostgreSQL](https://www.postgresql.org/docs/current/xfunc-volatility.html).
Una declaración IMMUTABLE promete independencia de configuración y permite
plegado de constantes; STABLE expresa el contrato conservador de estos helpers.
Changelog Supabase y documentación de funciones revisados; no se actualizó el runtime.

## Evidencia posterior

- Catálogo: las diez funciones tienen provolatile=s, search_path vacío y ACL
  `{postgres=X/postgres}`. Ninguna obtuvo acceso anon/authenticated.
- db lint public/private exit 0: desaparecieron las advertencias IMMUTABLE/STABLE.
- db advisors security local nivel warn: No issues found.
- La migración es sólo ALTER FUNCTION; tipos públicos no cambian por este corte.
- No se invocaron los validadores ni RPC de escritura con datos de prueba.

## Advertencias restantes, clasificadas por fuente

| Función | Advertencia | Clasificación de integración |
|---|---|---|
| aba_consent_command_v2 | v_root nunca leído | Recibe SELECT INTO; no se retiró la consulta ni su control FOUND/bloqueo. Declaración redundante no prueba ausencia de autorización. |
| aba_attachment_reserve_v2 | v_current nunca leído | Recibe SELECT INTO de versión actual. No se eliminó una consulta para limpiar lint. |
| aba_attachment_archive_v2 | v_test_run sin uso | Declaración local no referenciada; mantenimiento, sin cambio de contrato. |
| is_valid_normalized_rut | v_index sombreado/sin uso | FOR entero crea variable local automática; el cuerpo sí utiliza ese índice. La declaración externa es redundante. |
| a5_calendar_command_impl | v_idx sombreado; v_row sin uso | FOR entero utiliza su índice local para fechas, horas e identidad; v_row es declaración redundante. |
| a4_student_share_command_impl | v_access nunca leído | INSERT/UPDATE con RETURNING INTO; no se retira escritura ni recibo para silenciar lint. |
| a3_measurement_v2_valid | text a text[]/numeric[] al inicializar | Literales vacíos '{}' en variables declaradas como arrays. No se cambian valores, reglas de medición ni aceptabilidad del payload. |

Estos once avisos no son errores SQL ni hallazgos del advisor de seguridad.
La inspección no muestra una brecha de integración causada por ellos; tampoco
constituye prueba funcional de validadores ni de sus flujos. QA R5 debe cubrir
capturas, fechas, RUT, agenda, permisos y reintentos sobre esta versión exacta.
Se conservan como deuda de mantenimiento explícita, no como lint global limpio.

## Recuperación y gate

No hay transformación de datos que revertir. Si apareciese incompatibilidad,
revisar plan/función dependiente y corregir con otra migración forward; no volver
a prometer IMMUTABLE sólo para recuperar una optimización. No modificar historia
aplicada ni resetear el stack. R3/R4 continúa en auditoría requisito por requisito;
esta clasificación cierra el pendiente de volatilidad, no la aceptación global.
