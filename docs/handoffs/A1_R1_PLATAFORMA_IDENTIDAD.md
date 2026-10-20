# A1 — R1 Plataforma e identidad

Fecha: 2026-09-14. Estado: **ENTREGADO PARA REVISIÓN; GATE R1 NO ACEPTADO**. No hay QA aprobada. Este documento no cambia por sí mismo filas de matriz a INTEGRADO.

Checkout real: C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO. A1 conserva cambios del usuario y no edita app, domain, package/lock, tipos DB, migraciones, AppProviders ni MainLayout. Root integró las propuestas comunes.

## Estado actual y evidencia

- Runtime portátil oficial Node 22.23.2, npm 10.9.8 y CLI Supabase 2.117.0. ZIP contrastado con SHASUMS256 de nodejs.org; Node global no sustituido. Root ejecutó npm ci: 374 paquetes, exit0, lock existente preservado.
- Docker Desktop Linux/WSL2 29.7.2 operativo. Root detuvo el stack histórico aba_prototipo con backup y conservó sus volúmenes.
- Stack aislado aba-reintegration-local, workdir .aba.local/stack, red propia. A1 start -SkipWeb, handle10824, terminó exit0: diez servicios arriba, ocho healthy y Rest/EdgeRuntime up sin healthcheck Docker.
- Bindings reales comprobados: API 127.0.0.1:54321, DB :54322, Studio :54323, Mailpit :54324. Ningún wildcard. La inspección real, no una opción de red, respalda el aislamiento.
- Root aplicó 36 migraciones iniciales y después las de entrega durable y primera invitación: **38 aplicadas**. Root regeneró tipos desde public aislado, exit0. Ninguna migración aplicada por A1; sin reset ni seeds.
- A1 preparó exclusivamente lote **2155e99e-bda4-4c68-95cf-b74cacd84ecd**, exit0, manifest ready: dos clínicas y ocho identidades Auth reales, los cinco perfiles solicitados. Credenciales aleatorias en archivo ignorado .aba.local/batches/UUID.json, nunca stdout/docs.
- Root inició Next Compose aislado, Node22/Next16.3.4, disponible en 127.0.0.1:3000, red propia y cuatro archivos .env enmascarados RO. No npm dev directo con staging.
- Postman Desktop local 12.28.0 confirmado por root; colección/runner integral corresponde a A8/R5. No se creó ni ejecutó suite intermedia.
- Fuentes Edge inicial/reenvío revisadas e integradas por root. SyncFunctions con baseline y preview terminaron exit0. Serve -Apply **activo handle76753**, Edge recreado21:05UTC, ambos slugs/JWTtrue/entrypoints confirmados. Los diez contenedores noEdge (nueve Supabase+Web) conservan IDs/StartedAt exactos. Status loopback exit0. No se invocó Auth invitación como prueba; no reiniciar handle por timeout de observación.

Todos los handles anteriores de A1 terminaron. No reiniciar un proceso por haber excedido el tiempo de una observación.

### Historia de diagnósticos, no estado actual

Docker Desktop ignoró host_binding_ipv4 al publicar host:container, incluso en una prueba mínima propia; SUPABASE_NETWORK_ID y flag global conectaban la red correcta, pero seguían los wildcards. Root detuvo los intentos inseguros con backup antes de fixtures. Contenedores temporales propios retirados exactos, sin volúmenes.

La solución implementada es un adapter Docker CLI local, no proxy DockerAPI. C# .NET Framework compila en .aba.local/bin/docker.exe; PATH solo del proceso CLI, restaurado finally. RealDocker absoluto normalizado y verificado, quoting argv Windows exacto, streams binarios sin logs de argumentos/entorno/claves. Solo create/run del nombre+label+red aba-reintegration-local reescribe publicaciones válidas a127.0.0.1. Duplicados conflictivos, hosts ajenos y flags desconocidos fallan cerrado. Fuente oficial CLI2.117 confirmó los flags --ulimit/--env-file específicos de EdgeRuntime.

Windows PowerShell5 convierte progreso stderr normal en NativeCommandError bajo Stop. Helpers capturan stdout JSON separado, stderr no público y exit inmediato, con Continue limitado a la invocación nativa y restauración finally. Start comprueba errores inspect/ps/stop; nunca afirma parada sin confirmación Docker.

## Entrega y operación reproducible

Scripts scripts/local: instalación Node, common, configure, start, status, stop, write-env, fixtures, switch-role, cleanup, typecheck, backup, restore, build-docker-wrapper, DockerLoopback.cs, sync-functions y serve-edge. Runbook completo: scripts/local/README.md.

Configure inicial copia funciones/templates, **no migraciones ni seeds**. Configuración existente no se sobrescribe. -SyncFunctions sincroniza solo fuentes revisadas root, preflight de hashes/rutas/config antes de copiar. Reconoce hash previo manifest o baseline explícita exacta; drift, archivos extras, enlaces y env fallan cerrado. .aba.local/functions.snapshot.json contiene solo hashes. verify_jwt=true añade sección ausente, no reemplaza sección distinta. -Check es read-only.

serve-edge.ps1: preview default, -Apply explícito, foreground functions serve con red/workdir aislados y env vacío. Adapter PATH limitado al proceso. Recrea SOLO EdgeRuntime y refresca rutas Kong; no DB/Storage/volúmenes/fixtures. Fuentes CLI muestran que SUPABASE_INTERNAL_FUNCTIONS_CONFIG se congela al crear contenedor: per_worker no descubre nuevo slug/config JWT. docker restart no basta. Operación ejecutada por root, handle76753 activo.

Compose deploy/local.compose.yml y Dockerfile de desarrollo son separados del VPS. URL pública API http://127.0.0.1:54321; Next interno http://supabase_kong_aba-reintegration-local:8000. Browser localhost:3000; Studio54323; Mailpit54324. Monta browser.env RO sobre .env, .env.local, .env.development y .env.development.local, sin editar staging del usuario. Browser.env no contiene service-role.

Root integró AppProviders con un RoleProvider, MainLayout único delegando IdentityShell (props legacy opcionales ignoradas), /team→TeamPage, forgot/reset/change-password, cookies storageKey común derivado URL pública, URL interna servidor/proxy y bodySizeLimit20MiB+64KiB. A1 no añade providers/layouts paralelos.

## Identidad y perfil: contrato exacto

aba_identity_context(p_organization_id opcional/defaultNULL) retorna:

```ts
type Role = 'admin'|'supervisor'|'therapist';
type ClinicChoice = {id:string; name:string; role:Role};
type ProfessionalProfile = {
  id:string; email:string; joinedDate:string; name:string; profession:string;
  title:string; description:string; phone:string; avatarObjectPath:string|null;
  avatarPreset:'blue'|'indigo'|'green'|'violet'; version:number; updatedAt:string|null;
};
type IdentityDto = {
  userId:string; email:string; profile:ProfessionalProfile;
  choices:ClinicChoice[]; active:ClinicChoice|null;
};
type TeamMember = ProfessionalProfile & {
  role:Role; status:'active'|'inactive'; avatar:string; // legacy default ''
};
```

Zod valida UUID/email y DTO. Lecturas históricas permiten name/profession vacíos, sin fabricar nombres. Guardar exige name3..160, profession2..120, title<=160, description<=2000, phone<=40, avatarObjectPath<=500|null y preset cerrado.

Perfil **global por usuario Auth**, no copia por clínica. Admin solo edita profesionales miembros de su clínica; un cambio global se ve en las demás clínicas del profesional. Email viene Auth: cambio propio verificado por Auth, no edición del correo de terceros vía profile.

SaveProfileCommand: clinicId, targetUserId, expectedVersion, operationId, idempotencyKey y payload. Editor fija clínica/versión base al abrir y conserva IDs ante reintento exacto. Recibo leído con readCommandResult y operation/key/resource exactos; exige acknowledged. RPC autoriza antes de replay, locks/reautoriza, expectedVersion, mutación/audit/receipt en misma TX. Propuesta A1_identity_proposal.sql es referencia histórica; migración root aplicada es autoridad final.

**Scope de intención fijo:** consultas equipo/asignaciones y todos los comandos (perfil, membresía, avatar, invitación, reenvío y resolución) llevan clinicId esperado capturado. Servidor compara active.id===expected antes de RPC. Cambio de cookie no redirige silenciosamente una intención vieja a otra clínica. GetUser fresco + motor SQL vigente autorizan cada comando; no rol de metadata ni caché.

mvp_set_member compara user_id UUID, role y status exactos. set_student_assignment compara id UUID, organization_id, client_id, user_id, role y status exactos. Todos los RPC usan tipos DB reales regenerados, sin placeholders.

IdentityContext conserva árbol same-user TOKEN_REFRESHED/SIGNED_IN. Cambio real de usuario/SIGNED_OUT invalida; live/sequence guard inmediatamente después await getUser y al aceptar lectura. Error transient conserva trabajo, verifiedfalse y retry, sin confirmar comandos desde ese estado. Timers/subscriptions cancelados. Equipo same-clinic conserva editor/notices al refrescar; cambio usuario/clínica usa keyscope vacío. Mutación propia refresca identidad y equipo. Fallo de lectura postACK no se presenta como no guardado.

Login exige session/user válidos y email coincidente. Reautenticación password/email fija id/email, compara Auth response y getUser antes update, exige user recibido mismo ID. Recuperación no enumera emails. Cambiar email propio requiere contraseña y confirmaciones Auth anterior/nuevo.

## Primera invitación y reenvío durable

Fuentes/propuestas: A1_invitation_delivery_proposal.sql, A1_initial_invitation_boundary_delta.sql, A1_resend_clinic_invitation_edge.ts.proposal y A1_initial_invitation_edge.ts.proposal. Root integra versiones revisadas, no ejecutar propuestas paralelas.

Initial: begin intención → complete localiza Auth existente; si falta, admin.createUser(email,email_confirm:false) **sin correo ni contraseña conocida** → complete membresía → mismo worker durable resend. Auth local v2.196.0 genera contraseña internamente al omitirla; adminUserCreate no envía mail. Cuenta ya confirmada agrega membresía y pide iniciar sesión, no otra invitación.

Initial op/key son UUID canonical de invitación; namespace solo actor original. Replay recupera misma entrega, nunca nueva SMTP. Newop con miembro existente pide use-resend; no upsert de rol/status ni bypass último admin. Respuesta membresía: requestedOperationId exacto capturado, operationId canonical, status completed, userId, role, invited/replayed/alreadyAccepted, delivery nullable y deliveryError nullable. UI confirma membresía separada de correo.

Delivery DTO estricto: deliveryId, organizationId, invitationId, operationId, idempotencyKey, payloadVersion=1, state, version, createdAt, updatedAt, expiresAt|null, errorCode|null, confirmationSource|null, testRunId|null. **No claimToken, contraseña, link ni service-role**. Match exacto org/invite/op/key y deliveryId entre fases.

Reserva/lista/status/resolución: admin actual autenticado de clínica. Claim/finish: worker service_role solamente, actor derivado getUser JWT en Edge (nunca body), grants selectivos y recheck admin/target bajo lock. Bloqueo UNIQUE por clínica+destinatario, no solo invitationId. Lista conserva visible la operación canónica bloqueada aunque haya historia posterior.

pending90s sin claim→failed/reservation-expired: conocido sin intento autorizado de correo. claimed90s→unknown: pudo llegar SMTP. Ambas caducidades se evalúan bajo lock al consultar/reclamar/reservar; no reenvío automático. sent=Auth aceptó solicitud, **no acredita recepción ni aceptación**. Unknown exige revisión explícita/versionada: constaté correo en Mailpit, o autorizo futura petición con posible duplicado. Resolver no envía. Nueva operación tras sent/unconfirmed o failed definitivo es explícita; pending/claimed/unknown bloquean. SMTP+DB no son una transacción: no se promete exactly-once.

InvitationDeliveries mantiene IDs ante respuesta incierta, consulta mismo comprobante y permite replay exacto seguro; estado/ACK se conserva aunque refrescar falle. Targets confirmados o cambiados no reciben otro Auth invite. No resetPasswordForEmail de terceros.

## Shell y avatar

Mantine header70/sidebar280 original responsive, iconos por rol: admin Building2 azul, supervisor FileCheck índigo, técnico Stethoscope verde. Sidebar, menú profesional, editor, navegación y recorridos originales preservados. MainLayout root único admite slots search, notifications, offline, beforeSignOut, beforeClinicChange, support, plan y planModal.

A4: Popover320 + aceptar/rechazar/leído; A6 búsqueda; A5 UpgradePlanModal original y soporte; A7 bloqueo pendientes/offline. Fallbacks explícitos, nunca datos ni confirmaciones mock. Navegar a módulos aún provisionales no completa su acción.

Avatares reales privados JPEG/PNG<=5MiB con magic bytes, nuevo UUID path/no overwrite, URL firmada300s y renovación240s cancelable. Canvas local genera catálogo bitmap (cuatro categorías/doce opciones), selección→PNG→upload→comando perfil. Cancelar selector no escribe. Retirar/sustituir referencia no elimina bytes antiguos/orphans. Adapter provisional origin-interno exacto→origin público; A2 centraliza servicio común/autorización/dependencias/cleanup.

## Matriz: cobertura A1 y dependencias

| IDs | Base entregada | Pendiente para acción completa |
|---|---|---|
| IDENTIDAD-001,003..008 | Auth real, recovery/change/callback, contexto/scope/cambios sesión | QA Auth/Mailpit/RLS/revocación R5 |
| IDENTIDAD-002 | Logout Auth con error y beforeSignOut | Guard pendientes/offline A7; no marcar completo |
| IDENTIDAD-009 | Marca login vuelve landing | QA navegación R5 |
| IDENTIDAD-010,011 | GitHub/Facebook explícitamente no disponibles en local; sin login mock | No integración OAuth remota prometida |
| IDENTIDAD-012,013 | Términos/privacidad informativos locales versionados | No revisión legal afirmada; QA enlaces R5 |
| IDENTIDAD-014 | Acceso rápido simulado retirado; cuentas sintéticas Auth y utilidad local | Verificación utilidad real R5; no bypass |
| IDENTIDAD-015 | Volver login desde recuperación/cambio | QA recorrido R5 |
| SHELL-001,003,006..008,012 | Shell/editor reales y errores/reintentos | QA visual/responsive R5 |
| SHELL-002,004,005 | Navegación original conservada | Módulos provisionales R2–R4; no marcar completa navegación funcional |
| SHELL-009..011 | Upload/selección/referencia retiro-sustitución | Servicio común adjuntos y cleanup A2; Storage/RLS R5 |
| SHELL-013 | Selector rol simulado retirado; switch real exclusivamente local | Verificación final R5 |
| SHELL-014 | Email propio separado/verificado Auth; terceros read-only | Mailpit doble confirmación R5 |
| SHELL-015 | Teléfono profesional guardado con perfil versionado | QA persistencia R5 |
| SHELL-016,017 | Cancelación selector sin comando, categorías/local preview | A2 persistencia común; QA R5 |
| EQUIPO-001..007,010..013 | Equipo/adminscope/filtros/editor/membresías y reenvío durable; Edge sincronizado y servido | QA integral R5 |
| EQUIPO-008,009 | Asignaciones rol/status mediante RPC vigente; lectura is_primary/effective_at/ended_at reales | A2/R4 gestión supervisor principal/vigencias: RPC actual no admite primary/fechas, crea primary=false; no marcar acción completa |
| ESTADOS-009 | Cierre de alertas A1 sin confirmar ni repetir mutación | Estados de otros módulos según sus propietarios |
| BUSQUEDA/NOTIFICACIONES/PLANES/SOPORTE/OFFLINE | Slots/recorridos reservados, ausencia explícita | Adaptadores A4/A5/A6/A7 R2–R4 |

La aceptación root determina filas integrables. Entregar base R1 no implica cerrar dependencias A2–A7 ni QA.

## Fixtures, cleanup y pendientes

Lote ready actual conserva procedencia UUIDv4/metadata, nombres/clínicas/perfiles/membresías exactos. Dos clínicas, ocho Auth: admin/supervisor/técnico por clínica + externo/familia sin membresía general; supervisor-a dual y único designado switch-role. SQL fixture en un DO atómico por contrato db query2.117; batch open bajo lock, estados creating/ready únicamente. Reintentos no sobrescriben divergencias ni reabren clinical-cleaned. Catch sanitario categoriza errores sin dump SDK/CLI/statuskeys.

Switch-role usa contraseña Auth real, scope/batch/profile verificados, exactamente una membresía activa actualizada + audit TX, otro admin activo, logout temporal y error explícito. No ejecutado como prueba.

Cleanup preview default y RPC clínica histórica: retiene Auth/perfiles/avatars/recibos/membresías/clínicas; no limpieza integral fingida. A2–A7/root completan dependencias y bytes físicos R5. Backup custom PG sensible sin overwrite; restore solo target descartable validado, preview/confirmación/exit-on-error. Backups físicos Storage/provisión restore/conciliación y QA quedan R5.

Pendientes R1: revisión final root y aceptación gate. Sync/Edge, schema/tipos, fixtures y Next están preparados, no QA aprobada. Pendientes R2–R4: módulos/adaptadores y adjuntos A2. Pendientes R5: colección Postman A8 y QA integral Mailpit/callbacks/RLS/conflictos/replay/último admin/Storage/offline/responsive/backup/cleanup. No se creó ni ejecutó suite R0–R4.

## Revisión estática y fuentes

### Rollback seguro y forward-fix37/38

No reset, DROP de datos/ledger, borrado Auth ni reapertura del lote para reparar fallos. Conservar recibos, versiones, auditoría, cuentas y bytes confirmados. Ante error SMTP incierto, consultar/resolver delivery; nunca repetir con otra clave sin decisión explícita. Auth y DB ya confirmados no se deshacen por un error de lectura o despliegue posterior.

Root crea una **migración nueva por CLI** para corregir boundary/funciones/grants de37/38, revisando compatibilidad de DTO y recibos existentes; no reescribe historia aplicada ni cambia statuses terminales para fingir nuevo envío. Actualizar solo fuentes Edge revisadas mediante sync hashes; recrear SOLO Edge conservando DB/Storage/volúmenes/lote. Código UI puede restaurarse a versión compatible con schema aplicado; no revertir schema eliminando entregas. Pausar comandos de correo si la nueva función no está verificada, manteniendo lectura/recuperación. Verificación integral y estrategia de restauración se ejecutan en R5, no una suite intermedia.

Selector avatar conserva cuatro categorías/doce opciones/grid4, SegmentedControl centrado XS, spacing MD, borde azul de opción local seleccionada, hover/preview y estado conservado al reabrir. Esa selección visual no es un recibo de persistencia.

Node22 tsc --noEmit --incremental false exit0 después DTO inicial/reenvío y casts retirados; ParserPowerShell scripts/local exit0. Compilación shim exit0 y diagnósticos infraestructura no clínicos registrados arriba. No Auth invite/perfil RPC ni navegador QA ejecutados. Ejemplos manuales sin secretos: A1_POSTMAN_EXAMPLES.md.

Skill Supabase influyó en getUser, separación roles/RLS, grants worker selectivos, CLI pin y fuente actual. Guías Next bundled Auth/use-server/env/Link leídas antes código. QA recomendada por skill se difiere R5 por instrucción del usuario. Fuentes: [CLI2.117 Edge](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/shared/functions/serve.ts), [Auth local createUser](https://github.com/supabase/auth/blob/v2.196.0/internal/api/admin.go), [Auth local invite](https://github.com/supabase/auth/blob/v2.196.0/internal/api/invite.go), [Compose networking](https://docs.docker.com/compose/how-tos/networking/).
