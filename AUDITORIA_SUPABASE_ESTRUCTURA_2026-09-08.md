# Auditoría estructural de Supabase — ABA Clínico

Fecha de corte: 2026-09-08
Proyecto remoto: `ABA_staging` (`arfwuctpwnnuhdgjtxaa`)
Repositorio auditado: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`
Commit auditado: `afd30fb9b0d497a9bd5620d46505d8147ce9f1d7`
Método: solo lectura sobre staging y revisión local. No se modificó ni eliminó información remota.

## 1. Contexto, alcance y etiquetas de evidencia

La auditoría cubre migraciones, esquema PostgreSQL, constraints, índices, RLS, policies, grants, funciones, triggers, Auth, Storage, Realtime, Edge Functions, integración con el repositorio, datos dummy y preparación operativa para la PoC clínica.

Etiquetas usadas:

- **VERIFICADO:** comprobado directamente en catálogo remoto, artefacto local o prueba ejecutada.
- **INFERIDO:** conclusión razonable a partir de evidencia parcial; requiere una prueba adicional.
- **NO VERIFICADO:** el acceso o la prueba necesarios no estuvieron disponibles.

No se leyeron fichas, notas clínicas, correos ni otros contenidos de pacientes. Las consultas de datos se limitaron a conteos agregados y comprobaciones de integridad con resultado numérico.

Fuentes técnicas consultadas:

- Catálogos PostgreSQL e `information_schema` de `ABA_staging`.
- Historial remoto de migraciones, tipos TypeScript, advisors, ramas y Edge Functions mediante Supabase MCP.
- Migraciones, tests, CI, configuración de despliegue y consumidores del repositorio.
- Documentación vigente de Supabase sobre [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [funciones](https://supabase.com/docs/guides/database/functions), [migraciones](https://supabase.com/docs/guides/deployment/database-migrations), [backups](https://supabase.com/docs/guides/platform/backups) y [seguridad de contraseñas](https://supabase.com/docs/guides/auth/password-security).
- El endpoint `https://supabase.com/changelog.md` no pudo ser leído por la herramienta por su tipo MIME; esta limitación queda registrada y no se sustituyó por una fuente no oficial.

## 2. Dictamen y decisión sobre datos reales

**Dictamen: el backend es un candidato MVP funcional, pero NO está habilitado para pacientes reales.**

La base presenta buenos controles de aislamiento: las 29 tablas públicas tienen RLS, todas tienen policies, no existen vistas públicas, no hay ejecución anónima de RPC, todas las funciones `SECURITY DEFINER` tienen `search_path=''`, los constraints están validados y las invariantes multi-tenant comprobadas no presentan violaciones.

Sin embargo, la salida clínica queda bloqueada por dos brechas de integridad y varios controles operativos:

1. Un usuario autenticado y autorizado puede escribir directamente en tablas de ficha (`clients`, `guardians`, `siblings`, `client_context_profiles`, `clinical_history_entries`) y evitar la concurrencia, atomicidad o reglas de corrección implementadas en los comandos RPC.
2. El identificador dummy `test_run_id` sigue siendo parámetro de RPC públicas. El servidor de la aplicación lo toma del entorno, pero un cliente autenticado podría invocar directamente una RPC y proponer un lote arbitrario.
3. No existe una membresía `admin` en staging, por lo que la administración real y el corte dummy no pueden probarse desde una cuenta normal.
4. Hay deriva entre las versiones de cuatro migraciones locales y las registradas remotamente.
5. No existe evidencia de prueba autenticada contra staging ni de restauración de un respaldo.

**Decisión:** conservar los datos dummy, no ejecutar limpieza todavía y mantener prohibido el ingreso de pacientes reales hasta cerrar `SBA-001` a `SBA-008` y completar la aceptación de la profesional.

## Actualización de remediación B0 — 2026-09-08

Después del corte de auditoría se aplicaron en `ABA_staging` las migraciones `20260908140309_b0_security_and_test_batches` y `20260908140657_b0_test_batch_created_by_index`.

- `SBA-001`: remediado. `authenticated` ya no tiene DML directo sobre las cinco tablas de ficha gobernadas por comandos; las pruebas negativas locales pasan.
- `SBA-003` y `SBA-009`: remediación implementada. Existen 9 filas de lote por identidad compuesta clínica+lote, derivadas de los 9 pares existentes. Abrir/congelar/limpiar exige admin; la limpieza exige lote congelado, es idempotente y el dry-run cubre todas las dependencias clínicas.
- `SBA-004`: remediado. Las 29 versiones remotas coinciden con los archivos locales, incluidas las cuatro versiones antes divergentes y las dos migraciones B0.
- `SBA-005`: remediado para objetos de aplicación. `anon` perdió los grants de las cuatro tablas detectadas; los defaults de `postgres` ya no conceden a roles cliente. `supabase_admin` conserva defaults internos administrados por Supabase porque `postgres` no puede modificarlos; toda migración de aplicación declara grants/revokes y el replay tiene canario deny-by-default.
- Integridad: staging conserva 9 clientes dummy, 6 membresías y 3 organizaciones. No se borró ninguna fila clínica.
- Validación posterior: lint, tipos, build, 24 pruebas Vitest (17 DB) y 2 E2E pasan. Performance Advisor queda sin FK no indexada; sólo reporta 57 índices aún sin uso.
- Reproducibilidad posterior: Supabase local con Docker reconstruye las 29 migraciones y un seed sin pacientes ni contraseñas. El gate CI compara el contrato `public` generado localmente con los tipos de staging.
- B2 DB aplicado en staging como `20260908150936_b2_idempotent_clinic_invitation`: añade operación durable de invitación, reduce de 20 a 15 las RPC definer ejecutables por `authenticated` y documenta sus excepciones. La Edge Function actualizada aún no está desplegada.

## 3. Mapa estructural

### 3.1 Plataforma y migraciones

| Componente | Estado | Evidencia |
|---|---|---|
| PostgreSQL | VERIFICADO | 17.6; proyecto Supabase reporta engine 17.6.1.155, región `sa-east-1`, estado `ACTIVE_HEALTHY` |
| Migraciones | PARCIAL | 27 SQL locales y 27 entradas remotas; 23 versiones coinciden y 4 difieren en timestamp |
| Tipos TypeScript | VERIFICADO | El contenido generado desde staging coincide exactamente con `src/lib/supabase/database.types.ts` |
| Entorno local | PARCIAL | Las 27 migraciones se reproducen en PGlite; no existe `supabase/config.toml` ni una rama preview separada |
| Git/CI | PARCIAL | Working tree limpio; `main` está un commit por delante de `origin/main`, por lo que el commit auditado aún no tiene evidencia de CI remoto |

### 3.2 Tablas por dominio

El esquema `public` contiene 29 tablas:

| Dominio | Objetos |
|---|---|
| Tenant e identidad clínica | `organizations`, `memberships`, `clients`, `guardians`, `siblings` |
| Acceso y autorizaciones | `student_assignments`, `student_authorization_requests`, `student_authorization_decisions`, `student_access_audit_events` |
| Ficha clínica y consentimiento | `assessments`, `client_context_profiles`, `clinical_history_entries`, `consent_records`, `consent_events`, `clinical_audit_events` |
| Programas | `acquisition_programs`, `acquisition_goals`, `behavior_plans`, `programs`, `program_versions`, `program_lifecycle_events` |
| Sesiones y resultados | `clinical_sessions`, `session_acquisition_trials`, `session_behavior_measurements`, `session_program_records` |
| Operación y auditoría | `audit_events`, `clinic_admin_events`, `clinical_record_events`, `test_data_cleanup_log` |

No existen tablas privadas de aplicación; `private` contiene helpers. No hay vistas ni materialized views en `public` o `private`.

### 3.3 Integridad, índices y automatismos

- **VERIFICADO:** 98 constraints `CHECK`, 75 FKs, 29 PK y 11 constraints `UNIQUE`; ninguno está sin validar.
- **VERIFICADO:** 122 índices, 44 únicos; ninguno está inválido o no preparado.
- **VERIFICADO:** Performance Advisor no reporta FKs sin índice. Reporta 54 índices sin uso, todos como `INFO`, sobre un dataset pequeño.
- **VERIFICADO:** 23 triggers cubren 32 eventos de auditoría, timestamps, protección de tenant y lifecycle.
- **VERIFICADO:** cero violaciones actuales en las comprobaciones de organización/cliente, sesión/cliente, versión/cliente, versión actual/programa y vigencia de asignaciones.

### 3.4 RLS, policies y grants

- **VERIFICADO:** RLS activo en 29/29 tablas públicas.
- **VERIFICADO:** 56 policies públicas: 25 `SELECT`, 15 `INSERT`, 13 `UPDATE` y 3 `ALL` de denegación explícita.
- **VERIFICADO:** no hay tablas públicas sin policy.
- **VERIFICADO:** no se usa `user_metadata` ni `auth.jwt()` para autorización en funciones o policies auditadas.
- **VERIFICADO:** `anon` no puede ejecutar ninguna función de `public` o `private`.
- **RIESGO:** cuatro tablas nuevas conservan todos los privilegios de tabla para `anon`: `clinic_admin_events`, `clinical_record_events`, `session_program_records` y `test_data_cleanup_log`. RLS impide las operaciones por fila desde la API actual, pero el grant contradice mínimo privilegio.
- **RIESGO:** los default privileges de `postgres` y `supabase_admin` otorgan por defecto tablas, secuencias y ejecución de funciones a `anon` y `authenticated`. Cada migración depende de recordar revokes posteriores.
- **RIESGO:** las tablas de ficha mantienen DML directo para `authenticated`, aun cuando ya existen comandos RPC con invariantes más fuertes.

### 3.5 Funciones y RPC

| Métrica | `public` | `private` |
|---|---:|---:|
| Funciones totales | 20 | 19 |
| `SECURITY DEFINER` | 16 | 12 |
| Ejecutables por `anon` | 0 | 0 |
| Ejecutables por `authenticated` | 20 | 7 |
| Definer sin `search_path=''` | 0 | 0 |

Las 16 RPC públicas definer son endpoints autenticados y el análisis de sus definiciones confirmó validación directa o indirecta por membresía, admin, supervisor principal o capacidad de estudiante. El Advisor las seguirá señalando mientras sean invocables por `authenticated`; esto requiere una matriz formal de excepciones, no ignorar el aviso globalmente.

Los siete helpers privados ejecutables por `authenticated` soportan RLS y cálculos de capacidad. El esquema `private` no da `USAGE` a `anon` y sí a `authenticated`, coherente con ese contrato.

### 3.6 Auth, Storage, Realtime y Edge Functions

| Área | Estado | Evidencia |
|---|---|---|
| Auth | PARCIAL | 6 usuarios agregados; 6 membresías activas (`clinician`: 5, `viewer`: 1); ningún `admin` |
| Protección de contraseñas filtradas | NO CERRADO | Security Advisor mantiene un WARN; requiere configuración manual |
| Redirect URLs, SMTP y proveedores | NO VERIFICADO | No expuestos por las herramientas disponibles |
| Storage | VERIFICADO | 0 buckets y 0 policies de storage; coincide con el alcance sin adjuntos |
| Realtime | VERIFICADO | 0 tablas de aplicación publicadas |
| Cron/jobs | VERIFICADO | La extensión `pg_cron` no está instalada; no hay jobs de aplicación |
| Edge Functions | PARCIAL | `invite-clinic-member` ACTIVE v1, `verify_jwt=true`; código remoto idéntico al local |
| Ramas Supabase | PARCIAL | Sólo `main`; no existe entorno preview separado |

### 3.7 Inventario dummy agregado

Sin leer contenido clínico, staging contiene:

- 9 clientes, todos con `test_run_id`.
- 8 lotes distintos distribuidos en 3 organizaciones con clientes.
- 2 sesiones, 1 programa y 1 versión sin `test_run_id` directo, pero enlazados a clientes etiquetados.
- 21 asignaciones, de las cuales 19 no llevan etiqueta directa; la limpieza las alcanza por `client_id`.

La función `mvp_cleanup_test_run` referencia todos los objetos clínicos con `client_id`/`test_run_id`; preserva deliberadamente `organizations`, `memberships` y su propio ledger. Su resumen de dry-run, sin embargo, sólo cuenta parte de las tablas dependientes.

## 4. Matriz de controles

| Control | Estado | Evidencia | Decisión |
|---|---|---|---|
| Aislamiento entre clínicas | VERIFICADO LOCAL / PARCIAL STAGING | Prueba A/B local; 0 mismatches remotos agregados | Repetir con JWT reales en staging |
| Suspensión y vigencia | VERIFICADO LOCAL | Casos suspended/future pasan; 0 asignaciones activas fuera de vigencia | Repetir en staging |
| RLS en objetos expuestos | VERIFICADO STAGING | 29/29 tablas; 56 policies | Mantener gate automático |
| Mínimo privilegio | NO CERRADO | Defaults amplios y grants anon en 4 tablas | Corregir antes de datos reales |
| Comandos clínicos como única escritura | NO CERRADO | DML directo en ficha permite evitar RPC | Revocar o encapsular |
| RPC definer | PARCIAL | 16 WARN; anon revocado; search path fijo; autorización revisada | Aprobar excepción por RPC |
| Idempotencia/concurrencia de captura | VERIFICADO LOCAL | UUID estable, versión y doble envío en pruebas | Validar contra staging |
| Correcciones de historial/consentimiento | PARCIAL | RPC valida mismo cliente y estado; el acceso directo puede evitarla | Cerrar DML directo |
| Datos dummy y corte | PARCIAL | 9 clientes etiquetados, 8 lotes; limpieza local aprobada | Registrar/finalizar lotes y ampliar inventario |
| Backup/restauración | NO VERIFICADO | No hay evidencia ejecutada | Gate obligatorio de publicación |
| Edge de invitación | PARCIAL | JWT y autorización admin presentes; escritura Auth/DB/audit no es atómica | Añadir compensación y pruebas |
| CI/promoción | PARCIAL | Workflow presente; commit local no publicado | Push + CI verde + SHA congelado |

## 5. Hallazgos

### SBA-001 — P0 de salida — Escrituras directas evitan invariantes de ficha

- **Evidencia:** `authenticated` conserva `UPDATE` en `clients`, `guardians`, `siblings`, `INSERT/UPDATE` en `client_context_profiles` e `INSERT` en `clinical_history_entries`. Las policies permiten estas operaciones a usuarios con capacidad.
- **Problema:** la API de tablas puede evitar `mvp_save_student`, `save_client_context` y `append_clinical_history_entry`.
- **Impacto:** pérdida de edición atómica, control de versión y semántica de `supersedes`; una corrección podría no cerrar el registro anterior o referenciar otro cliente.
- **Objetos afectados:** tablas anteriores, RPC y consumidores de ficha.
- **Resultado requerido:** definir una única frontera de escritura. Para las tablas gobernadas por comandos, revocar DML directo y demostrar que sólo las RPC autorizadas escriben.

### SBA-002 — P0 de salida — No existe administrador de clínica operativo

- **Evidencia:** 6 membresías activas, únicamente roles históricos `clinician` y `viewer`; cero `admin`.
- **Problema:** no puede probarse equipo, invitaciones, suspensión ni limpieza desde una sesión ordinaria.
- **Impacto:** G1 y G4 no son aceptables aunque el código exista.
- **Resultado requerido:** el propietario designa la primera cuenta `admin`; el alta se hace por procedimiento controlado y queda auditada.

### SBA-003 — P1 — `test_run_id` no es un lote gobernado por la base

- **Evidencia:** varias RPC públicas reciben `p_test_run_id`; `mvp_save_student` acepta crear un cliente dummy para admin o supervisor. La aplicación toma el UUID del entorno, pero una llamada REST directa puede proponer otro valor.
- **Problema:** un usuario autorizado podría marcar un nuevo registro real como dummy.
- **Impacto:** una limpieza posterior podría incluir información que no era de prueba.
- **Resultado requerido:** registrar lotes por clínica con estado `open/frozen/cleaned`; sólo un admin puede abrir/activar un lote y las RPC validan su estado. Tras el corte no debe existir un lote abierto.

### SBA-004 — P1 — Deriva de versiones en cuatro migraciones

- **Evidencia:** nombres iguales pero versiones distintas en `mvp_clinic_authorization`, `mvp_clinical_records`, `mvp_test_data_cleanup` y `advisor_hardening`.
- **Problema:** Supabase CLI puede interpretar cada lado como migraciones distintas aunque el esquema y los tipos actuales coincidan.
- **Impacto:** despliegues repetidos, fallos de promoción o reparación manual insegura.
- **Resultado requerido:** reconciliar el ledger y los nombres locales en un checkout limpio; luego probar replay desde cero y no aplicar DDL hasta cerrar la comparación.

### SBA-005 — P1 — Defaults y grants no cumplen mínimo privilegio

- **Evidencia:** defaults de tablas/funciones/secuencias conceden a `anon` y `authenticated`; cuatro tablas públicas nuevas retienen todos los grants para `anon`.
- **Problema:** la seguridad depende de revokes manuales y RLS posterior en cada migración.
- **Impacto:** una futura tabla o RPC olvidada puede quedar expuesta por defecto.
- **Resultado requerido:** endurecer default privileges por owner/esquema y revocar privilegios innecesarios en objetos existentes, conservando sólo contratos explícitos.

### SBA-006 — P1 — Invitación no es transaccional ni está cubierta por pruebas

- **Evidencia:** la Edge Function invita/busca en Auth, luego hace `upsert` de membresía y después inserta auditoría. Un fallo de auditoría devuelve 500 con la membresía ya cambiada. La búsqueda se limita a los primeros 1000 usuarios.
- **Problema:** Auth y PostgreSQL no comparten transacción; no hay compensación ni prueba automatizada del flujo.
- **Impacto:** reintentos ambiguos, miembro activo sin evento esperado o falso error al usuario.
- **Resultado requerido:** diseñar estado idempotente y compensación; mover membresía+auditoría a una RPC transaccional, paginar/buscar correctamente y probar reintentos.

### SBA-007 — P1 — Falta verificación autenticada contra staging

- **Evidencia:** las 13 pruebas PostgreSQL y 2 E2E pasan localmente; no se ejecutó el recorrido remoto con admin, supervisor y técnico ni intentos cross-tenant con JWT reales.
- **Impacto:** las diferencias de Auth, grants, claims o configuración remota podrían aparecer sólo en staging.
- **Resultado requerido:** matriz REST/RPC/UI positiva y negativa con cuentas sintéticas; no usar pacientes reales para esta validación.

### SBA-008 — P1 — Recuperación no demostrada

- **Evidencia:** no se pudo verificar política de backup/PITR ni existe ensayo documentado de restauración.
- **Impacto:** no hay RPO/RTO real ni garantía de recuperación antes de información clínica.
- **Resultado requerido:** confirmar cobertura del plan Supabase, ejecutar una restauración en destino aislado y registrar tiempos, alcance y responsables.

### SBA-009 — P1 — Inventario de corte incompleto

- **Evidencia:** existen 9 clientes y 8 lotes en 3 organizaciones; el dry-run sólo resume clientes, sesiones, records, programas e historial.
- **Problema:** el inventario no muestra todas las dependencias que sí elimina la función.
- **Impacto:** el operador no puede reconciliar completamente antes/después del corte.
- **Resultado requerido:** resumen por tabla, clínica y lote; precondición de escrituras detenidas; postcondición de cero filas clínicas para los lotes y ledger preservado.

### SBA-010 — P2 — Excepciones `SECURITY DEFINER` no formalizadas

- **Evidencia:** 16 WARN del Advisor. Todas las RPC tienen `search_path=''`, niegan `anon` y verifican autorización directa o indirecta.
- **Problema:** el estado actual es razonable pero no existe un registro por firma con justificación, consumidores y pruebas negativas.
- **Resultado requerido:** inventario versionado; convertir a invoker o mover de esquema cuando no sea necesario; aceptar explícitamente las excepciones restantes.

### SBA-011 — P2 — Documentación Supabase contradice el estado real

- **Evidencia:** `supabase/README.md` y `supabase/migrations/SDD-03_RPC_RLS_AUDITORIA.md` aún dicen “simulado/no aplicar”, aunque las migraciones están activas. El status anterior declara reproducibilidad completa pese a `SBA-004`.
- **Impacto:** riesgo de decisiones y procedimientos basados en información obsoleta.
- **Resultado requerido:** actualizar documentación después de reconciliar migraciones y mover la especificación fuera de `migrations/`.

### SBA-012 — P2 — Falta entorno Supabase de desarrollo reproducible

- **Evidencia:** PGlite reproduce SQL, pero no existe `supabase/config.toml`; Supabase sólo muestra la rama `main`.
- **Impacto:** Auth, PostgREST, Storage/Realtime y Edge Runtime no se reproducen de extremo a extremo antes de staging.
- **Resultado requerido:** incorporar Supabase CLI local con Docker o un proyecto dev separado; staging queda como promoción, no como laboratorio principal.

### SBA-013 — P2 — Lecturas clínicas sobredimensionadas

- **Evidencia:** la página clínica usa `select('*')` en múltiples tablas.
- **Impacto:** mayor acoplamiento al esquema y exposición de columnas no necesarias dentro del proceso autorizado.
- **Resultado requerido:** seleccionar columnas explícitas por vista/rol y añadir una prueba que detecte ampliaciones accidentales.

### SBA-014 — P2 — Commit auditado aún no publicado

- **Evidencia:** `main...origin/main [ahead 1]` y working tree limpio.
- **Impacto:** no existe evidencia de CI remoto ni un SHA compartido para congelamiento.
- **Resultado requerido:** publicar por el flujo Git acordado, exigir CI verde y etiquetar la release candidata.

### SBA-015 — P3 — Índices sin uso no deben limpiarse aún

- **Evidencia:** 54 avisos `INFO` de índices sin uso, 0 WARN y 0 índices/FKs defectuosos.
- **Interpretación:** el dataset es demasiado pequeño para justificar eliminación.
- **Resultado requerido:** conservarlos durante la PoC y revisar métricas después de carga representativa.

## 6. Deriva y reproducibilidad

| Migración | Versión local | Versión remota | Estado |
|---|---:|---:|---|
| `mvp_clinic_authorization` | `20260907223352` | `20260907223352` | MATCH |
| `mvp_clinical_records` | `20260907223420` | `20260907223420` | MATCH |
| `mvp_test_data_cleanup` | `20260907223740` | `20260907223740` | MATCH |
| `advisor_hardening` | `20260907225147` | `20260907225147` | MATCH |
| `b0_security_and_test_batches` | `20260908140309` | `20260908140309` | MATCH |
| `b0_test_batch_created_by_index` | `20260908140657` | `20260908140657` | MATCH |

- **VERIFICADO:** las 29 versiones/nombres del ledger coinciden entre Git y staging.
- **VERIFICADO:** el esquema local completo se recrea en PGlite y los tipos fueron regenerados desde staging.
- **VERIFICADO:** toda migración B0 nueva se probó localmente antes de aplicarse y se conservó inmutable después de promoción.

## 7. Pruebas ejecutadas y no ejecutadas

### Ejecutadas el 2026-09-08

| Prueba | Resultado |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 5 archivos, 23 pruebas |
| `npm run test:db` | PASS — 2 archivos, 16 pruebas PostgreSQL/PGlite |
| `npm run test:e2e` | PASS — 2 pruebas Chromium |
| `npm run build` | PASS — Next.js 16.3.4, 11 rutas |
| Tipos remotos vs archivo local | PASS — igualdad exacta |
| Integridad multi-tenant agregada | PASS — 0 violaciones en 10 invariantes |
| Advisors | Security: 19 WARN (18 RPC definer + Auth); Performance: 57 INFO unused, 0 FK sin índice |

Las primeras ejecuciones de Vitest/Playwright dentro del sandbox fallaron con `EPERM` al escribir archivos temporales en la carpeta movida. Se repitieron fuera del sandbox y pasaron; no fue un fallo del código.

### No ejecutadas

- Login y recorrido clínico autenticado contra staging.
- Pruebas REST/RPC cross-tenant con JWT reales de los tres perfiles.
- Invitación real, entrega de correo y recuperación desde la cuenta final.
- Fallos inyectados entre Auth, membresía y auditoría de la Edge Function.
- Backup y restauración.
- Dry-run y limpieza de los 8 lotes remotos actuales.
- Validación profesional y prueba de VPS/HTTPS.

## 8. Handoff normalizado para planificación

| id | priority | component | evidence | problem | impact | affected_objects | required_outcome | constraints | dependencies |
|---|---|---|---|---|---|---|---|---|---|
| SBA-001 | P0 | Ficha/RLS | Grants DML + policies | Escritura directa evita comandos | Integridad y concurrencia evitables | ficha y RPC | Única frontera de escritura | Compatibilidad MVP | Inventario de consumidores |
| SBA-002 | P0 | Auth/admin | 0 admin | Administración no operable | Bloquea G1/G4 | memberships, Edge | Primer admin auditado | Decisión del propietario | Cuenta elegida |
| SBA-003 | P1 | Datos dummy | Parámetros públicos | Lote no gobernado | Riesgo de borrar datos reales | test_run_id, RPC | Registro de lotes y cierre | Mantener dummy hasta corte | Admin operativo |
| SBA-004 | P1 | Migraciones | 4 versiones distintas | Ledger inconsistente | Promoción no determinista | 4 migraciones | Historia reconciliada | Sin DDL nuevo | Checkout limpio |
| SBA-005 | P1 | Grants | Default ACL y 4 tablas anon | Privilegios amplios por defecto | Exposición futura | ACL y objetos nuevos | Deny-by-default | Conservar contratos usados | Matriz de grants |
| SBA-006 | P1 | Edge/Auth | Tres pasos no atómicos | Estado parcial en fallo | Reintentos ambiguos | invite function, memberships, audit | Idempotencia/compensación | Auth no transaccional | RPC transaccional DB |
| SBA-007 | P1 | Validación | Sólo pruebas locales | Sin evidencia JWT staging | Riesgo de configuración | RLS/RPC/UI | Matriz remota PASS | Datos sintéticos | 3 cuentas y admin |
| SBA-008 | P1 | Recovery | Sin restore | RPO/RTO desconocido | Pérdida no recuperable | proyecto completo | Restore demostrado | Destino aislado | Plan/backup disponible |
| SBA-009 | P1 | Corte | 8 lotes; dry-run parcial | Inventario incompleto | Corte no reconciliable | cleanup y tablas clínicas | Conteo completo y postcondiciones | No borrar ahora | SBA-003, freeze |
| SBA-010 | P2 | RPC | 16 WARN intencionales | Excepciones no documentadas | Drift de seguridad | 16 firmas | Registro y pruebas por RPC | No revocar helpers RLS a ciegas | Consumidores |
| SBA-011 | P2 | Docs | README/SDD obsoletos | Estado contradictorio | Error operativo | docs Supabase | Una fuente vigente | Actualizar tras SBA-004 | SBA-004 |
| SBA-012 | P2 | Entornos | Sin config/preview | Cobertura local parcial | Cambios llegan temprano a staging | Supabase local/dev | Entorno aislado | Docker disponible | Tiempo G0 |
| SBA-013 | P2 | Consultas | `select('*')` | Proyección excesiva | Mayor exposición/acoplamiento | workspace clínico | Columnas explícitas | No romper UI | Tipos y contratos |
| SBA-014 | P2 | CI/release | Branch ahead 1 | Sin CI remoto del SHA | Candidato no compartido | GitHub/CI | SHA verde y congelado | No incluye deploy | Acceso remoto Git |
| SBA-015 | P3 | Performance | 54 INFO unused | Sin carga representativa | Riesgo de optimización prematura | índices | Medir después de PoC | No eliminar ahora | Telemetría |

### Invariantes que el plan debe preservar

- Un admin sólo opera dentro de su clínica; no se introduce superadmin global.
- Suspensión, asignación futura o vencida niegan acceso inmediatamente.
- `organization_id`, cliente, programa, versión y sesión no pueden cruzarse.
- Historial y consentimiento conservan trazabilidad por `supersedes`.
- Cancelar no persiste; reintentar no duplica; finalizar exige registros enviados.
- El lote dummy es identificador de fixtures, nunca credencial ni bypass.
- La limpieza preserva Auth, organizaciones, membresías y ledger de la operación.
- No se publican funciones simuladas ni se ingresa información real antes de la aceptación.

### Decisiones y accesos pendientes del propietario

1. Confirmar si la cuenta privada provista por el propietario será la primera cuenta admin o la cuenta profesional.
2. Proporcionar un segundo correo si admin y profesional serán personas distintas; nunca compartir contraseñas.
3. Confirmar VPS y hostname antes del 24 de septiembre.
4. Confirmar plan Supabase con backup/PITR suficiente y autorizar una restauración aislada.
5. Coordinar aceptación profesional G2/G3 y final G4.

### Exclusiones verificadas para este MVP

Storage/adjuntos, Realtime, chat, facturación, upgrade, calendario, acceso familiar y operación offline permanecen fuera de alcance. Su ausencia no es un defecto para esta PoC.
