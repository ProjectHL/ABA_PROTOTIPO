# Spec de mejoras Supabase, DB y backend — MVP a PoC clínica

Versión: 1.0
Fecha: 2026-09-08
Fuente: `AUDITORIA_SUPABASE_ESTRUCTURA_2026-09-08.md`
Objetivo de publicación: 29 de septiembre de 2026; 30 de septiembre reservado para contingencia.

## 1. Resumen ejecutivo

El plan mantiene la arquitectura actual: Next.js en VPS Linux y Supabase gestionado. No incorpora superadmin global, Storage, Realtime ni funciones fuera del alcance MVP.

La prioridad no es agregar funcionalidades. Es convertir el candidato técnico actual en una versión clínicamente controlable:

1. cerrar rutas de escritura que evitan los comandos;
2. gobernar y congelar los lotes dummy;
3. reconciliar migraciones y asegurar defaults deny-by-default;
4. completar administración e invitación con consistencia;
5. validar permisos reales en staging;
6. demostrar recuperación y ejecutar el corte limpio.

Estados de evidencia:

- **IMPLEMENTED:** existe en código o migración.
- **VERIFIED LOCAL:** pasó pruebas reproducibles locales.
- **VERIFIED STAGING:** se comprobó en el proyecto remoto con usuarios/configuración reales.
- **ACCEPTED:** fue validado por el responsable funcional/profesional.
- **PUBLISHED:** está desplegado en la versión PoC con evidencia post-deploy.

Una tarea no cambia automáticamente a `ACCEPTED` o `PUBLISHED` por pasar CI.

## 2. Matriz de decisiones

| Decisión | Recomendación | Alternativa | Responsable | Fecha límite | Consecuencia si falta |
|---|---|---|---|---|---|
| Primera cuenta admin | Designar la cuenta privada provista por el propietario sólo si será admin/clínica | Entregar otro correo y conservar esa cuenta como supervisor | Propietario | 9 sep | G1 y pruebas remotas bloqueadas |
| Entorno de desarrollo Supabase | Supabase CLI local con Docker, sin datos clínicos | Segundo proyecto Supabase dev aislado | Técnico + propietario si hay costo | 11 sep | Cambios siguen probándose primero en staging |
| Frontera de escritura | RPC de comando como única escritura para ficha | Mantener DML directo sólo si cada invariantes se replica en trigger | Técnico | 12 sep | No se admiten datos reales |
| Gobierno dummy | Tabla de lotes por clínica con estados `open/frozen/cleaned` | Flag de entorno + bloqueo DB manual en corte | Técnico; admin abre/cierra lote | 13 sep | Riesgo de etiquetado/borrado incorrecto |
| RPC definer | Mantener sólo las justificadas y registrar excepción por firma | Convertir a invoker cuando RLS/grants basten | Técnico | 14 sep | Advisor sin resolución auditable |
| Backup/PITR | Confirmar plan y ensayar restore a destino aislado | Export lógico cifrado + restore ensayado | Propietario + técnico | 24 sep | G4 bloqueado |
| VPS/hostname | VPS lista con hostname temporal y HTTPS | Proveedor equivalente con contenedor Linux | Propietario | 24 sep | No hay publicación |

## 3. Gates y calendario

### Gate B0 — Contención y verdad operativa — 8 a 10 septiembre

- [x] Mantener prohibición de pacientes reales.
- [x] Congelar nuevo DDL remoto hasta reconciliar el ledger de migraciones.
- [x] Crear evidencia versionada de los grants efectivos y consumidores de cada tabla/RPC.
- [x] Resolver `SBA-001`: ningún write de ficha puede evitar concurrencia, atomicidad o correcciones.
- [x] Resolver `SBA-003`: un cliente no puede inventar un lote dummy válido.
- [x] Endurecer grants actuales de `anon` y default privileges de los objetos creados por migraciones.

**Cierre:** pruebas negativas directas REST/SQL pasan localmente; el replay limpio mantiene el comportamiento; no existe una ruta conocida que pueda convertir datos reales en dummy por parámetro libre.

**Estado 2026-09-08:** `VERIFIED LOCAL` y controles estructurales `VERIFIED STAGING`. Staging conserva 9 fichas dummy; no se ejecutó cleanup. Los defaults de `postgres`, owner de las migraciones, quedaron cerrados. Los defaults internos de `supabase_admin` son gestionados por la plataforma y el rol del proyecto no puede alterarlos; por eso cada objeto de aplicación mantiene grants/revokes explícitos y el replay incluye un canario de tablas futuras.

### Gate B1 — Base reproducible — 9 a 12 septiembre

- [x] Reconciliar las cuatro versiones de migración local/remota.
- [x] Comparar esquema resultante, no sólo nombres, en un destino limpio.
- [x] Incorporar `supabase/config.toml` y arranque local con Docker, o documentar el proyecto dev alternativo.
- [x] Añadir checks CI de replay de migraciones, tipos generados y deriva del ledger.
- [x] Actualizar README/SDD obsoletos después de cerrar la reconciliación.

**Cierre:** un checkout limpio crea la base, ejecuta 27+ migraciones una sola vez, genera los mismos tipos y deja cero diferencias inesperadas.

**Estado 2026-09-08:** `VERIFIED LOCAL`. Docker Desktop 4.90 reconstruyó dos veces las 29 migraciones y el seed; el resultado tiene 2 clínicas, 4 membresías sintéticas, 0 pacientes y 0 usuarios capaces de iniciar sesión. El gate `supabase:types:check` confirma el mismo contrato `public` que staging, ignorando únicamente el metadato de versión de PostgREST.

### Gate B2 — Seguridad e integridad — 11 a 16 septiembre

- [x] Aplicar mínimo privilegio a los objetos de aplicación y al owner `postgres` de las migraciones.
- [x] Revisar las RPC definer y publicar la matriz de excepciones del candidato local.
- [x] Implementar registro de lotes dummy con lifecycle y bloqueo de limpieza concurrente.
- [x] Ampliar dry-run y postcondiciones de limpieza.
- [x] Corregir localmente la consistencia del flujo de invitación y su idempotencia.
- [ ] Activar protección de contraseñas filtradas.

**Cierre:** Security Advisor queda sin avisos no aceptados; los avisos definer restantes tienen propietario, justificación y pruebas; el lote dummy está cerrado por defecto.

**Estado 2026-09-08:** DB y Edge `VERIFIED STAGING` en sus controles estructurales y negativos. La migración `20260908150936` deja 15 RPC definer ejecutables por `authenticated`, 5 contratos heredados revocados y 0 para `anon`; la matriz está en `docs/supabase/SECURITY_DEFINER_EXCEPTIONS.md`. La Edge Function `invite-clinic-member` v2 está `ACTIVE`, exige JWT y una petición anónima devuelve `401`; persiste un estado `pending` antes de Auth y completa membresía+auditoría atómicamente. Faltan la prueba funcional autenticada con un admin real/sintético, fijar `ABA_ALLOWED_ORIGINS` al definir el hostname y habilitar protección de contraseñas filtradas.

### Gate B3 — Backend funcional en staging — 16 a 21 septiembre

- [ ] Designar el primer admin mediante bootstrap controlado.
- [ ] Probar admin, supervisor y técnico con cuentas sintéticas.
- [ ] Ejecutar accesos positivos y negativos por REST, RPC y UI.
- [ ] Probar suspensión, asignación futura, clínica cruzada, URL manipulada y recursos de otro estudiante.
- [ ] Probar invitación, reintento, correo y recuperación de contraseña.
- [x] Confirmar que las lecturas usan columnas explícitas.

**Cierre:** estado `VERIFIED STAGING` para G1–G3; cero uso de pacientes reales.

### Gate B4 — Recuperación y operación — 21 a 25 septiembre

- [ ] Confirmar backup/PITR o alternativa aprobada.
- [ ] Restaurar en destino aislado y medir RPO/RTO.
- [ ] Validar logs sin contenido clínico y alertas mínimas de disponibilidad/error.
- [ ] Desplegar candidato en VPS con HTTPS, secretos y reinicio automático.
- [ ] Ejecutar healthcheck y smoke test desde red externa.
- [ ] Mantener los 54 índices señalados hasta contar con carga representativa.

**Cierre:** restore demostrado, despliegue repetible y soporte operativo documentado.

**Estado 2026-09-08:** `VERIFIED LOCAL`, operación externa pendiente. Docker Desktop 4.90 y Compose 5.5.1 validaron la configuración, construyeron la imagen mediante secreto BuildKit y levantaron un contenedor `healthy`; `/api/health` devolvió la respuesta esperada y los logs sólo mostraron el arranque de Next.js. `npm audit --omit=dev` reportó 0 vulnerabilidades de producción. La imagen validada se conserva por ID y el contenedor/red sintéticos fueron retirados. `deploy/README.md` documenta despliegue/rollback y `docs/runbooks/BACKUP_RESTORE.md` define backup lógico, restore exclusivamente aislado, hashes, invariantes y evidencia RPO/RTO. Siguen pendientes VPS/HTTPS y el ensayo de restore.

### Gate B5 — Aceptación y promoción — 25 a 29 septiembre

- [ ] Profesional valida ficha, programa, captura y resultado con fixtures.
- [ ] Congelar SHA y exigir CI verde en repositorio remoto.
- [ ] Congelar el lote dummy y detener nuevas escrituras durante el corte.
- [ ] Respaldar e inventariar por clínica, lote y tabla.
- [ ] Ejecutar dry-run; conciliar conteos; pedir confirmación de corte.
- [ ] Limpiar sólo lotes confirmados y comprobar postcondiciones.
- [ ] Cerrar/eliminar la posibilidad de crear lotes dummy en PoC.
- [ ] Verificar listas clínicas vacías, conservando cuentas, roles, organización y ledger.
- [ ] Marcar la versión `ACCEPTED` y luego `PUBLISHED`.

**Cierre:** la profesional ve un entorno vacío y funcional; no existen lotes `open`; hay evidencia de backup, restore, limpieza y despliegue del SHA aprobado.

## 4. Backlog priorizado

| ID | Prioridad | Hallazgos | Entrega | Gate | Estado al 8 sep |
|---|---|---|---|---|---|
| DB-01 | P0 | SBA-001 | Frontera única de escritura clínica | B0 | VERIFIED LOCAL + grants STAGING |
| DB-02 | P0 | SBA-002 | Bootstrap del primer admin | B3 | Bloqueado por decisión |
| DB-03 | P1 | SBA-003, SBA-009 | Registro y lifecycle de lotes dummy | B0/B2 | VERIFIED LOCAL + STAGING |
| DB-04 | P1 | SBA-004 | Reconciliación del ledger | B1 | VERIFIED STAGING; replay local PASS |
| DB-05 | P1 | SBA-005 | ACL deny-by-default | B0/B2 | VERIFIED STAGING para objetos app |
| BE-01 | P1 | SBA-006 | Invitación idempotente y consistente | B2/B3 | DB + Edge v2 VERIFIED STAGING; flujo admin pendiente |
| QA-01 | P1 | SBA-007 | Matriz autenticada en staging | B3 | Sólo VERIFIED LOCAL |
| OPS-01 | P1 | SBA-008 | Backup/restore y RPO/RTO | B4 | Runbook IMPLEMENTED; ensayo no verificado |
| DB-06 | P2 | SBA-010 | Registro de excepciones definer | B2 | VERIFIED LOCAL; aceptación pendiente |
| DEV-01 | P2 | SBA-011, SBA-012 | Supabase local/dev y documentación | B1 | VERIFIED LOCAL con Docker |
| BE-02 | P2 | SBA-013 | Proyecciones explícitas | B3 | VERIFIED LOCAL; 0 lecturas clínicas con `*` |
| REL-01 | P2 | SBA-014 | Push, CI y release SHA | B5 | Commit local limpio |
| PERF-01 | P3 | SBA-015 | Baseline post-PoC | Posterior a B5 | 57 INFO; diferido |

## 5. Especificación de mejoras

### DB-01 — Frontera única de escritura clínica

- **Objetivo:** que las invariantes de ficha no puedan evitarse mediante `/rest/v1/<table>`.
- **Objetos/consumidores:** `clients`, `guardians`, `siblings`, `client_context_profiles`, `clinical_history_entries`; `mvp_save_student`, `save_client_context`, `append_clinical_history_entry`; Server Actions clínicas.
- **Enfoque recomendado:** inventariar consumidores y revocar DML directo de `authenticated` en tablas gobernadas por comandos. Mantener `SELECT` mínimo. Si una tabla necesita DML invoker, trasladar la invariantes crítica a constraint/trigger antes de conservar el grant.
- **Alternativa descartada para MVP:** confiar sólo en que la UI no llama a las tablas; el Data API es una superficie pública y el cliente no es frontera de seguridad.
- **Migración/compatibilidad:** migración aditiva de tests y revokes; no backfill. Actualizar tipos sólo si cambian firmas. Validar rutas antiguas antes del revoke.
- **Lock/duración:** revokes toman locks de catálogo breves; aplicar fuera de escrituras activas.
- **Pruebas:** intento directo de update de ficha, familia, contexto e insert de historial debe fallar; las RPC equivalentes deben pasar; cross-tenant y suspended deben fallar.
- **Telemetría:** contar errores de autorización de comandos sin incluir payload clínico.
- **Rollback:** restaurar únicamente el grant exacto por tabla si un consumidor legítimo queda roto; nunca restaurar grants globales.
- **Aceptación:** cero DML directo no justificado y matriz de consumidores aprobada.

### DB-02 — Bootstrap del primer admin

- **Objetivo:** crear el primer `admin` sin abrir un superadmin permanente.
- **Objetos/consumidores:** `memberships`, `clinic_admin_events`, Auth, `mvp_team`, `mvp_set_member`, Edge Function.
- **Enfoque:** procedimiento de bootstrap de una sola vez ejecutado por operador autorizado, con identificación de clínica, cuenta ya verificada, before/after y evento de auditoría. Después, toda administración usa el flujo normal.
- **Migración/backfill:** no requiere esquema si se usa runbook; sí requiere una transacción SQL controlada. No enviar contraseñas.
- **Pruebas:** admin sólo ve su clínica, no puede retirar el último admin, puede invitar y suspender; otra clínica queda invisible.
- **Rollback:** restaurar rol anterior sólo si queda otro admin activo o mediante el mismo procedimiento de emergencia.
- **Aceptación:** cuenta designada entra, opera su clínica y el bootstrap aparece en evidencia de cambio.
- **Dependencia:** decisión del propietario sobre el correo.

### DB-03 — Lotes dummy gobernados y limpieza verificable

- **Objetivo:** convertir el “token dummy” en entidad de control, no en UUID libre.
- **Objetos:** nueva tabla mínima `test_data_batches` o equivalente, RPC de apertura/congelamiento, RPC clínicas con `p_test_run_id`, `mvp_cleanup_test_run`, ledger de limpieza.
- **Contrato mínimo:** `id`, `organization_id`, `status`, `created_by`, `opened_at`, `frozen_at`, `cleaned_at`; estados `open`, `frozen`, `cleaned`, `cancelled`. Sólo admin abre/congela/limpia. Una RPC acepta lote no nulo sólo si está `open` y pertenece a la clínica.
- **Compatibilidad/backfill:** registrar los 8 lotes existentes como legacy/dummy antes de usarlos; no cambiar ni eliminar filas en la migración inicial. Los descendientes pueden heredar lote por cliente, pero el inventario debe mostrar etiqueta directa y derivada.
- **Concurrencia:** lock de organización+lote; `freeze` impide nuevas escrituras; cleanup exige estado frozen y confirmación; una segunda ejecución es idempotente y devuelve `already_cleaned`.
- **Pruebas:** UUID inventado, lote de otra clínica, lote frozen, supervisor intentando abrir, escritura concurrente, doble cleanup y rollback ante fallo.
- **Telemetría:** eventos `batch_opened/frozen/cleaned`, conteos por tabla sin payload.
- **Rollback:** reabrir sólo antes de limpieza y por admin; una limpieza ejecutada se recupera desde backup, no reinsertando parcialmente.
- **Aceptación:** al publicar no hay lotes `open` y ningún usuario clínico puede etiquetar datos reales como dummy.

### DB-04 — Reconciliación de migraciones

- **Objetivo:** un único ledger coherente entre Git y staging.
- **Enfoque:** congelar DDL; respaldar el estado; obtener dump sólo de esquema; comparar cada uno de los cuatro cambios; alinear los nombres/versiones locales a las versiones remotas si el contenido es equivalente. Si no lo es, crear una migración correctiva nueva después de documentar la diferencia; no reescribir historia aplicada sin evidencia.
- **Compatibilidad:** preservar orden total de las 27 entradas y SHA del commit. No usar `migration repair` hasta conocer el estado exacto.
- **Pruebas:** replay en base vacía, `db diff` vacío contra el estado esperado, generación de tipos idéntica y segunda ejecución sin cambios.
- **Rollback:** revertir el cambio de archivos en Git; no alterar el ledger remoto durante la fase de comparación.
- **Aceptación:** 27 versiones/nombres coinciden y CI detecta cualquier deriva futura.

### DB-05 — ACL deny-by-default

- **Objetivo:** que un objeto nuevo no nazca accesible a `anon`/`authenticated`.
- **Objetos:** default ACL de `postgres` y `supabase_admin` en `public`; grants de las cuatro tablas nuevas; grants de funciones/secuencias.
- **Enfoque:** revocar defaults amplios para roles cliente y declarar grants por objeto junto a RLS/RPC. `service_role` conserva lo necesario. Revisar el owner efectivo que crea migraciones.
- **Migración:** separar corrección de objetos existentes y defaults futuros. Evitar `revoke all on all tables` sin matriz de consumidores.
- **Pruebas:** crear objeto canario en base efímera y comprobar ausencia de grants; anon no lee/escribe/ejecuta; flujo autorizado continúa.
- **Rollback:** grants explícitos por firma/tabla conforme a matriz, no restauración global del default.
- **Aceptación:** cero grants anon no justificados y nueva migración falla CI si omite RLS/grants.

### BE-01 — Invitación idempotente y consistente

- **Objetivo:** que un fallo entre Auth y DB no deje un resultado ambiguo.
- **Objetos:** `invite-clinic-member`, `memberships`, `clinic_admin_events`, nueva RPC transaccional de enlace/auditoría si procede.
- **Enfoque:** validar admin con RPC mínima; obtener/crear usuario de Auth con paginación o lookup soportado; ejecutar membresía+evento en una única RPC DB idempotente usando clave de operación. Si la invitación Auth fue creada y la DB falla, registrar estado pendiente y permitir reintento seguro; no intentar borrado destructivo automático de usuarios existentes.
- **Compatibilidad:** mantener respuesta pública actual y añadir `operationId/status` si se requiere. Limitar CORS al origen de producción y staging una vez definidos.
- **Pruebas:** sin JWT, no admin, otra clínica, email existente, invite duplicada, fallo antes/después de Auth, fallo de auditoría, reintento.
- **Telemetría:** operation ID, estado y códigos; nunca email completo en logs de infraestructura.
- **Rollback:** volver a la versión anterior de la Edge Function; reconciliar operaciones pendientes mediante runbook.
- **Aceptación:** ningún 500 deja una membresía no reconciliada y el reintento retorna el mismo resultado lógico.

### QA-01 — Matriz autenticada de staging

- **Objetivo:** elevar G1–G3 de `VERIFIED LOCAL` a `VERIFIED STAGING`.
- **Cobertura:** dos clínicas; admin, supervisor, técnico; suspended; future; no assignment; REST directo; RPC; UI; programa/versión ajenos; doble envío; conflicto; cleanup dry-run.
- **Datos:** sólo fixtures registrados en un lote dummy abierto; nunca pacientes reales.
- **Evidencia:** actor sintético, acción, resultado esperado/real, timestamp y SHA; sin capturas con contenido clínico.
- **Rollback:** limpiar exclusivamente el lote de la ejecución después de conservar conteos y evidencia.
- **Aceptación:** todos los negativos devuelven denegación o ausencia y todos los positivos persisten/reabren correctamente.

### OPS-01 — Backup, restauración y continuidad

- **Objetivo:** demostrar recuperación antes del primer paciente.
- **Enfoque:** confirmar política del plan Supabase; generar backup pre-corte; restaurar en proyecto/base aislada; verificar schema, cuentas/configuración según alcance, conteos agregados e invariantes.
- **RPO/RTO propuesto para PoC:** RPO máximo 24 h y RTO máximo 8 h, sujeto a aceptación del propietario y capacidades contratadas.
- **Seguridad:** backup cifrado, acceso mínimo, ubicación y retención documentadas; no descargar contenido clínico a equipos no autorizados.
- **Rollback:** si restore falla o excede objetivo, no publicar; ajustar plan/proveedor.
- **Aceptación:** acta de restauración con inicio/fin, versión, destino aislado y controles PASS.

### DB-06 — Matriz de RPC `SECURITY DEFINER`

- **Objetivo:** resolver los 16 avisos por decisión explícita.
- **Campos por firma:** consumidor, motivo de definer, tablas que evita por RLS, chequeo de `auth.uid`, chequeo tenant/capacidad, `search_path`, grants, prueba positiva, pruebas negativas y owner.
- **Enfoque:** conservar sólo las RPC que necesitan atomicidad, Auth inaccesible o auditoría privilegiada. Convertir a invoker cuando no se requiera elevación. Mantener helpers en `private` y revokes explícitos.
- **Pruebas:** anon, usuario sin asignación, otra clínica, suspended, input manipulado y llamada directa.
- **Rollback:** restaurar firma anterior sólo desde migración versionada.
- **Aceptación:** cada WARN restante tiene excepción aprobada; ningún warning nuevo queda sin dueño.

### DEV-01 — Entorno local/dev y documentación

- **Objetivo:** probar Auth/PostgREST/Edge además del SQL PGlite.
- **Enfoque:** inicializar configuración Supabase local compatible con Docker; conservar PGlite como suite rápida; añadir seed sintético versionado y comandos de reset. Si limitaciones de Windows/Docker lo impiden, usar segundo proyecto dev aislado.
- **Documentación:** corregir `supabase/README.md`, retirar “simulado” de lo ya aplicado y mover la spec Markdown fuera de `supabase/migrations`.
- **Pruebas:** start/reset/replay, Edge local, Auth sintético, tipos y test suite.
- **Rollback:** mantener PGlite y revertir config local; staging no se modifica.
- **Aceptación:** onboarding desde checkout limpio con un comando documentado.

### BE-02 — Proyecciones explícitas

- **Objetivo:** limitar datos recuperados y desacoplar UI del esquema completo.
- **Objetos:** queries de `src/modules/clinical/page.tsx` y repositorios relacionados.
- **Enfoque:** reemplazar `select('*')` por listas de columnas por caso de uso; mantener DTOs/mappers y Zod en frontera.
- **Pruebas:** render de ficha/programas/resultados, permisos por rol y test de contrato que falle si una columna nueva aparece sin decisión.
- **Rollback:** restaurar proyección anterior por query, no grants adicionales.
- **Aceptación:** ninguna lectura clínica principal usa `*`.

**Estado 2026-09-08:** `VERIFIED LOCAL`. Las diez lecturas amplias de `src/modules/clinical/page.tsx` declaran ahora sus columnas por caso de uso; `rg` confirma cero `select('*')`/`select()` sin proyección en `src`, y pasan lint, tipos, 24/24 pruebas y build de producción. Los DTO completos derivados de los tipos generados hacen que una columna nueva requiera una decisión explícita para volver a compilar.

### REL-01 — CI y congelamiento de release

- **Objetivo:** que la versión desplegada sea identificable y repetible.
- **Enfoque:** publicar el commit, ejecutar CI completo, proteger el SHA candidato, registrar hash de imagen y configuración no secreta. No desplegar desde working tree local.
- **Pruebas:** lint, tipos, 20 tests, 13 DB, E2E, build, replay, advisors y smoke de contenedor.
- **Rollback:** imagen anterior por digest y migraciones forward-fix; no usar reset destructivo de base.
- **Aceptación:** SHA, digest, CI y evidencia de deploy coinciden.

### PERF-01 — Baseline después de PoC

- **Objetivo:** decidir índices con carga real, no con cero/poquísimas filas.
- **Enfoque:** conservar los 54 índices señalados, capturar `pg_stat_statements` sin parámetros sensibles y revisar consultas lentas tras una ventana acordada.
- **Aceptación:** cualquier índice eliminado tiene consulta/plan, ventana de observación y rollback `CREATE INDEX CONCURRENTLY` cuando aplique.

## 6. Plan de pruebas

### 6.1 CI por cada cambio DB/backend

- [ ] Replay de todas las migraciones en base vacía.
- [ ] Comparación de ledger local/remoto cuando el job tenga acceso autorizado.
- [ ] Tipos TypeScript generados sin diff.
- [ ] Lint y typecheck.
- [ ] 20+ pruebas unitarias/integración.
- [ ] 13+ pruebas DB, ampliadas con DML directo, default ACL y lotes.
- [ ] E2E público y autenticado sintético.
- [ ] Advisor de seguridad y rendimiento; sólo excepciones registradas.

### 6.2 Casos obligatorios de autorización

| Actor/caso | Lectura | Escritura por RPC | DML directo | Resultado esperado |
|---|---|---|---|---|
| Anónimo | No | No | No | Denegado |
| Admin clínica A | Toda A | Toda A según comando | No para tablas command-owned | A permitido, B denegado |
| Supervisor asignado | Según capacidad | Ficha/programa/registro | No bypass | Permitido sólo en asignados |
| Técnico asignado | Ficha operativa/resultados | Captura/envío | No ficha/programa | Permisos mínimos |
| Membresía suspended | No | No | No | Denegación inmediata |
| Asignación futura/vencida | No | No | No | Denegado |
| Recurso de otra clínica | No | No | No | Denegado sin filtrar datos |

### 6.3 Casos de integridad y recuperación

- [ ] Corrección refiere un registro previo del mismo cliente/tipo y lo supersede atómicamente.
- [ ] Update con versión obsoleta produce conflicto visible.
- [ ] UUID idempotente repetido con mismo payload devuelve mismo resultado; payload distinto falla.
- [ ] Sesión sólo finaliza con al menos un registro enviado y ninguno pendiente.
- [ ] Lote dummy sólo acepta clínica/estado autorizados; frozen niega nuevas escrituras.
- [ ] Dry-run cuenta cada tabla; cleanup repetido es seguro; lote de otra clínica permanece intacto.
- [ ] Restore reproduce schema y conteos agregados; invariantes multi-tenant quedan en cero.

## 7. Promoción y corte

### Precondiciones

- [ ] `SBA-001` a `SBA-008` cerrados.
- [ ] Cuenta admin y profesional verificadas.
- [ ] Auth hardened, redirects/SMTP validados.
- [ ] VPS/HTTPS disponible.
- [ ] Backup y restore demostrados.
- [ ] SHA candidato en CI verde y aceptado por la profesional.

### Procedimiento

1. Bloquear cambios y escrituras nuevas.
2. Congelar todos los lotes dummy abiertos.
3. Tomar backup e inventario agregado por clínica/lote/tabla.
4. Ejecutar dry-run de cada lote y conciliar conteos.
5. Confirmar explícitamente la lista de lotes; nunca usar borrado global.
6. Ejecutar limpieza; validar postcondiciones y ledger.
7. Comprobar cero clientes, programas, sesiones y registros de prueba visibles.
8. Preservar organizaciones, cuentas, membresías y configuración acordadas.
9. Revocar cuentas/credenciales temporales y dejar `ABA_TEST_RUN_ID` vacío.
10. Desplegar el SHA/digest aceptado; ejecutar healthcheck y smoke autenticado.
11. Marcar `PUBLISHED` sólo después de la verificación de la profesional.

### Rollback de publicación

- La aplicación vuelve a la imagen anterior por digest.
- Las migraciones se corrigen hacia delante; no se usa `reset --hard`, drop global ni rollback destructivo.
- Si la limpieza debe revertirse, se restaura el backup en un destino aislado, se verifica y luego se decide la promoción; no se reinsertan filas manualmente.
- Si falla aislamiento, Auth o restore, se cierra el acceso clínico y la PoC no comienza.

## 8. Evidencia de cierre por gate

| Gate | IMPLEMENTED | VERIFIED LOCAL | VERIFIED STAGING | ACCEPTED | PUBLISHED |
|---|---|---|---|---|---|
| B0 Contención | Código/migración | Tests de bypass/lote | Advisors y grants | Responsable técnico | No aplica |
| B1 Reproducibilidad | Config/ledger/CI | Replay limpio | Ledger alineado | Responsable técnico | No aplica |
| B2 Seguridad | ACL/RPC/Edge | Matriz negativa | JWT/advisor | Propietario acepta excepciones | No aplica |
| B3 Funcional | Admin y flujos | Suite completa | Tres perfiles | Profesional | No aplica |
| B4 Operación | Deploy/runbook | Contenedor/restore | VPS/backup | Propietario | No aplica |
| B5 Promoción | SHA candidato | Ensayo de corte | Corte staging | Profesional | PoC habilitada |

## 9. Qué puede ejecutar el equipo y qué requiere al propietario

### El equipo técnico puede ejecutar

- DB-01, DB-03 a DB-06, BE-01, DEV-01, BE-02 y ampliación de pruebas.
- Reconciliación de migraciones, hardening de grants y Edge Function.
- Preparación de CI, runbooks, imagen, smoke tests e inventarios sin borrar datos.
- Pruebas sintéticas locales y, una vez existan las cuentas, en staging.

### Requiere decisión o acceso del propietario

- Elegir la primera cuenta admin y entregar el segundo correo si corresponde.
- Habilitar o autorizar configuración de Auth que el MCP no expone.
- Confirmar plan de backup/PITR y destino de restore.
- Entregar VPS/hostname y coordinar la aceptación profesional.
- Autorizar explícitamente el corte y los lotes a limpiar; no se limpiará nada durante el desarrollo.

**El equipo técnico puede ejecutar el backlog en este orden sin ampliar el alcance del MVP. La publicación requiere las decisiones y accesos del propietario indicados arriba.**
