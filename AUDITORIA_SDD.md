# Auditoría SDD — ABA_PROTOTIPO

Fecha: 2026-09-02
Alcance: revisión estática del repositorio tras la migración Vite → Next.js y revisión de solo lectura de `ABA_staging` en Supabase. No se modificó código, datos ni configuración remota.

## Resumen ejecutivo

La migración a Next.js compila correctamente y la integración base de Supabase Auth (cliente, cookies y `proxy`) está presente. Sin embargo, el producto **no está listo para una PoC con información clínica real**: la autenticación no está conectada al modelo de autorización de la interfaz, y los flujos clínicos siguen operando sobre datos mock mutables en memoria. La base de staging posee un modelo clínico y RLS bastante más avanzado que la aplicación, pero contiene avisos de seguridad que deben resolverse y probarse antes de exponer funcionalidades a usuarios reales.

Decisión: mantener Next.js + Supabase, pero detener la incorporación de datos clínicos reales hasta completar la fase P0. No hacer otra migración de framework. La prioridad es integrar el contrato de datos y autorización ya existente en Supabase, con pruebas de aislamiento por organización/estudiante/rol.

### Resultado de verificación

| Verificación | Resultado | Evidencia |
|---|---|---|
| Lint | Correcto, sin salida de errores/advertencias | `npm.cmd run lint`, 2026-09-02 |
| Build y chequeo de tipos | Correcto | `npm.cmd run build`; `npx.cmd tsc --noEmit`, 2026-09-02 |
| Rutas Next | 8 estáticas y 3 dinámicas compiladas; Proxy activo | salida de `next build` |
| Staging | `ACTIVE_HEALTHY`, PostgreSQL 17, región `sa-east-1` | MCP `get_project`, 2026-09-02 |
| Esquema clínico | 25 tablas `public`, todas con RLS habilitado | MCP `list_tables`, 2026-09-02 |

> Que el build pase no valida permisos clínicos, persistencia, rutas de usuario ni RLS. No existen pruebas automatizadas en `package.json` más allá de lint/build.

## Arquitectura observada

```text
Navegador
  └─ Next.js App Router (todas las páginas de negocio son Client Components)
       ├─ RoleContext local (rol simulable)
       ├─ src/views + src/features
       ├─ src/api/* (datos mock y mutaciones en memoria)
       └─ Supabase browser client (login/logout)
Next proxy.ts
  └─ Supabase SSR client → refresco de cookie + solo comprueba sesión
Supabase staging
  └─ Auth + PostgreSQL/RLS + RPC clínicas + tablas de auditoría/programas/sesiones
```

La ruptura principal está entre las dos últimas capas: la UI no consulta ni escribe las entidades de Supabase, pese a que el esquema ya dispone de `clients`, `student_assignments`, programas versionados, sesiones, consentimientos y auditoría.

## Clasificación de procedencia

| Clasificación | Criterio |
|---|---|
| **[MIGRACIÓN]** | Está en archivos nuevos/no versionados de la conversión a Next (`app/`, `proxy.ts`, `src/lib/supabase/`) o es una consecuencia directa de conservar la UI Vite como cliente. |
| **[PREEXISTENTE]** | Proviene del prototipo Vite/mocks o de la configuración ya existente de staging, no de un cambio de Next visible en el diff. |
| **[AMPLIFICADO]** | Era deuda previa, pero el login real o la PoC la convierten en riesgo actual. |

## Hallazgos priorizados

### P0 — bloquear uso con datos clínicos reales

#### P0-01 — La autorización de la UI es simulada y no deriva de la sesión ni de las capacidades RLS

- Clasificación: **[PREEXISTENTE] [AMPLIFICADO]**.
- Evidencia: `src/context/RoleContext.tsx:7-16` inicializa `admin` y permite cambiarlo localmente; `src/components/MainLayout.tsx:187-201` expone el selector Admin/Supervisor/Aplicador. El `proxy` solo comprueba existencia de sesión (`src/lib/supabase/proxy.ts:21-29`), no membresía, organización, asignación al estudiante o capacidades. En staging existen `memberships`, `student_assignments` y la RPC `get_student_capabilities`; las políticas de `clients`, `clinical_sessions` y `programs` usan `private.has_student_capability(...)` (MCP `pg_policies`, 2026-09-02).
- Impacto: la interfaz puede presentar acciones y datos de un rol que el usuario no posee. RLS puede rechazar las escrituras futuras, pero no evita confusión, intentos repetidos ni flujos clínicos mal diseñados. Si alguna RPC privilegiada falla en sus validaciones internas, el riesgo pasa a ser acceso indebido.
- Solución: obtener en servidor la identidad y pertenencia activa; crear un `AuthorizationContext` de solo lectura a partir de capacidades de Supabase por estudiante. Eliminar selector de rol fuera de un modo demo aislado. Ocultar y, sobre todo, impedir en servidor/RPC cada acción según capacidad.

#### P0-02 — Flujos clínicos, estudiantes, programas y accesos no persisten: usan mocks globales mutables

- Clasificación: **[PREEXISTENTE] [AMPLIFICADO]**.
- Evidencia: `src/views/StudentsPage.tsx:7-48`, `src/views/TeamPage.tsx:7-44`, `src/views/SessionPage.tsx:32-48`, `src/views/ProgramChartPage.tsx:29-48`, `src/views/DashboardPage.tsx:6-22`, `src/views/SharedAccessPage.tsx:24-73`; `src/components/MainLayout.tsx:62-115` muta `mockSharedAccess` y realiza polling cada 2 s. Búsqueda `rg` encontró dependencias de `src/api/*` en las vistas y features principales. README también lo declara en `README.md:40`.
- Impacto: alta probabilidad de que un usuario crea que guardó un dato clínico cuando se pierde al recargar; no hay trazabilidad real, concurrencia, ni control de acceso efectivo en UI.
- Solución: sustituir cada agregado mock por repositorios tipados de Supabase y consultas/mutaciones por caso de uso. Iniciar por listado/ficha de estudiante, luego sesión de datos, programas y autorización. Eliminar mutaciones `unshift`/asignaciones directas sobre módulos mock.

#### P0-03 — Diez RPC `SECURITY DEFINER` públicas para `authenticated`; auditoría sin políticas

- Clasificación: **[PREEXISTENTE — staging]**. No hay SQL/migraciones de Supabase en el repositorio actual; MCP lista migraciones existentes hasta `20260831230235`.
- Evidencia: advisor de seguridad de Supabase (2026-09-02) reporta `student_access_audit_events` con RLS habilitado pero sin políticas y diez RPC `public` `SECURITY DEFINER` ejecutables por `authenticated`: `create_client`, `set_student_assignment`, `request_student_authorization`, `decide_student_authorization`, `revoke_student_authorization`, `get_student_capabilities`, `append_clinical_history_entry`, `append_clinical_history_entries`, `save_client_context` y `record_consent_reference`. Consulta MCP a `pg_proc` confirma `authenticated=X/postgres` en las diez y `search_path` explícitamente vacío.
- Impacto: una función `SECURITY DEFINER` omite RLS. Es correcto usarla solo con una validación interna, mínima y exhaustiva; su superficie actual está expuesta a cualquier usuario autenticado mediante RPC REST. La tabla de auditoría queda inaccesible al cliente (fail closed), pero requiere una vía de escritura/lectura administrativa controlada y testeada.
- Solución: revisar función por función con pruebas adversariales. Mover helpers no invocables a `private`, revocar `EXECUTE` a `authenticated` cuando no sean API pública y mantener solo las RPC de negocio necesarias, con `auth.uid()`/membresía/capacidad validada dentro de la función, `search_path` fijo y grants explícitos. Definir la política de auditoría: inserción exclusivamente por trigger/definer y lectura solamente administrativa, o mantener deny-all explícito documentado si la escritura es interna. No cambiar grants “a ciegas”.

#### P0-04 — No hay pruebas de autorización, RLS ni flujos de datos clínicos

- Clasificación: **[PREEXISTENTE] [AMPLIFICADO]**.
- Evidencia: `package.json:5-10` define solo `dev`, `build`, `start` y `lint`; `rg --files` no encuentra directorios/archivos de tests. `npm.cmd run build` valida tipos/build, no aislamiento de filas ni mutaciones.
- Impacto: una modificación de RLS o una integración de cliente puede filtrar entre organizaciones, estudiantes o roles sin detección previa.
- Solución: suite de integración para los casos de autorización y tests E2E mínimos (login, logout, redirect, lectura/escritura autorizada/no autorizada). Ejecutarla contra una rama o proyecto Supabase de prueba, nunca staging compartido.

### P1 — resolver antes de la primera prueba de usuario

#### P1-01 — La migración usa App Router como SPA; no aprovecha frontera servidor/cliente ni validación de acceso por recurso

- Clasificación: **[MIGRACIÓN]**.
- Estado: resuelto parcialmente el 2026-09-02. Las rutas de lista y ficha de estudiante son Server Components: cargan los datos iniciales mediante el cliente SSR, aplican RLS y validan la capacidad por recurso antes de pasar datos a la UI cliente. Sesiones, programas y dashboard siguen pendientes de la misma separación.
- Impacto: se manda más JavaScript, no hay carga autenticada en servidor, aparecen estados transitorios y la protección depende por completo de middleware + RLS. No es un fallo de seguridad si RLS es correcto, pero es mala frontera para un CRM clínico.
- Solución: usar Server Components para obtener sesión, organización y datos de lectura; dejar como Client Components solo formularios, gráficos y registradores. Validar `studentId` y capacidades antes de renderizar la ficha/sesión; usar `notFound()`/redirect seguro.

#### P1-02 — `redirectTo` se genera pero el login siempre navega a `/dashboard`

- Clasificación: **[MIGRACIÓN]**.
- Evidencia: `src/lib/supabase/proxy.ts:25-28` añade `redirectTo`; `src/views/LoginPage.tsx:14-29` no lee query string y hace `navigate('/dashboard')`.
- Impacto: se pierde el destino solicitado; genera fricción y dificulta probar enlaces profundos a una ficha clínica.
- Solución: leer `redirectTo` con `useSearchParams`, permitir únicamente rutas internas con prefijo `/` (sin `//`) y hacer `router.replace(destinoSeguro)` tras login.

#### P1-03 — Navegación a `/chat` no existe y no hay ruta de negocio para invitaciones independientes

- Clasificación: **[PREEXISTENTE] [AMPLIFICADO]**.
- Estado: resuelto parcialmente el 2026-09-02. Se eliminó la navegación y el menú de chat, que no contaban con una ruta ni backend. El flujo de accesos compartidos continúa limitado hasta SDD-05.
- Impacto: navegación rota en PoC y funcionalidad incoherente.
- Solución: implementar cada ruta con alcance y autorización definidos, o eliminar/ocultar los enlaces hasta que el caso de uso esté disponible.

#### P1-04 — Protección de contraseña filtrada está deshabilitada y el login tiene enlaces/idioma incompletos

- Clasificación: contraseña **[PREEXISTENTE — staging]**; UX **[PREEXISTENTE]**.
- Estado: UX resuelta parcialmente el 2026-09-02. El login está en español y ya no muestra recuperación de contraseña ni enlaces legales sin funcionalidad. La protección de contraseña filtrada sigue pendiente de configuración remota de Supabase.
- Impacto: aumenta riesgo de credenciales comprometidas y la PoC presenta promesas de recuperación/privacidad que no existen.
- Solución: activar protección de contraseña filtrada en Auth; definir recuperación por correo, aviso de privacidad y términos antes de invitar usuarios externos. No mostrar enlaces ficticios.

#### P1-05 — Ausencia de tipos generados y de una capa de acceso a datos

- Clasificación: **[MIGRACIÓN]**.
- Evidencia: `src/lib/supabase/client.ts:3-7` y `server.ts:4-22` crean clientes sin genérico `Database`; no existe archivo de tipos generado ni repositorios/use-cases de Supabase. Las estructuras UI (`StudentProfile`, `Program`) provienen de `src/api/mockData.ts` y `src/api/programsData.ts`.
- Impacto: al conectar datos reales se producirán conversiones ad hoc, campos divergentes y errores en tiempo de ejecución.
- Solución: generar `Database` desde staging/branch y versionarlo; crear `src/modules/<dominio>/data` con mappers explícitos entre filas/RPC y DTO/UI. Ningún componente debe importar `@/api/*` una vez migrado su dominio.

#### P1-06 — Modelo de datos sólido pero con huecos funcionales para el CRM clínico

- Clasificación: **[PREEXISTENTE — staging]**.
- Evidencia: esquema MCP con organizaciones/membresías, clientes y asignaciones, sesiones y mediciones, programas/versiones/eventos, consentimiento/auditoría. No aparecen tablas para perfil de usuario, tareas/citas/calendario, comunicaciones/chat, adjuntos clínicos/Storage, notificaciones, facturación/planes, ni una entidad explícita de invitación de equipo/familia (solo `student_authorization_*`).
- Impacto: la UI anuncia equipo, accesos, chat y upgrade, pero el esquema no sustenta todavía esos productos.
- Solución: confirmar el alcance de PoC y especificar qué se implementa. Para cada caso no cubierto, crear esquema/migración revisada y políticas; no reutilizar `student_authorization_*` como “invitación” sin definir su semántica, ciclo de vida y consentimiento.

### P2 — calidad, mantenibilidad y operación

#### P2-01 — Restos de Vite y configuración de lint no alineada con Next

- Clasificación: **[MIGRACIÓN]**.
- Estado: resuelto el 2026-09-02. Se eliminaron `vite.config.ts`, los tsconfig de Vite, `index.html`, las entradas y activos de Vite; ESLint ya no usa una configuración Vite y TypeScript no excluye código muerto.
- Impacto: confusión operativa, dependencia visual de Vite y posibilidad de editar código muerto.
- Solución: retirar de forma controlada los artefactos Vite después de confirmar que no son necesarios, usar configuración ESLint recomendada para Next y documentar una única vía de arranque.

#### P2-02 — Componentes y vistas con responsabilidades excesivas y comentarios de migración en producción

- Clasificación: **[PREEXISTENTE]**.
- Evidencia: `src/features/students/StudentDetail.tsx` (882 líneas), `src/views/SharedAccessPage.tsx` (673), `src/components/MainLayout.tsx` combina navegación, Auth, roles, notificaciones y mocks (`:1-134`). Hay comentarios como “Simular polling” (`MainLayout.tsx:84`) y “rest hooks” (`:134`).
- Impacto: cambios de dominio producen regresiones y la migración de datos será más costosa.
- Solución: separar layout/presentación, use-cases, hooks de datos y modales; aplicar límites de responsabilidad y pruebas por módulo. Eliminar comentarios que describen simulación cuando se sustituya por implementación real.

#### P2-03 — Dependencias y versiones sin política de actualización/seguridad

- Clasificación: **[MIGRACIÓN]** para Next/Supabase; **[PREEXISTENTE]** para UI.
- Evidencia: `package.json:11-47` usa rangos `^`; Next declarado `^16.1.6` pero build informa `16.3.4`, lo que confirma resolución por lockfile. Coexisten Mantine y varios paquetes Radix/Sonner/next-themes sin evidencia de uso unificada. No hay scripts de audit, tests, CI o actualización.
- Impacto: actualizaciones no intencionadas y superficie de mantenimiento innecesaria.
- Solución: decidir una librería por necesidad (Mantine como base ya cubre casi toda la UI), eliminar paquetes no usados tras `npm ls`/búsqueda, mantener lockfile, añadir `npm audit --omit=dev` en CI y política de Renovate/Dependabot. Pinnear o adoptar actualizaciones controladas para Next/Supabase durante la PoC.

#### P2-04 — Índices sin uso reportados: observar, no borrar todavía

- Clasificación: **[PREEXISTENTE — staging]**.
- Evidencia: advisor de performance reporta índices “unused” en entidades nuevas como `consent_events`, `student_assignments`, `student_access_audit_events`, `programs`, `program_versions` y `program_lifecycle_events` (MCP, 2026-09-02).
- Impacto: posible coste de escritura/memoria; no evidencia aún de defecto porque staging tiene poco tráfico y tablas con 1–23 filas.
- Solución: no eliminarlos antes de contar con consultas reales y observabilidad. Revisar tras una ventana representativa del piloto con `pg_stat_user_indexes` y planes de consultas.

### P3 — producto y experiencia

#### P3-01 — Funciones de producto mostradas sin backend o definición operativa

- Clasificación: **[PREEXISTENTE]**.
- Evidencia: navegación y UI muestran Chat, Upgrade, búsqueda, notificaciones e invitaciones (`src/components/MainLayout.tsx:125-131`, `:203-276`, `:351-360`); los datos son locales o las acciones no tienen destino funcional.
- Impacto: expectativa incorrecta durante la PoC y desviación de foco.
- Solución: feature flags o estados “próximamente” claros; aprobar un catálogo de funcionalidades PoC y aceptar solo los casos de uso listados en este documento.

## Especificaciones de trabajo (Spec-Driven Development)

Cada especificación se implementa en una rama/PR con migración, pruebas y evidencia adjunta. No mezclar cambios P0 con rediseños visuales.

### SDD-01 — Autorización clínica y frontera de sesión

**Objetivo.** Garantizar que todo usuario autenticado solo ve y ejecuta acciones permitidas por su organización, asignación y capacidades del estudiante.

**Alcance.** Sustituir `RoleContext` como fuente de autorización; construir lectura de sesión/membresía/capacidades en servidor; validar el parámetro de cada ruta de estudiante; corregir redirección post-login; logout con manejo de error.

**Fuera de alcance.** Rediseño visual, multi-factor y facturación.

**Criterios de aceptación.**

- Un usuario sin sesión recibe redirect a `/login?redirectTo=<ruta-interna>`.
- Tras login válido vuelve al destino interno original; URLs externas/no válidas se descartan.
- Un usuario de otra organización o sin asignación recibe 404/403 sin datos del estudiante.
- Los controles de UI se basan en capacidades reales, no en un selector local.
- Tests cubren admin/supervisor/terapeuta/familia (si se mantiene), usuarios suspendidos y cruce de dos organizaciones.

**Riesgos.** Modelo actual de roles de UI (`admin`, `supervisor`, `therapist`, `family`) puede no coincidir con `memberships.role`/`student_assignments.role`; resolverlo mediante una matriz de capacidades aprobada antes de codificar.

**Pruebas.** E2E de rutas y pruebas de integración contra proyecto/branch aislado, incluyendo solicitudes REST/RPC directas con dos JWT de prueba.

### SDD-02 — Contrato tipado y persistencia de estudiantes

**Objetivo.** Reemplazar el primer dominio mock —estudiantes y ficha— por datos persistentes y autorizados.

**Alcance.** Generar tipos de Supabase; repositorio/DTO de `clients`, `guardians`, `siblings`, `client_context_profiles`, historial y asignaciones; cargar lista/ficha en servidor y mutaciones con validación Zod.

**Criterios de aceptación.**

- Crear/editar un estudiante autorizado persiste y sobrevive a recarga.
- Usuario no autorizado no puede enumerar, leer ni modificar el estudiante por URL o API.
- La UI muestra estados loading/empty/error y mensajes que reflejan el resultado real.
- No quedan imports de `mockData` en el dominio de estudiantes.
- Datos de prueba usan iniciales/identificadores mínimos; no se registra PII innecesaria en consola.

**Riesgos.** La UI actual tiene campos no idénticos al esquema (`fullName`, avatar, diagnóstico, documentos); definir mapeo o migración de esquema explícita, no almacenar campos ambiguos en JSON sin contrato.

**Pruebas.** Unitarias de mappers/validación; integración de RLS; E2E crear-editar-recargar-denegar.

### SDD-03 — Endurecimiento de RPC, auditoría y consentimientos

**Objetivo.** Cerrar la superficie privilegiada de base de datos antes de escribir datos clínicos desde la aplicación.

**Alcance.** Inventario y revisión de las diez RPC `SECURITY DEFINER`; grants mínimos; políticas/estrategia de `student_access_audit_events`; activar protección de contraseña filtrada; pruebas de seguridad.

**Criterios de aceptación.**

- Cada RPC expuesta tiene propietario, consumidor, acción permitida y validación de identidad/capacidad documentados.
- Ningún usuario autenticado puede crear, decidir o revocar asignaciones ajenas ni escribir historial de un cliente no autorizado.
- Advisor de seguridad no reporta `authenticated_security_definer_function_executable` sin excepción aprobada y documentada; `student_access_audit_events` tiene una estrategia explícita validada.
- Evidencia de eventos auditables para operaciones clínicas relevantes.

**Riesgos.** Revocar funciones existentes puede romper integraciones. Ejecutar primero en branch y hacer inventario de consumidores/logs.

**Pruebas.** Matriz negativa con JWT de usuarios de otra organización, rol insuficiente, asignación expirada/suspendida y parámetros manipulados.

### SDD-04 — Sesiones y captura ABA confiables

**Objetivo.** Guardar mediciones clínicas de una sesión de forma íntegra, autorizada y recuperable.

**Alcance.** Conectar `DataCollectionEngine`/recorders a `clinical_sessions`, `session_behavior_measurements` y `session_acquisition_trials`; definir estados de borrador/envío/corrección y comportamiento offline explícito.

**Criterios de aceptación.**

- Una sesión solo acepta programas/metas/planes del estudiante autorizado.
- Las métricas cumplen restricciones de unidad, denominadores y rangos; la operación es idempotente o tiene protección contra doble envío.
- La sesión conserva actor, hora, versión de programa y auditoría necesaria.
- Error de red no afirma que el dato fue guardado; recuperación documentada.

**Riesgos.** Las tablas permiten registro básico pero debe confirmarse la semántica ABA de cada dimensión y de la versión vigente del programa.

**Pruebas.** Validaciones de dominio, concurrencia/doble submit, RLS y recorrido de terapeuta autorizado/no autorizado.

### SDD-05 — Programas versionados, dashboards y compartición

**Objetivo.** Integrar el resto de la PoC sobre fuentes reales, sin reintroducir bypasses de seguridad.

**Alcance.** Programas/versiones/ciclo de vida, gráficos con consultas agregadas seguras, dashboard y el flujo de autorización de estudiante. Decidir si la UI “invitación” representa `student_authorization_*` o un nuevo dominio.

**Criterios de aceptación.**

- Programas se crean, versionan y activan según capacidad `program.edit`; gráficos solo usan datos autorizados.
- Dashboard no depende de listas mock ni expone datos agregados de otra organización.
- La semántica de aceptar/rechazar/revocar acceso queda respaldada por esquema, RLS y auditoría.

**Riesgos.** `program_versions.design` es JSONB: definir esquema Zod y versionado de contrato para evitar payloads inválidos.

**Pruebas.** RLS, transiciones de estado, snapshots de gráficos con datos de fixture y E2E de autorización.

### SDD-06 — Higiene de migración, calidad y despliegue

**Objetivo.** Convertir el repositorio en una base mantenible y entregable.

**Alcance.** Remover restos Vite, simplificar ESLint/dependencias, modularizar archivos de alto acoplamiento, configurar CI y entornos Supabase.

**Criterios de aceptación.**

- Un README describe una sola arquitectura y arranque; no quedan referencias ejecutables a Vite.
- CI ejecuta lint, typecheck, build y tests; las migraciones se revisan/aplican por ambiente.
- Staging y producción están separados; los cambios de esquema tienen migraciones versionadas en el repositorio.
- Dependencias directas están justificadas y auditadas.

**Riesgos.** No borrar configuración Vite hasta que el build de Next sea el único pipeline usado; realizar eliminación en PR pequeño y reversible.

## Roadmap recomendado

| Fase | Entregable | Puerta de salida |
|---|---|---|
| 0. Decisión y seguridad (P0) | Matriz de roles/capacidades, revisión RPC/RLS, entorno Supabase de prueba, protección de password | Tests negativos de aislamiento pasan; no warnings de seguridad no aceptados |
| 1. Identidad + estudiantes | SDD-01 y SDD-02 | Login/redirect/autorización y CRUD de estudiante reales, sin mocks en ese dominio |
| 2. Registro clínico | SDD-04 | Una sesión ABA real se puede capturar, reabrir y auditar de manera segura |
| 3. Programas y supervisión | SDD-05 | Programas versionados, gráficos y autorización compartida reales |
| 4. PoC controlada | Observabilidad, respaldo/restauración probado, soporte, consentimiento y onboarding | Checklist de piloto firmado; usuarios limitados, datos mínimos necesarios |
| 5. Endurecimiento | SDD-06, rendimiento y funcionalidades secundarias | CI, despliegue reproducible y revisión de índices basada en uso |

## Ejecución en curso

### 2026-09-02 — Inicio de SDD-01

- [x] Se generó y versionó src/lib/supabase/database.types.ts desde ABA_staging.
- [x] Se tiparon los clientes browser/server de Supabase con Database.
- [x] Se eliminó el selector local que permitía cambiar de rol. La UI obtiene la membresía activa mediante RLS y muestra el rol de membresía.
- [x] Se validan capacidades reales por estudiante antes de renderizar ficha (student.view), captura de sesión (record.capture) y gráfico (chart.view).
- [x] El login vuelve a un redirectTo interno validado; se descartan redirecciones externas.
- [x] Verificación: npm.cmd run lint, npx.cmd tsc --noEmit y npm.cmd run build.
- [~] SDD-02 iniciado: listado de estudiantes migrado a repositorio tipado de solo lectura sobre `clients`, con mapper explícito (`initials` e `clinical_id`) y estados loading/empty/error. La creación, edición y campos sin contrato (nombre completo, RUT, diagnóstico, familiares, medicación, sesiones) siguen bloqueados hasta definir su contrato y pruebas de autorización.
- [x] Se bloquearon en la ficha los controles clínicos que solo mutaban memoria (edición general, familia, medicación, programas, captura y compartición), evitando confirmar guardados inexistentes.
- [x] SDD-06 iniciado: se retiraron los artefactos de Vite, la configuración ESLint específica de Vite y su dependencia. Verificación: lint, typecheck y build de Next correctos.
- [~] P0-04 iniciado: Vitest cubre redirecciones internas seguras y el mapper de estudiantes. Pendientes las pruebas de integración RLS/RPC con dos organizaciones, que requieren el entorno Supabase aislado.
- [x] P1 de UX: se retiraron accesos a chat y enlaces de login sin funcionalidad.
- [x] P1 de arquitectura: lista y ficha de estudiantes migradas a lectura SSR con RLS.
- [ ] Pendiente: matriz aprobada de roles de producto frente a membresías/capacidades de base de datos.
- [ ] Pendiente: pruebas automatizadas de aislamiento RLS con usuarios de dos organizaciones.

## Decisión de arquitectura para la migración

**Aprobar y estabilizar Next.js App Router + Supabase; no volver a Vite ni iniciar otra migración.**

La forma objetivo debe ser:

```text
app/(public)                 páginas públicas/login
app/(clinical)/...           layouts protegidos y Server Components de lectura
src/modules/<dominio>/       contratos, repositorios, mappers, Zod y componentes
src/lib/supabase/            clientes browser/server/proxy tipados
supabase/migrations/         SQL versionado, políticas y pruebas RLS
tests/                       unitarias, integración RLS y E2E
```

Principios de ejecución:

1. RLS es la barrera final; los componentes solo mejoran UX, no autorizan.
2. Cada mutación clínica usa una ruta de negocio identificable, validación de entrada, capacidad explícita, idempotencia donde corresponda y auditoría.
3. No exponer `service_role` ni usar `user_metadata` como autorización.
4. Todo cambio de esquema pasa por branch de Supabase, migración versionada, advisors y pruebas de roles antes de staging/producción.
5. El alcance de PoC es captura clínica básica, no chat/facturación/upgrade, salvo especificación aprobada.

## Checklist de salida para piloto real

- [ ] P0-01 a P0-04 resueltos con evidencia de tests.
- [ ] Datos mock eliminados de los dominios expuestos a usuarios.
- [ ] RLS/RPC revisadas en branch, con excepciones documentadas y aprobadas.
- [ ] Consentimiento, aviso de privacidad, recuperación de contraseña y soporte definidos.
- [ ] Backups, restauración, retención y acceso administrativo verificados.
- [ ] Sentry/observabilidad o equivalente configurado sin PII clínica en logs.
- [ ] Prueba de dos organizaciones y cuatro perfiles antes de invitar al primer usuario.

## Limitaciones de esta auditoría

No se realizaron cambios, pruebas con credenciales de usuarios reales, llamadas que escriban en Supabase, revisión legal/regulatoria ni análisis dinámico del navegador. Los hallazgos de base de datos se basan en introspección MCP y advisors al 2026-09-02; las políticas/RPC deben validarse en una rama aislada con pruebas de autorización antes de modificar staging.
