# R4 — solicitudes internas de acceso V2

Fecha: 2026-09-26. Migración aplicada al entorno local; QA funcional no ejecutada.

## Alcance y persistencia

Se reutilizan `student_authorization_requests`, `student_authorization_decisions`,
las capacidades internas existentes y el ledger de comandos. No se crea un motor
alternativo ni se confunden solicitudes internas con invitaciones externas.
Chat continúa fuera del release según `docs/DECISION_CHAT_UPGRADE_POSTERIOR.md`.

Migración CLI: `20260922174831_collaboration_access_requests_v2.sql`.
La planificación mostró únicamente esta migración pendiente; se aplicó mediante
`scripts/install-local-schema.ps1 -Apply` sobre `aba-reintegration-local`, sin
reset, seeds, fixtures ni cambios de roles. No se aplicó a un proyecto remoto.

Contrato: `src/domain/collaboration/access-request.ts`.
Servidor: `src/modules/collaboration/collaboration.server.ts`.
Pantalla: `src/modules/collaboration/AccessRequestsPanel.tsx`, montada en la pestaña
Solicitudes de `src/views/SharedAccessPage.tsx`.

Crear una solicitud pendiente no concede permisos. Aprobar/denegar requiere
capacidad vigente, clínica/recurso coherentes, versión y recibo correlacionado.
Las decisiones nuevas aprobadas requieren expiración entre ahora y 90 días;
un replay exacto recupera su recibo incluso después de esa expiración.
El nombre completo de la ficha requiere `student.view` vigente; sin ella se
proyectan únicamente las iniciales para el historial del solicitante.

## Recuperación de comandos

El panel conserva identidad/payload cuando el resultado es desconocido, ofrece
reintento exacto, bloquea campos, cierre del modal y salida mediante shell/enlaces,
y advierte antes de recargar. El bloqueo síncrono evita dobles envíos antes del
próximo render. No ofrece transporte offline ni persistencia de borrador tras
recarga forzada; no confundir la advertencia de salida con recuperación durable.

Un rechazo/conflicto conserva el borrador y exige consulta explícita antes de
emitir una nueva decisión. El refresco no desmonta el panel. Un fallo de lectura
posterior al recibo confirmado no vuelve la escritura a resultado desconocido.

## Evidencia estática y de catálogo

- Checkout confirmado: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`; cambios existentes conservados.
- Historial local contiene versión `20260922174831`.
- `requests.version`: integer NOT NULL DEFAULT 1; `decisions.reason`: text NOT NULL DEFAULT ''.
- RLS habilitada en ambas tablas existentes.
- Los tres RPC públicos V2: SECURITY DEFINER, search_path vacío, EXECUTE para
  authenticated; sin EXECUTE para anon ni service_role.
- RPC legacy request/decide: EXECUTE revocado para PUBLIC, anon, authenticated y service_role.
- Tipos regenerados desde public del stack local usando directamente Node 22.23.2 portable.
- TypeScript, ESLint focal y diff --check focal: exit 0.
- Build Next 16.3.4: exit 0, 23 páginas/rutas; chat conserva `notFound()`.
- CLI 2.117: db advisors --local --type security --level warn: sin hallazgos.
- No Postman, suites funcionales, E2E ni datos clínicos consultados para esta evidencia.

## Pendientes antes del cierre definitivo

COMPARTIR-030/031 integradas técnicamente tras revisar contrato, persistencia,
pantalla/ruta, guardas y evidencia estática. No equivale a QA aprobada.

La migración forward-only `20260926141441_collaboration_access_request_hardening.sql`
está aplicada localmente. Su primer intento falló en la primera sentencia por
delimitador SQL; corregida la propuesta no aplicada, completó sin reset ni seeds.

- Aprobar exige membresía interna activa y asignación vigente coordinator/supervisor,
  o admin activo. La decisión no crea membresía ni asignación.
- Locks FOR SHARE de organización/ficha/membresías/asignaciones participantes
  preceden revalidación y escritura, serializando suspensiones concurrentes.
- Validadores PL/pgSQL rechazan tipos JSON/conversiones inválidas y acciones
  duplicadas. expectedVersion se limita a integer con espacio para incrementar.
- La lectura autorizada incluye última decisión y vigencia. El detalle muestra
  motivo/fundamento completos; reintentar y consultar están accesibles dentro del modal.
- Catálogo confirma ambas migraciones aplicadas y ACL privadas/API preservadas.
- Tipos regenerados; typecheck/ESLint focal y build de 23 rutas pasan; advisor
  de seguridad warn/error sin hallazgos. Sin suites funcionales ni Postman.

Pendientes globales: auditoría final R3/R4 y descarga familiar sensible reservada
a autorización adicional. ARCHIVOS-013 corresponde a limpieza física R5.
R5 validará doble envío, conflictos, replay, expiración, revocación y aislamiento.

## Precauciones de ejecución

`npm run local:schema` invoca Windows PowerShell antiguo, que no resolvió
Get-FileHash en esta sesión. Ejecutar el script existente con PowerShell moderno
conserva las comprobaciones de hashes/destino. No se relajaron sus controles.
`npm run local:types` no seleccionó el runtime correcto; el comando directo
`.runtime.local/node-v22.23.2-win-x64/node.exe scripts/generate-local-supabase-types.mjs`
sí completó la generación. No se actualizaron Node, CLI ni dependencias.
