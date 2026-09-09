# Spec de orquestación — cierre MVP a PoC clínica

Versión: 1.0
Fecha de corte: 2026-09-08
Objetivo de publicación: 29 de septiembre de 2026; 30 de septiembre reservado para contingencia.
Alcance: planificación y control de evidencia. Esta spec no autoriza migraciones, cambios de Auth/roles, despliegues, congelamiento ni limpieza.

## 1. Resumen ejecutivo

Faltan **10 corridas controladas de evidencia** para cerrar el paso MVP → PoC. Son el mínimo seguro porque separan cambios con distinto riesgo, propietario, rollback y gate: identidad/Auth; matriz autenticada; invitación; fallos parciales de Edge; CI/release; recuperación; VPS; ensayo de corte; UAT profesional; y corte/publicación.

No se vuelven a contar los controles ya acreditados:

- B0 y B1 están cerrados técnicamente.
- B2 DB está aplicada en `ABA_staging`; la Edge Function `invite-clinic-member` v2 está `ACTIVE`, con `verify_jwt=true`, y un POST anónimo devuelve `401`.
- RLS/grants, lifecycle dummy, migraciones y proyecciones explícitas tienen la evidencia local/staging indicada en el status map.
- Docker local ya pasó: configuración Compose, build con secreto BuildKit, contenedor `healthy`, healthcheck y revisión de logs. El 2026-09-09 se confirmó además Docker Engine 29.7.2 y el stack Supabase local operativo.
- B3 sigue bloqueado por completar Corrida 1 —login humano, alias separados, SMTP personalizado y decisión de riesgo por leaked-password protection no disponible en Free— y por la matriz autenticada; B4 conserva pendientes el backup real cifrado de staging, la aceptación RPO/RTO y la VPS; B5 por aceptación, corte autorizado y publicación. `ABA_staging` usa el plan Free y su proveedor SMTP compartido sólo entrega a miembros de la organización Supabase: los alias de prueba no pueden recibir invitaciones reales mientras no se configure un SMTP personalizado.
- Corrida 5 quedó **PASS** el 2026-09-09 sobre `640389c6a519992f89408d18b617204144e12fc4`: el push autorizado llegó a `origin/main` y GitHub Actions `34355815513` completó en verde `verify`, `supabase-local` y `container-build`. La publicación de una imagen en registro se mantiene como dependencia de despliegue de Corrida 7, no como evidencia ficticia de CI.

Decisión ejecutada parcialmente el 2026-09-09: en `ABA_staging` (`arfwuctpwnnuhdgjtxaa`), organización `11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa` —“Organización sintética E2E A”—, la cuenta privada provista por el propietario fue verificada en Auth y promovida mediante bootstrap transaccional autorizado desde `clinician` a `admin/active`. Para pruebas y UAT siguen planificadas tres identidades Auth distintas que llegan al mismo buzón: la cuenta base como admin y dos alias privados separados para supervisor y técnico. Los alias aún no fueron creados ni invitados. Los correos operativos se conservan fuera de Git; no se solicitan ni comparten contraseñas.

## 2. Qué es una corrida

Una corrida es una ventana de ejecución acotada con:

1. un objetivo, entorno y SHA inmutables;
2. entradas y autorizaciones confirmadas antes de empezar;
3. fixtures exclusivamente sintéticos y, cuando corresponda, un lote dummy gobernado;
4. tareas y casos de prueba predefinidos;
5. evidencia fechada sin PII ni secretos;
6. criterio binario `PASS`, `FAIL` o `BLOCKED`;
7. rollback y señal de aborto conocidos.

Las aserciones internas no son corridas adicionales. Un reintento por fallo de infraestructura no cuenta como cierre: la corrida conserva su número y queda `FAIL/BLOCKED` hasta repetirse completa. Si cambia una entrada inmutable, se abre una nueva revisión de esa corrida.

## 3. Arquitectura de agentes

La célula de planificación y validación tiene exactamente **1 orquestador + 4 subagentes efímeros**. Un agente usa un solo modelo durante toda su vida. El orquestador es el único que integra la spec y otorga el check.

| Agente | Modelo / reasoning | Paquete de tareas y vida de contexto | Entrega obligatoria |
|---|---|---|---|
| Orquestador | Sol / high | 10 corridas; mantiene ledger, dependencias y decisiones hasta el cierre | Spec integrada, validación de handoffs, gates y decisión go/no-go |
| `auth_backend` | Terra / high | 4 tareas principales: corridas 1–4; apoyo de configuración en 7; desaparece tras handoff B3 | Auth/bootstrap/Edge/RLS, pruebas, rollback y evidencia |
| `infra_recovery` | Terra / high | 2 tareas principales: corridas 6–7; apoyo operativo en 10; desaparece tras handoff B4 | Restore, VPS/HTTPS, RPO/RTO, rollback y acta |
| `qa_evidence` | Luna / high | 10 validaciones transversales; desaparece tras conciliar el ledger final | Matriz, evidencias, trazabilidad SHA y dictamen por gate |
| `clinical_cutover` | Luna / medium | 3 tareas: corridas 8–10; desaparece tras handoff B5 | UAT, corte, responsabilidades y señales de aborto |

### Calibración Sol/Terra/Luna

| Modelo | Se usa para | No se delega |
|---|---|---|
| Sol | Orquestación, resolución de conflictos entre gates, integración y go/no-go | Operar secretos o aprobar en nombre del propietario |
| Terra | Cambios de alto riesgo técnico: Auth, RLS, Edge, restore, HTTPS y rollback | Decisiones clínicas o autorización de corte |
| Luna | Ejecución estructurada: matrices, actas, evidencia, UAT y checklist | Alterar arquitectura o relajar un control para obtener PASS |

### Protocolo de vida efímera

1. **Spawn:** el orquestador entrega un paquete cerrado: objetivo, fuentes, entorno, tareas, prohibiciones y formato de handoff.
2. **Trabajo:** el subagente opera sólo dentro del paquete y conserva contexto únicamente por la cantidad de tareas asignada en la tabla anterior.
3. **Handoff:** antes de terminar entrega hechos, resultados, evidencia, pendientes, dependencias, rollback y recomendación `PASS/FAIL/BLOCKED`.
4. **Validación:** el orquestador contrasta el handoff con fuentes y evidencia primaria. El subagente no se autocertifica.
5. **Check:** el orquestador marca `ACCEPTED` o `REWORK`. Si es `REWORK`, devuelve una sola corrección concreta y valida una vez más.
6. **Desaparición:** después de un handoff `ACCEPTED`, el subagente termina; la fuente de verdad queda en la spec/ledger del orquestador. No conserva secretos, contraseñas, JWT, dumps ni acceso.

## 4. Matriz de decisiones

| Decisión | Recomendación | Responsable / fecha límite | Si falta |
|---|---|---|---|
| Primer admin y clínica | **DECIDIDO Y EJECUTADO 9 sep:** cuenta base verificada, organización sintética E2E A identificada y bootstrap a `admin/active` completado | Propietario + técnico / cumplido | Resuelto; no cierra Corrida 1 mientras falten login/alias y la decisión de riesgo Auth |
| Leaked-password protection | **LIMITACIÓN DE PLAN:** la organización usa Free y la función está disponible sólo en Pro+. No hay autorización de upgrade. Mantener el WARN y decidir explícitamente si el riesgo residual se acepta para la PoC con compensaciones gratuitas | Propietario con técnico / antes de cerrar Corrida 1 | Si el riesgo no se acepta, B2/B3 y la PoC permanecen bloqueados mientras se conserve Supabase gestionado Free |
| Entrega Auth por correo | **BLOQUEO VERIFICADO:** con el SMTP compartido, Supabase Auth sólo entrega a miembros de la organización propietaria del proyecto. Los dos alias privados de prueba no son miembros y requieren SMTP personalizado para invitación/recuperación real. Mailpit se limita a pruebas locales | Propietario + técnico / antes de cerrar Corrida 1 y obligatoriamente antes de la PoC | Corridas 1 y 3 permanecen bloqueadas; Corrida 8 no puede iniciar si Corrida 3 no acredita entrega real y recuperación |
| Hostname y URLs Auth | Definir hostname, Site URL, callback y `ABA_ALLOWED_ORIGINS` exactos | Propietario con técnico / 20 sep | Invitación/recuperación final y corrida 7 bloqueadas |
| Backup/PITR y destino | Confirmar plan y autorizar destino vacío, aislado y sin correo | Propietario / 20 sep | Corrida 6 y B4 bloqueados |
| RPO/RTO | RPO 24 h; elegir formalmente RTO 4 h o 8 h según plan/capacidad | Propietario / antes de corrida 6 | No existe umbral de aceptación de restore |
| VPS | Entregar VPS Linux, DNS y puertos 80/443 | Propietario / 22 sep | Corrida 7 bloqueada |
| SHA candidato | Publicar commit y exigir CI remoto verde | Técnico + propietario / 23 sep | Corridas 7–10 bloqueadas |
| Alcance UAT | Confirmar dimensiones y recorrido clínico soportado | Profesional / 24 sep | Corrida 9 bloqueada |
| Lotes a limpiar | Autorizar lista exacta después de freeze, backup y dry-run | Propietario + profesional / corrida 10 | Prohibido ejecutar cleanup |

La discrepancia documental vigente es explícita: `docs/runbooks/BACKUP_RESTORE.md` propone RTO 4 h y `SPEC_PLAN_MEJORAS_SUPABASE_BACKEND_2026-09-08.md` propone 8 h; el status map sólo exige medirlo.

### Identidades para pruebas y UAT

| Rol de prueba | Correo / buzón | Identidad requerida |
|---|---|---|
| Admin principal | Correo privado no versionado | Cuenta base verificada; bootstrap auditado completado; membresía actual `admin/active` en la organización sintética E2E A |
| Supervisor | Alias privado de supervisor no versionado | Usuario Auth separado, con `user_id` propio y una membresía `supervisor` en la misma clínica |
| Técnico | Alias privado de técnico no versionado | Usuario Auth separado, con `user_id` propio y una membresía técnica en la misma clínica |

Los alias Gmail comparten buzón de entrega, pero deben materializarse como **tres identidades Auth diferentes**. No representan tres roles simultáneos en una sola identidad: el contrato actual permite una sola membresía/rol por `(organization_id, user_id)`. Las pruebas RLS requieren tres `user_id` y JWT distintos para demostrar límites entre admin, supervisor y técnico. La cuenta base y la clínica ya fueron verificadas; antes de crear o vincular los alias se comprobará que Auth los acepte como identidades separadas. Si esa verificación falla, la corrida queda `BLOCKED` y no se modifica ninguna membresía adicional.

## 5. Las 10 corridas restantes

| # / ventana | Entrada | Tareas y agentes | Artefactos y pruebas | Criterio de cierre | Rollback / aborto | Dependencia propietaria |
|---|---|---|---|---|---|---|
| 1 — Auth y bootstrap, 9–11 sep — **PARTIAL/BLOCKED** | Bootstrap de cuenta base y entorno local completados; plan Free verificado; faltan login del propietario, SMTP personalizado, alias y decisión de riesgo | Pendiente: propietario inicia sesión; configurar SMTP personalizado sin exponer credenciales; aplicar/verificar compensaciones gratuitas; registrar aceptación o rechazo del riesgo HIBP; crear/invitar los dos alias y confirmar tres `user_id` distintos. `auth_backend` + `qa_evidence` | Bootstrap, evento, stack local y suites ya verificados; Mailpit acredita sólo el circuito local; pendientes entrega real pseudonimizada, mapa `user_id`→rol, pruebas de controles gratuitos y decisión firmada; el WARN no desaparece | Admin auditable; SMTP personalizado verifica invitación a ambos alias; identidades separadas y compensaciones PASS; si el propietario acepta explícitamente el riesgo, cierre condicionado con deuda; si no, `BLOCKED` | No revertir el admin aceptado; no usar Mailpit como evidencia de entrega externa; abortar alias si Auth no los separa; no degradar al único admin ni borrar usuario Auth | Handoff de login, proveedor/dominio SMTP autorizado, panel Auth, canal de invitación y decisión de riesgo |
| 2 — Matriz autenticada staging, 12–16 sep | Corrida 1 PASS; tres identidades/JWT distintos; dos clínicas; lote dummy abierto | REST/RPC/UI con admin, supervisor y técnico; asignado/no asignado/suspended/future/cross-tenant/URL manipulada/DML directo. `auth_backend` + `qa_evidence` | SHA, timestamp, actor sintético, esperado/real, códigos y conteos; persistencia y reapertura | Todos los positivos pasan; negativos deniegan o devuelven cero filas; sin paciente real | Congelar y limpiar sólo el lote confirmado cuando esté autorizado; ningún dato fuera del lote | Cuentas/JWT separados y autorización de fixtures |
| 3 — Invitación y recuperación, 16–18 sep | Corrida 1 PASS; SMTP personalizado operativo en staging; redirects finales | Invitación nueva/existente/duplicada, mismo `operationId`, reintento, entrega real a alias y password recovery. Mailpit repite el circuito sólo en local. `auth_backend` + `qa_evidence` | Estados `pending/completed`, una membresía/evento, códigos 400/401/403/409, recepción pseudonimizada y reset sin email completo | Flujo completo e idempotente; invitación y recuperación llegan mediante SMTP personalizado a identidades sintéticas separadas; Mailpit por sí solo no cierra el criterio | Reconciliar pendientes; desactivar/revertir configuración SMTP defectuosa sin exponer credenciales; rollback de Edge versionado; no borrar usuarios existentes | Proveedor SMTP, dominio/remitente verificado, custodia de credenciales y URLs Auth |
| 4 — Fallos parciales Edge, 18–19 sep | Harness controlado; corrida 3 nominal PASS | Inyectar fallo antes/después de Auth y durante finalización DB/auditoría; reintentar. `auth_backend` + `qa_evidence` | Operación durable; ausencia de duplicados y estados huérfanos; reintento mismo resultado lógico | Ningún 500 deja estado irreconciliable | Volver a Edge anterior y reconciliar por runbook; aborto si aparece membresía sin trazabilidad | Autorización de prueba controlada |
| 5 — CI y release candidata, 20–23 sep — **PASS** | Árbol conciliado, push público autorizado y Docker local disponible | Workflow de tres jobs, replay/tipos/suites, conciliación de migraciones, Advisors, build de contenedor y smoke. Orquestador + `qa_evidence` | SHA `640389c`; GitHub Actions `34355815513`: `verify`, `supabase-local` y `container-build` PASS; deriva `0`; digest local registrado | Un único SHA compartido con todos los jobs verdes | Mantener digest anterior; forward-fix; no desplegar desde working tree | Registro de imagen y VPS pasan a Corrida 7 |
| 6 — Backup/restore aislado, 21–24 sep — **PARTIAL/BLOCKED** | Ensayo local autorizado y PASS; faltan backup real cifrado de staging, custodia y aceptación RPO/RTO | Dump con hashes, restore transaccional sólo en stack Supabase vacío, conteos, referencias Auth, RLS, constraints y tiempos. `infra_recovery` + `qa_evidence` | Ensayo local: conteos conciliados; 0 tablas públicas sin RLS; 0 constraints inválidos en `public/private`; 0 membresías huérfanas; Auth saludable | Restore técnico local íntegro; cierre operacional exige backup real y objetivo aceptado | Descartar sólo el destino aislado y repetir desde vacío; nunca restaurar sobre `ABA_staging` | Destino cifrado/custodia y elección RPO 24 h + RTO 4 h u 8 h |
| 7 — VPS/HTTPS y smoke, 23–25 sep | Corridas 3 y 5 PASS; VPS, DNS, 80/443; secretos | Deploy por SHA, Caddy/TLS, Site URL/callback/CORS, healthcheck externo, alertas y logs. `infra_recovery` + `auth_backend` + `qa_evidence` | `/api/health` exacto, `compose ps`, SHA/digest, TLS, smoke autenticado y logs sin contenido clínico | HTTPS y smoke pasan desde red externa | Volver a imagen anterior por digest `--no-build`; no revertir DB con restore | VPS/hostname/DNS y configuración Auth |
| 8 — Ensayo de corte, 25–26 sep | B3/B4 PASS; Corrida 3 acredita SMTP personalizado y recuperación; backup disponible; todos los lotes identificados | Verificar salud no secreta del canal Auth; detener escrituras de ensayo; freeze; inventario por clínica/lote/tabla; dry-run; conciliación; sin cleanup real. `clinical_cutover` + `qa_evidence` | Estado frozen, canal Auth operativo, cero escrituras posteriores, conteos completos y confirmación requerida capturada | Invitación/recuperación real siguen operativas por SMTP personalizado; inventario y dry-run coinciden; ningún lote de otra clínica es afectado | Abortar si reaparece `Email address not authorized` o falla recuperación; reabrir sólo antes de cleanup, por admin y con autorización | SMTP personalizado vigente, ventana y autorización de freeze/ensayo |
| 9 — UAT profesional, 26–27 sep | Corridas 2, 5 y 7 PASS; fixtures dummy; SHA candidato | Ficha, estados UI, edición/recarga, programa/versión, captura, cancelación, reintento, reapertura/resultados y negativos. `clinical_cutover` + `qa_evidence` | Acta por escenario, SHA probado, incidencias y decisión explícita profesional | Responsable clínico marca `ACCEPTED`; no se infiere por CI | Mantener PoC cerrada y repetir sólo corridas impactadas tras corrección | Agenda y aceptación de la profesional |
| 10 — Corte y publicación, 28–29 sep | Corridas 5–9 PASS; lista exacta autorizada; backup verificado | Congelar cambios; confirmar lotes; cleanup exacto; postcondiciones; retirar `ABA_TEST_RUN_ID`; temporales; deploy final; healthcheck y smoke. Orquestador + `clinical_cutover` + `infra_recovery` + `qa_evidence` | Ledger cleanup; lotes `cleaned`; listas clínicas vacías; organizaciones/membresías/cuentas preservadas; SHA/digest y smoke | Profesional verifica entorno limpio y funcional; luego `PUBLISHED` | Detener promoción; rollback app por digest; recuperación sólo mediante restore aislado verificado, nunca reinserción manual | Autorización explícita de corte y presencia para validación |

### Evidencia parcial de Corrida 1 — 2026-09-09

Estado: **PARTIAL/BLOCKED**. El bootstrap y el entorno local están cerrados; la corrida completa no pasa hasta resolver cuatro frentes: handoff/login, SMTP personalizado con entrega real a identidades alias separadas, compensaciones gratuitas verificadas y decisión explícita del propietario sobre el riesgo residual.

- [x] Proyecto `ABA_staging` verificado: `arfwuctpwnnuhdgjtxaa`.
- [x] Organización objetivo verificada: `11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa`, “Organización sintética E2E A”.
- [x] La cuenta administradora privada estaba verificada en Auth y tenía membresía `clinician` antes del cambio.
- [x] Bootstrap transaccional ejecutado con autorización del propietario el 2026-09-09.
- [x] Estado posterior: `admin/active`; `active_admins=1`.
- [x] Auditoría insertada en `clinic_admin_events`: `action='bootstrap_admin:clinician_to_admin:owner_approved_2026-09-09'`, timestamp `2026-09-09 03:07:03.523999+00`, con `actor=subject`.
- [x] Advisor posterior: 15 WARN `security_definer`, todos documentados. Performance Advisor: 58 INFO `unused_index`; se conservan hasta disponer de carga representativa.
- [x] Docker Desktop localizado en su instalación por usuario; Docker Engine 29.7.2 operativo.
- [x] Supabase local activo con DB, Auth, API, Studio, Edge Runtime y Mailpit. Storage, Realtime y Analytics permanecen deshabilitados intencionalmente por estar fuera del alcance, conforme a `supabase/README.md`.
- [x] Dev server de Next reiniciado y login disponible nuevamente en `http://localhost:3000/login`, conectado a `ABA_staging`; no se confundió con el stack Supabase local.
- [x] Verificación local posterior: `npm run lint` PASS, `npm run typecheck` PASS y `npm test` PASS —5 archivos, 24 pruebas—.
- [x] `npm run test:e2e` PASS —2/2: login/recuperación públicos y deep link protegido conserva ruta y query—.
- [x] `npm run build` PASS —Next.js 16.3.4, 11 páginas generadas y rutas dinámicas compiladas—.
- [x] Pestaña `http://localhost:3000/login` entregada al propietario; ningún agente manejó credenciales.
- [x] Organización Supabase verificada con plan `free`.
- [x] Documentación oficial verificada: leaked-password protection usa HIBP y está disponible sólo en Pro+. No existe autorización de upgrade o contratación.
- [ ] El propietario inicia sesión con la cuenta administradora privada; después se ejecutan las invitaciones de los alias.
- [ ] Configurar SMTP personalizado en `ABA_staging` y demostrar entrega real de invitación/recuperación a ambos alias sin registrar direcciones completas, contenido, tokens ni credenciales SMTP. Mailpit no satisface este check.
- [ ] Mantener explícitamente sin resolver el WARN de leaked-password protection y registrar la decisión del propietario: aceptar deuda/riesgo residual para la PoC o mantenerla bloqueada.
- [ ] Crear o invitar los alias privados de supervisor y técnico, y verificar `user_id`/JWT separados.

### Compensaciones gratuitas y límites del plan Free

Estas medidas reducen exposición, pero **no consultan HIBP y no sustituyen leaked-password protection**:

- exigir una longitud mínima de 12 caracteres y la combinación más fuerte disponible de minúsculas, mayúsculas, dígitos y símbolos; probar con identidades sintéticas que una contraseña débil se rechaza, sin registrar la contraseña usada;
- una cuenta por persona y una sola identidad por rol; verificar `user_id` y JWT distintos, sin compartir credenciales entre usuarios;
- requerir contraseñas generadas y almacenadas en un gestor, sin reutilización entre servicios y sin datos personales; la evidencia es una declaración del propietario/usuario, nunca inspección ni captura de la contraseña;
- probar recuperación segura con redirect exacto, respuesta sin enumeración de usuarios y cambio de contraseña en sesión autenticada;
- usar Mailpit exclusivamente para pruebas locales de captura, plantillas y enlaces sin envío externo; no se acepta como evidencia de entregabilidad de staging;
- configurar SMTP personalizado antes de invitar los alias y antes de la PoC: desde el 26 de septiembre de 2024 el proveedor compartido sólo entrega a miembros de la organización Supabase, por lo que los dos alias reciben `Email address not authorized` mientras no sean miembros. Un Send Email Auth Hook puede ser una alternativa técnica, pero esta spec recomienda SMTP personalizado y exige evidencia equivalente si el propietario decide cambiar de mecanismo;
- verificar JWT de vida corta, rotación de refresh token, cierre de sesión y revocación de sesiones después de cambios sensibles. `Single session per user` y timeouts gestionados no se presentan como controles Free cuando el proveedor los reserva a planes superiores.

Cada control debe producir caso, esperado/real, configuración no secreta y timestamp. Ninguna evidencia puede contener contraseñas, tokens, cookies, claves o cuerpos completos de correo.

### Evidencia de Corrida 5 — 2026-09-09

Estado: **PASS**. La preparación local se publicó después de autorización explícita y se reprodujo en GitHub Actions sobre un SHA único. No hubo mutación adicional de staging ni publicación de imagen en un registro.

**Git y alcance implementado**

- [x] SHA candidato y remoto verificado: `640389c6a519992f89408d18b617204144e12fc4` en `origin/main`.
- [x] El repositorio contiene un workflow con tres jobs: `verify`, `supabase-local` y `container-build`. `container-build` ejecuta `actions/checkout@v5`, usa Buildx, `push: false`, argumentos públicos sintéticos y un secreto BuildKit sintético de CI.
- [x] El job `verify` declara `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sintéticos a nivel del job, para que Playwright/Next y build no dependan de un `.env.local` ausente en un checkout limpio. No son credenciales de staging.
- [x] `package-lock.json` v3 fija, entre otras dependencias, Next.js 16.3.4, Supabase CLI 2.117.0 y Playwright 1.63.0; `scripts/check-supabase-types.mjs` compara tipos generados localmente con los versionados.
- [x] `Dockerfile` consume el secreto de Server Actions mediante BuildKit; `.dockerignore` excluye `.git`, entornos, dependencias y documentos de auditoría.
- [x] Los cambios están versionados y publicados; antes del push se retiraron de la documentación los correos operativos y aliases identificables.

**Verificación local de esta continuación**

- [x] `npm run lint` PASS.
- [x] `npm run typecheck` PASS.
- [x] Después del reset, `npm test` PASS —5 archivos, 24/24 pruebas—; un intento aislado anterior falló sólo por `EPERM` al crear temporales y el mismo comando pasó fuera de esa restricción.
- [x] Después del reset, `npm run test:e2e` PASS —2/2—; un intento aislado anterior falló sólo por `EPERM` sobre `test-results/.last-run.json` y el reintento autorizado pasó.
- [x] `http://localhost:3000/login` responde HTTP 200 y sigue reservado para que el propietario ingrese sus credenciales; no se manejaron credenciales.
- [x] El workflow modificado pasa `git diff --check`; el checkout completo se vuelve a verificar al cerrar esta actualización.
- [x] Después del reset, `npm run build` PASS —Next.js 16.3.4, 11 páginas generadas y rutas dinámicas compiladas—.
- [x] Docker Desktop iniciado; `docker info` PASS con Docker Engine 29.7.2.
- [x] `npm run supabase:start` PASS; el stack local quedó disponible para reproducir el job `supabase-local`.
- [x] `npm run supabase:reset` PASS; aplicó las 30 migraciones del árbol, incluidas B0/B2, y cargó el seed exclusivamente sintético.
- [x] `npm run supabase:test:invitation` PASS con Auth/Edge/Mailpit locales: auto-registro bloqueado `422`, rechazo sin sesión `401`, no admin `403`, origen no permitido `403`, alta y reintento idempotente `200`, conflicto `409`, membresía/auditoría/operación persistidas y un único correo local capturado.
- [x] `npm run supabase:test:authorization` PASS con 17 controles Auth/JWT/RLS/RPC: dos clínicas, tres perfiles, suspensión, asignación futura, ausencia de asignación, equipo de clínica, DML directo y comandos cross-tenant.
- [x] `npm run test:e2e:local-auth` PASS 3/3 en un servidor Next.js aislado: admin limitado a su clínica y ruta cruzada 404; supervisor edita sin administración; técnico consulta/captura sin editar.
- [x] `npm run supabase:types:check` PASS; los tipos generados desde el esquema local coinciden con los tipos versionados.
- [x] El runner ejecutó `npm ci` desde checkout limpio en los jobs `verify` y `supabase-local`.

**Verificación remota agregada, sin PII**

- [x] Supabase MCP `list_migrations` devolvió exactamente 30 versiones: primera `20260818115847` y última `20260908150936`; coinciden con los 30 archivos SQL locales. Deriva de migraciones: `0`.
- [x] SQL remoto agregado: `active_admins=1`, `bootstrap_events=1`, `invitation_operations=0`; no se registraron identidades, correos ni payloads.
- [x] Security Advisors al 2026-09-09: 15 WARN `authenticated_security_definer_function_executable`, documentados e intencionales, más 1 WARN de leaked-password protection. El registro cierra la ejecución de Advisors de Corrida 5; no declara resuelto ningún WARN.
- [x] Performance Advisors al 2026-09-09: 58 INFO `unused_index`. No se eliminan índices sin carga real representativa.
- [x] Ledger, deriva y ejecución de Advisors ya no bloquean Corrida 5. El WARN de leaked-password protection y su decisión de riesgo permanecen abiertos en Corrida 1 y Gate B2.

**CI remota y release**

- [x] Árbol conciliado y commit local candidato creado (`feat: harden MVP release and Supabase workflow`). El SHA final se registra en el handoff externo para evitar una referencia autorrecursiva dentro del propio commit; el working tree quedó limpio al crear el checkpoint.
- [x] El propietario autorizó explícitamente el repositorio público; `afd30fb` y `640389c` fueron publicados en `origin/main` sin correos operativos versionados.
- [x] GitHub Actions `34355815513` PASS sobre `640389c`: `verify` 1m43s, `container-build` 1m09s y `supabase-local` 1m57s. El runner ejecutó lint, tipos, 24 pruebas, 2 E2E, build, `supabase start/reset/types:check` y build de contenedor.
- [x] Imagen local `aba-clinico:candidate-local` construida con valores sintéticos y BuildKit secret; digest local `sha256:2c09f2801de5e3381139eae65508576198334b369539d293239103147345a82c`. Smoke local de `/api/health` PASS con `{"status":"ok","service":"aba-clinico"}`; el contenedor temporal fue retirado.
- [ ] Definir registro/destino y publicar/conservar la imagen por digest. El digest local no sustituye una release disponible para la VPS.
- [x] `supabase/README.md` conciliado: documenta las 30 migraciones que existen en el árbol.

Dictamen del handoff efímero `ci_evidence`: la primera entrega contenía un falso positivo sobre la ausencia de checkout en `container-build`; se pidió una sola corrección. La entrega corregida se contrastó con workflow, Git, scripts y resultados actuales y queda **ACCEPTED**. Con el push y los tres jobs remotos verdes, Corrida 5 queda **PASS**.

### Evidencia parcial de Corrida 6 — 2026-09-09

- [x] Dump local sintético separado en roles, estructura `public/private` y datos completos incluidos Auth; hashes SHA-256 registrados en `docs/runbooks/BACKUP_RESTORE.md`.
- [x] Restore transaccional PASS en un stack Supabase temporal completo con GoTrue v2.196.0; nunca se conectó a `ABA_staging`.
- [x] Origen y destino conciliaron 2 organizaciones, 4 usuarios Auth, 4 membresías, 0 clientes, 0 sesiones, 0 registros de sesión, 30 tablas públicas y 57 políticas.
- [x] Invariantes: 0 tablas públicas sin RLS, 0 constraints inválidos en `public/private`, 0 membresías huérfanas y endpoint Auth saludable.
- [x] Se detectaron y rechazaron dos falsos positivos: PostgreSQL sin migraciones GoTrue produjo deriva Auth; el restore sólo de aplicación dejó 4 membresías huérfanas. Ambas transacciones fallidas se revirtieron por completo.
- [x] RTO frío local observado menor a 2 minutos, incluida descarga inicial de imágenes; restore SQL menor a 1 segundo. Dataset estático sintético: pérdida observada `0`, sin extrapolar a producción.
- [x] El stack temporal y los dumps se eliminaron; el stack original volvió con 2 organizaciones, 4 usuarios Auth, 4 membresías y 0 clientes.
- [ ] Generar y custodiar un backup cifrado real de `ABA_staging`, restaurarlo en destino autorizado y aceptar formalmente RPO 24 h con RTO 4 h u 8 h. Hasta entonces Corrida 6 y Gate B4 siguen `PARTIAL/BLOCKED`.

### Evidencia local de Corrida 2 — 2026-09-09

- [x] `scripts/test-local-authorization.mjs` crea siete identidades Auth efímeras y ejecuta todas las verificaciones de aplicación con sus JWT; la clave privilegiada sólo prepara actores y nunca se imprime.
- [x] Admin A ve y actualiza por RPC únicamente la ficha de clínica A; admin B únicamente la ficha de clínica B. La consulta manipulada y el comando cruzado devuelven lista/capacidades vacías o `42501`.
- [x] Supervisor asignado ve y edita la ficha, pero no recibe `authorization.decide` al no ser supervisor principal.
- [x] Técnico asignado recibe captura/consulta y no `student.edit`; usuario técnico sin asignación no ve fichas ni capacidades.
- [x] Suspender la membresía corta acceso inmediatamente aunque el JWT siga vigente; una asignación con inicio futuro no concede acceso anticipado.
- [x] `mvp_team` queda limitado al admin de la clínica; supervisor recibe `42501`. El DML directo sobre ficha también recibe `42501`, mientras la escritura por comando persiste.
- [x] Limpieza posterior restablecida: 2 organizaciones, 4 membresías, 4 usuarios Auth, 0 clientes, 0 asignaciones y 0 operaciones de invitación.
- [x] El job `supabase-local` ejecuta esta matriz después de la prueba de invitación.
- [x] Secuencia exacta de CI local PASS en un mismo stack: reset → invitación → autorización → tipos → reset; baseline final `2/4/4/0/0/0`.
- [x] E2E autenticado de interfaz PASS 3/3 contra Supabase local. El runner usa puerto 3100 y `.next-local-auth`, restaura archivos que Next genera y ejecuta reset aun cuando Playwright falle.
- [x] El E2E detectó y corrigió la etiqueta inaccesible de contraseña y dos llamadas `db.rpc` sin contexto en carga admin/Server Actions.
- [ ] Falta repetir la matriz con identidades separadas y JWT reales de `ABA_staging`; la evidencia local no cierra B3.

### Evidencia local de Corridas 3–4 — 2026-09-09

- [x] Se añadió `scripts/test-local-invitation.mjs` y el comando `npm run supabase:test:invitation`; no contiene secretos y obtiene el contexto exclusivamente del stack Supabase local.
- [x] Se corrigió `auth.email.enable_signup=true` para mantener operativo el proveedor email; `auth.enable_signup=false` continúa impidiendo el alta pública. Antes del cambio, GoTrue rechazaba el login con `email_provider_disabled`.
- [x] Invitación local con actor admin y JWT reales: primera ejecución `200/completed`; mismo `operationId` y payload `200` con el mismo sujeto; reutilización con otro rol `409`.
- [x] Controles negativos: auto-registro público `422`, petición sin sesión `401`, miembro técnico/no admin `403` y origen fuera de allowlist `403`.
- [x] Persistencia conciliada directamente en PostgreSQL: membresía `supervisor/active`, un evento de auditoría y operación privada `completed`; Mailpit capturó exactamente un correo.
- [x] Limpieza posterior con `npm run supabase:reset`: 2 organizaciones, 4 membresías, 4 usuarios Auth, 0 clientes y 0 operaciones de invitación.
- [x] El job `supabase-local` ejecuta la prueba después de reset y antes del gate de tipos.
- [ ] La evidencia es sólo local: SMTP personalizado, entrega externa y las tres identidades separadas de `ABA_staging` siguen pendientes para cerrar B2/B3.

## 6. Ruta crítica al 29 de septiembre

```text
Decisión admin/Auth (1)
  → matriz staging (2) ─┬→ CI/SHA (5) ───────────┐
  → invitación (3) → fallos Edge (4)             ├→ ensayo (8) → UAT (9) → corte/publicación (10)
Decisión backup/RTO → restore (6) ───────────────┤
VPS/hostname + (3) + (5) → deploy/HTTPS (7) ────┘
```

Los trabajos 5, 6 y preparación de VPS pueden avanzar en paralelo cuando sus entradas existan. El 29 es fecha objetivo; el 30 se usa sólo para contingencia. No se recorta una corrida para recuperar calendario.

## 7. Plan de pruebas y gates

| Gate | Corridas que lo cierran | Pruebas mínimas | Evidencia de salida |
|---|---|---|---|
| B2 — seguridad pendiente | 1, 3 y 4 | Controles Auth gratuitos; SMTP personalizado; entrega/recuperación real; JWT; CORS; invitación/idempotencia/fallo parcial; excepciones definer documentadas; riesgo HIBP decidido explícitamente | Configuración SMTP no secreta, recepción pseudonimizada, Advisor con WARN HIBP visible, pruebas de compensaciones, acta de riesgo, auditoría y estados de operación |
| B3 — funcional staging | 2, 3 y 4 | Dos clínicas, tres perfiles, suspended/future/no assignment, REST/RPC/UI, recurso/URL ajenos, recuperación | Matriz positiva/negativa con SHA y actores sintéticos |
| B4 — operación | 6 y 7 | Restore, conteos, RLS, constraints, RPO/RTO, HTTPS, healthcheck, logs y rollback de imagen | Acta recovery + acta deploy por digest |
| B5 — promoción | 5, 8, 9 y 10 | CI remoto, freeze/dry-run, UAT, cleanup idempotente, postcondiciones y smoke final | Aceptación profesional y evidencia de publicación |

Casos transversales obligatorios: conflicto de versión; doble envío; idempotencia; cancelación sin persistencia; lote ajeno/frozen; cleanup repetido; invariantes multi-tenant en cero; ausencia de payload clínico en logs.

## 8. Estados de evidencia y tablero

Una fila sólo avanza un estado con evidencia del nivel correspondiente.

| Entrega | IMPLEMENTED | VERIFIED LOCAL | VERIFIED STAGING | ACCEPTED | PUBLISHED |
|---|---|---|---|---|---|
| B0 contención | Sí | Sí | Sí en controles estructurales | Técnico pendiente de consolidación | No aplica |
| B1 reproducibilidad | Sí | Sí | Ledger alineado y CI `34355815513` PASS | Técnico cerrado en corrida 5 | No aplica |
| B2 DB/Edge | Sí; DB aplicada, Edge v2 activa | Sí | Estructural/negativo sí; Corrida 1 parcial, 3–4 pendientes | Propietario/técnico pendiente | No aplica |
| B3 flujos | Sí | Matriz Auth/JWT/RLS/RPC local PASS | Bootstrap admin verificado; alias y corridas 2–4 de staging pendientes | Profesional pendiente | No aplica |
| B4 operación | Runbooks/deploy sí | Restore aislado local PASS; Docker y Auth saludables | Backup real cifrado de staging y Corrida 7 pendientes | RPO/RTO y custodia pendientes del propietario | No aplica |
| B5 promoción | Procedimiento y CI de tres jobs versionados; Corrida 5 PASS | Docker 29.7.2, `supabase start/reset/types:check`, unit 24/24, E2E 2/2, build e imagen local PASS | SHA `640389c`, deriva 0, Advisors y CI remota verdes; registro de imagen y corte pendientes | Corrida 9 pendiente | Corrida 10 pendiente |

Definiciones:

- `IMPLEMENTED`: código, migración, configuración o runbook versionado; no prueba ejecución.
- `VERIFIED LOCAL`: prueba reproducible local, aislada y sintética.
- `VERIFIED STAGING`: prueba con configuración, usuarios/JWT y servicios reales de `ABA_staging`.
- `ACCEPTED`: aprobación explícita del responsable técnico, propietario o profesional según gate.
- `PUBLISHED`: SHA/digest aceptados desplegados, healthcheck, smoke autenticado y postcondiciones PASS.

No se aceptan porcentajes como evidencia. Tampoco se eleva automáticamente a `ACCEPTED` o `PUBLISHED` por CI verde.

## 9. Promoción, rollback y señales de aborto

Promover sólo si las diez corridas están `PASS`, los blockers del propietario están resueltos y el SHA/digest de UAT coincide con el de publicación.

Abortar y mantener la PoC cerrada si ocurre cualquiera de estos casos:

- Auth no confirma los alias como identidades separadas o se intenta representar tres roles con un solo `user_id`;
- el propietario no acepta el riesgo residual de operar la PoC en Free sin leaked-password protection;
- Auth, aislamiento cross-tenant, recuperación, CORS/redirect o SMTP personalizado fallan, o se pretende promover usando Mailpit como prueba de entrega externa;
- backup/restore falla, es parcial, excede el objetivo aceptado o apunta a staging;
- difieren conteos/invariantes, queda una tabla pública sin RLS o un constraint inválido;
- HTTPS, healthcheck, digest, logs o smoke autenticado fallan;
- freeze permite nuevas escrituras, dry-run no concilia o cleanup alcanza otro lote/clínica;
- quedan lotes `open`, listas dummy no quedan vacías o se alteran cuentas/organizaciones/membresías;
- UAT no es aceptada o el SHA publicado difiere del probado.

Rollback:

- aplicación: imagen anterior por SHA/digest, sin rebuild;
- base: migración compensatoria/forward-fix, nunca reset o grants globales;
- Edge: versión anterior más reconciliación de operaciones pendientes;
- cleanup: restaurar y verificar primero en destino aislado; nunca reinsertar filas manualmente;
- si falla aislamiento, Auth o recovery: cerrar acceso clínico y no iniciar la PoC.

## 10. Reglas de replanificación

1. Un bloqueo de entrada mueve la corrida; no convierte el gate en parcial.
2. Cambio de migración, contrato, grant, policy, Edge o SHA repite desde la primera corrida afectada.
3. Cambio de Auth, roles, JWT, SMTP, redirect o CORS repite 1–4 y el smoke autenticado de 7.
4. Cambio de proveedor, política, destino u objetivo RPO/RTO repite 6.
5. Cambio de imagen, secreto, hostname o Compose repite 5, 7 y 10.
6. Incidencia UAT repite la corrida técnica causal y luego 9; si cambia el SHA, también 5.
7. Diferencia de inventario o cleanup no autorizado aborta B5; no se corrige con DML manual.
8. Una evidencia sin SHA/timestamp/resultado o con PII se descarta y la corrida no cierra.

## 11. Evidencia permitida y prohibida

Evidencia mínima: SHA/digest, versión de esquema, timestamp, entorno, actor sintético/pseudonimizado, caso, esperado/real, código de resultado, conteos agregados, hashes y tiempos cuando aplique, responsable y dictamen.

Prohibido registrar: payload clínico, capturas con PII, dumps, cadenas de conexión, secretos, cookies, JWT, contraseñas, correos completos o tokens de confirmación. Tampoco son evidencia suficiente: porcentajes, promedios, “todo pasó”, código sin ejecución, CI local como prueba de staging, un SHA distinto del candidato, restore sobre staging, `DELETE` global o fixtures fuera de un lote gobernado.

## 12. Trabajo técnico restante

- [ ] Preparar runbook de bootstrap de una sola vez con before/after, auditoría y precondición de clínica/Auth verificadas.
- [x] Verificar la cuenta base, la clínica objetivo y el bootstrap auditado a `admin/active`.
- [x] Verificar Docker Engine 29.7.2, Supabase local, Next dev contra staging y las suites lint/typecheck/test/E2E/build.
- [ ] Después del login del propietario, ejecutar las invitaciones de alias sin manejar sus credenciales.
- [ ] Configurar SMTP personalizado en staging, validar dominio/remitente y probar invitación/recuperación real a los alias; conservar Mailpit sólo para local.
- [ ] Crear/invitar ambos alias y confirmar que las tres identidades Auth tienen `user_id` distintos antes de asignar sus membresías.
- [ ] Verificar longitud/complejidad, recuperación, redirects, rotación/cierre de sesión y no reutilización sin capturar credenciales.
- [ ] Registrar decisión del propietario sobre el WARN HIBP; las compensaciones no permiten marcarlo resuelto.
- [ ] Completar corridas 1–4 con cuentas sintéticas y JWT reales de staging.
- [ ] Resolver y registrar RTO 4 h vs 8 h.
- [x] Preparar localmente los tres jobs de CI, hacer explícita la configuración Supabase sintética del job `verify` e incorporar Auth/Edge/Mailpit al job `supabase-local`.
- [x] Conciliar/versionar el árbol, ejecutar Corrida 5 desde checkout limpio y congelar el SHA `640389c` con CI remota verde.
- [x] Ejecutar y documentar el ensayo de restore local sólo en un stack Supabase aislado.
- [ ] Repetir Corrida 6 con backup cifrado real de staging, destino/custodia autorizados y RPO/RTO aceptados.
- [ ] Configurar VPS/HTTPS/Auth/CORS y cerrar corrida 7.
- [ ] Preparar fixtures, actas y evidencia sin PII para 8–9.
- [ ] Ejecutar freeze/inventario/dry-run sin limpieza en corrida 8.
- [ ] Ejecutar cleanup/publicación únicamente en corrida 10 autorizada.
- [ ] Conciliar el ledger final y archivar los cuatro handoffs efímeros.

## 13. Decisiones y accesos del propietario

- [x] Confirmar la cuenta principal/admin privada, decisión recibida el 2026-09-09; el correo no se versiona.
- [x] Identificar la organización sintética E2E A, verificar la cuenta base en Auth y completar el bootstrap transaccional a `admin/active`.
- [ ] Completar personalmente el login de la cuenta administradora privada en la pestaña entregada; el equipo no recibe la contraseña.
- [ ] Crear/invitar las identidades separadas de supervisor y técnico con los alias privados acordados; detenerse si Auth no genera un `user_id` distinto para cada una.
- [ ] Aceptar o rechazar explícitamente el riesgo residual del plan Free sin leaked-password protection; no se autoriza upgrade. Si se rechaza, no iniciar la PoC.
- [ ] Aprobar y cumplir las compensaciones gratuitas; el WARN permanece abierto y no se declara equivalente a HIBP.
- [ ] Proveer canal de correo sintético para invitación/recuperación sin compartir contraseñas.
- [ ] Autorizar proveedor SMTP personalizado, dominio/remitente, custodia de sus credenciales y configuración previa a la PoC; no incorporar los alias como miembros de la organización Supabase para eludir el gate.
- [ ] Confirmar backup/PITR, custodia, retención, destino aislado y RPO/RTO.
- [ ] Entregar VPS/hostname/DNS y ventana de operación.
- [ ] Coordinar UAT y confirmar dimensiones clínicas soportadas.
- [x] Autorizar la publicación pública y el SHA candidato `640389c`, decisión recibida el 2026-09-09.
- [ ] Autorizar explícitamente el freeze y, por separado, la lista exacta de lotes a limpiar.
- [ ] Estar disponible para la verificación final previa a `PUBLISHED`.

## 14. Registro de validación de los subagentes de planificación

| Subagente | Validación del orquestador | Resultado |
|---|---|---|
| `auth_backend` | Contrastado con status map, plan backend, auditoría y SDD-07 | ACCEPTED |
| `infra_recovery` | Contrastado con deploy README, runbook y status; detectó RTO 4 h vs 8 h | ACCEPTED |
| `qa_evidence` | Contrastado contra gates, pruebas ya ejecutadas y pendientes | ACCEPTED |
| `clinical_cutover` | Primera entrega atribuyó 4 h al status map; se pidió una corrección concreta y se revalidó | REWORK → ACCEPTED |
| `ci_evidence` | Primera entrega reportó erróneamente que `container-build` no hacía checkout; se pidió una corrección concreta y se revalidó contra workflow, Git y pruebas | REWORK → ACCEPTED |

## 15. Fuentes

- `STATUS_MAP_2026-09-08.md`
- `SPEC_PLAN_MEJORAS_SUPABASE_BACKEND_2026-09-08.md`
- `AUDITORIA_SUPABASE_ESTRUCTURA_2026-09-08.md`
- `SPEC_SDD_07_POC_CLINICA.md`
- `OPERACION_POC.md`
- `deploy/README.md`
- `docs/runbooks/BACKUP_RESTORE.md`
- [Supabase Password Security](https://supabase.com/docs/guides/auth/password-security): leaked-password protection sólo en Pro+ y recomendaciones de fortaleza/no reutilización.
- [Supabase Auth SMTP](https://supabase.com/docs/guides/auth/auth-smtp): límites del proveedor por defecto y alternativas custom SMTP/Send Email Hook.
- [Supabase Auth: Changes to default email provider — changelog 2024-09-18](https://supabase.com/changelog/29370-supabase-auth-changes-to-default-email-provider): desde el 26-09-2024 el proveedor compartido entrega sólo a miembros de la organización y afecta también invitación/recuperación.
- [Supabase Pricing](https://supabase.com/pricing): disponibilidad por plan de leaked-password protection, single-session y session timeouts.
- `git status` y `git diff` del checkout operativo; sus cambios preexistentes se preservan.

La aprobación de esta spec no autoriza pacientes reales ni sustituye las autorizaciones de Auth, restore, VPS, freeze, cleanup o publicación.
