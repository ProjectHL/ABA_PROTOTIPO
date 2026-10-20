# Runbook de promoción — ABA_staging

## Alcance y estado de entrada

- Destino único: `ABA_staging` (`arfwuctpwnnuhdgjtxaa`).
- Estado remoto actual: F1, F2 y hardening promovidos el 2026-09-10; la última migración es `20260910184233_final_security_least_privilege`.
- No ejecutar `seed.sql`, `db reset`, limpieza por lote ni consultas de contenido clínico.
- La promoción requiere autorización explícita del propietario. La organización está en plan Free y no tiene backups diarios gestionados: antes de pacientes reales exige Pro o un dump lógico cifrado según `BACKUP_RESTORE.md`.
- El preflight 2026-09-11 confirmó el proyecto correcto, Auth/Edge accesibles, rechazo sin JWT `401`, signup público deshabilitado y sign-ins anónimos deshabilitados.
- La cuenta designada ya existe con una membresía `admin` activa y es el único admin activo de su clínica. Esa clínica contiene siete fichas actuales, tratadas como dummy hasta el corte.

## Estrategia de cuenta para los tres perfiles

Una membresía tiene un solo rol por clínica. Mantener la cuenta como `admin` mientras se simula supervisor/técnico no valida restricciones reales, porque admin recibe todas las capacidades. Para cumplir el pedido de usar la misma cuenta se hará una validación secuencial:

1. activar temporalmente como admin a una segunda cuenta exclusivamente sintética;
2. con esa segunda sesión, abrir **Administración**, ubicar la cuenta designada y confirmar que existe un segundo admin activo antes de cambiarla a `supervisor`;
3. desde la ficha dummy, abrir **Asignaciones** y crear/actualizar para la cuenta designada una asignación `supervisor` activa; cerrar la sesión administrativa;
4. iniciar una sesión nueva de la cuenta designada, comprobar que no ve **Administración**, abrir sólo la ficha asignada y validar las capacidades de supervisor; cerrar sesión;
5. con la sesión del admin temporal, cambiar la cuenta designada a `therapist` y actualizar en la misma ficha dummy su asignación activa a `therapist`; cerrar sesión;
6. iniciar una sesión nueva de la cuenta designada, comprobar que sólo ve la ficha asignada y validar las capacidades de técnico; cerrar sesión;
7. con la sesión del admin temporal, restaurar la cuenta designada a `admin` activa; iniciar una sesión nueva de esa cuenta y confirmar que reaparece **Administración**;
8. suspender o devolver a su rol original la cuenta admin temporal, comprobar que queda al menos un admin activo y registrar los eventos de administración.

Cada transición requiere una sesión nueva para evitar evaluar un estado de UI obsoleto. La UI impide que la sesión admin cambie su propio rol o estado: el segundo admin temporal debe hacer esos cambios. La RPC `mvp_set_member` serializa la operación, persiste `role` y `status`, crea el evento administrativo y rechaza retirar el último admin activo. No se realiza este ciclo sin autorización de staging y no se usa ninguna ficha real.

## Artefactos inmutables

| Orden | Migración local | Versión remota MCP | SHA-256 |
|---|---|---|---|
| 1 | `20260910184204_functional_clinical_admin_crud.sql` | `20260910184204_functional_clinical_admin_crud` | `684547298BFDA14C4FEB9D4B26FF674EB32A2FC6809AE740C2A00EE65D80A947` |
| 2 | `20260910184219_functional_program_session_crud.sql` | `20260910184219_functional_program_session_crud` | `77F22ECB72075BF40EB370D146123E42FCDE166F89E4E09DBE95CCCAC0BC66F9` |
| 3 | `20260910184233_final_security_least_privilege.sql` | `20260910184233_final_security_least_privilege` | `FC0A4C036C39AF71031718BFA566DE5F6E4E1A95520A43C9AECB99088CEAF3BA` |

Si un hash cambia, abortar y volver a auditar. No editar una migración después de promoverla.

## Preflight de sólo lectura

1. Confirmar proyecto, estado saludable y último historial de migraciones mediante MCP.
2. Para promover con fixtures, registrar la aceptación del riesgo y el responsable. Antes de datos reales, confirmar Pro o un dump lógico cifrado recuperable.
3. [x] Ejecutar `npm run supabase:staging:auth-preflight`; PASS remoto el 2026-09-11.
4. Confirmar por catálogo que las firmas F1/F2 aún no existen y que las tablas objetivo mantienen sus nombres/columnas.
5. Revisar que no exista una migración remota desconocida posterior a B2.

Evidencia estructural 2026-09-10: PostgreSQL 17.6, cero tablas públicas sin RLS, tablas base presentes, las cuatro firmas F1/F2 ausentes como se esperaba y ningún historial posterior a B2. Evidencia Auth 2026-09-11: registro público y sign-ins anónimos deshabilitados, Email activo, confirmación requerida y Edge anónima rechazada; preflight **PASS**.

Abortar ante drift inesperado, proyecto incorrecto, backup no identificable, backend degradado o cualquier necesidad de borrar datos.

## Aplicación

Aplicar con el MCP de Supabase una migración por vez y con el nombre del archivo sin timestamp:

1. [x] `functional_clinical_admin_crud` — aplicada 2026-09-10.
2. [x] `functional_program_session_crud` — aplicada 2026-09-10.
3. [x] `final_security_least_privilege` — aplicada 2026-09-10.

Cada llamada debe usar literalmente el SQL versionado. No combinar archivos ni introducir IDs generados. Tras cada aplicación, volver a listar migraciones; si falla una, no avanzar a la siguiente.

## Verificación posterior

- [x] Las tres versiones aparecen en el historial remoto en el mismo orden.
- [x] Las cuatro tablas de comando/auditoría conceden únicamente `SELECT` a `authenticated`.
- [x] `program_lifecycle_events` no concede `INSERT` a `authenticated` y ya no tiene política INSERT.
- [x] Las tres secuencias de auditoría no son utilizables por `anon` ni `authenticated`.
- [x] Las 30 tablas públicas conservan RLS; cero tablas públicas sin RLS.
- [x] Advisors revisados: las 19 RPC `SECURITY DEFINER` corresponden al inventario intencional y validan autorización internamente; permanece el aviso conocido de protección de contraseñas filtradas.
- Ejecutar un smoke sintético autenticado con admin, supervisor y técnico; no crear pacientes reales.
- Ejecutar la estrategia secuencial anterior si se mantiene la exigencia de una sola cuenta para los tres perfiles.
- [x] Repetir preflight después de deshabilitar signup público y sign-ins anónimos — PASS 2026-09-11.
- Repetir advisor después de habilitar protección de contraseñas filtradas si la organización migra a Pro.
- Seguir `AUTH_HARDENING.md`; leaked-password protection requiere Pro.

## Rollback y señales de aborto

F1/F2 son aditivas o `CREATE OR REPLACE` compatibles; si la aplicación falla, volver a la imagen anterior sin revertir el esquema. El hardening sólo retira privilegios no consumidos: ante una regresión demostrada, crear una migración compensatoria que reponga exclusivamente el grant necesario, nunca `GRANT ALL`.

No usar `db reset`, borrar migraciones, restaurar sobre staging ni ejecutar SQL manual no versionado. Un fallo de aislamiento, Auth, persistencia o advisors desconocidos mantiene cerrada la puerta de UAT.

## Evidencia del corte

Registrar fecha, operador, commit de aplicación, hashes anteriores, IDs/versiones de migración, advisors antes/después, resultado del smoke y referencia del backup. No registrar JWT, cookies, claves, contraseñas, correos completos ni contenido clínico.

### Registro de promoción 2026-09-10

- Proyecto: `ABA_staging` (`arfwuctpwnnuhdgjtxaa`), estado `ACTIVE_HEALTHY`, PostgreSQL 17.6.
- Operación: tres llamadas secuenciales al MCP; todas respondieron `success:true`.
- Trazabilidad de hardening: la consulta promovida fue validada con hash binario previo `5CF1857467A46A761C4754605416104FDEDF25E25CD1C7B0B3451917C2113A49`; al alinear el nombre local con la versión remota se normalizó únicamente el fin de línea y el hash canónico del repositorio pasó a `FC0A4C036C39AF71031718BFA566DE5F6E4E1A95520A43C9AECB99088CEAF3BA`, sin cambio SQL.
- Verificación: cinco RPC F1/F2 presentes, `anon_execute=false`, `authenticated_execute=true`, `SECURITY DEFINER=true` y `search_path` fijo.
- Grants: sólo `SELECT` para `authenticated` en las cuatro tablas endurecidas; ninguna política INSERT directa en `program_lifecycle_events`.
- Secuencias: sin `SELECT`, `USAGE` ni `UPDATE` para `anon` o `authenticated`.
- Datos: no se ejecutaron seeds, fixtures, limpieza, `DELETE`, `TRUNCATE`, `db reset` ni consultas de contenido clínico.
- Pendiente: smoke UAT sintético, estrategia de recuperación, VPS/HTTPS y publicación.
