# Auditoría de ensamblaje R3/R4 — 2026-09-26

Estado: en curso. Revisión estática y de integración, no QA funcional ni aceptación final.
Checkout: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.
Los cambios existentes se conservan; no hubo reset, seeds, fixtures ni publicación.

## Hallazgos del segundo barrido — cierre no acreditado

- Invitaciones externas: el catálogo confirmó un CASE que emitía accept/reject/
  resend/cancel/revoke frente a CHECK de accepted/rejected/resent/cancelled/revoked.
  Migración forward 20260926150023 aplicada localmente: conserva CHECK, autorización,
  locks, payload, ledger y datos; corrige mapeo de eventos. Catálogo mantiene ACL
  privada sólo postgres y search_path vacío. Advisors: No issues found.
- Offline: aislamiento de resultados tardíos y transacciones de recuperación,
  descarte/retirada corregidos; detalle en R3_A7_REVISION_INTEGRACION.md.
- A6: V1 omitido, detalle métrico reducido y series originales ausentes encontrados
  por revisión de fuente. program-results.tsx corregido: sección V1 preservada y
  exportable sin reconstrucción, detalles canónicos UI/PDF/CSV, toggles I/A/E/NR,
  neutralización de fórmulas CSV y errores de exportación visibles.
- A4: detalle de invitación/mensaje invisible, recuperación Realtime incompleta y
  comandos contrapuestos de lectura corregidos. Campana recupera al abrir,
  SUBSCRIBED, online/focus/visibility y cada 60s visible/online; secuencia latest-only,
  bloqueo por recurso y reintento exacto. MainLayout compone guarda de campana con
  navegación, atrás/adelante, logout y clínica; beforeunload/enlaces protegidos.
  SharedAccessPage muestra detalle/mensaje/estado/fechas sin escribir.
- Pendientes detectados en este corte histórico, corregidos en el último corte abajo: filtro/multiselección
  de estudiante y periodos originales del dashboard; CSV de diseño de programa;
  locks/revalidación al materializar recordatorios ante cancelación/revocación
  concurrente. La selección inicial de elegibilidad no basta para ese último gate.

Las marcas previas INTEGRADO del inventario son evidencia histórica de conexión,
no cierre definitivo de estas brechas. Mantener objetivo activo hasta corregir y
conciliar estos puntos; QA funcional continúa reservado a R5.

Verificación final de este corte: ESLint de los ocho archivos modificados exit 0;
Next build/TypeScript exit 0, 23 páginas y /family/documents dinámica. La migración
correctiva no cambia contrato DB; tipos regenerados desde catálogo. Advisors sin
hallazgos. Sin suites funcionales, Postman, reset, fixtures ni publicación.
Inventario corregido a 402 INTEGRADO + 2 PENDIENTE R4 + 16 QA + 1 R5 + 13 upgrade;
434 filas. No usar el conteo anterior 404 como evidencia de cierre vigente.

## Requisitos y evidencia inspeccionada

| Requisito | Evidencia actual | Dictamen de este corte |
|---|---|---|
| Una aplicación y rutas reales | App Router: dashboard/shared-access/invitations/family/offline-workspace; MainLayout; RoleProvider | Conectados; sin segunda aplicación clínica activa |
| Chat excluido | app/chat/page.tsx ejecuta notFound; grafo runtime sin módulos/chat ni ChatPage | Exclusión respetada; código dormido conservado |
| Identidad y shell comunes | AppProviders → RoleProvider → IdentityProvider/OfflineProvider; MainLayout → IdentityShell | Un único montaje de proveedores raíz |
| Solicitudes internas V2 | R4_SOLICITUDES_ACCESO_V2.md; migraciones 20260922174831 y 20260926141441 | Integradas técnicamente; QA R5 pendiente |
| Familia: programas/resultados seleccionados | family.server/contracts; aba_family_portal_read_v2; FamilyPortalPage; FamilyPublishedContent | Consulta real del contenido publicado, no solo títulos/fechas |
| Familia: documentos publicados | RPC dedicado, política Storage por operación y /family/documents; R4_DESCARGA_FAMILIAR_SEGURA.md | Implementada tras autorización explícita; QA R5 pendiente |
| Familia: agenda | loadFamilyHome y familyCalendarPage; ruta family | Conectada por participación explícita |
| Notificaciones y recordatorios | notifications.server/Bell; 20260921003020; recibos por destinatario | Integración presente; navegación respeta guarda del shell |
| Dashboard/búsqueda | dashboard.server/contracts, DashboardPage, AuthorizedSearch | Proyecciones autorizadas; se corrigió aislamiento de actor/contexto |
| Resultados/reportes | results.server, program-results.tsx; readPersistedMeasurement/measurementV2Metrics | Gráfico/metas/exportación conectados; guardas de metas y revisiones corregidas en este corte |
| Offline/PWA | manifest, sw.js, offline-store/Provider/sync-engine; R3_A7_REVISION_INTEGRACION.md | Captura/cola durable; replay ya no bloqueado por precomparación de versión |

## Comprobación del grafo

Inspección read-only con parser/resolución de TypeScript y configuración real de
tsconfig: 29 fuentes App Router, 148 fuentes locales alcanzables en ejecución,
cero imports locales sin resolver, cero referencias runtime a ChatPage,
modules/chat, clinical/workspace o nombres mock/dummy.

Se eliminaron imports exclusivamente de tipos mediante transpileModule antes de
recorrer el grafo. El recorrido conservador anterior incluía clinical/workspace
por una importación type-only desde program-session/panels hacia clinical/page;
no acredita una ruta clínica paralela. Este inventario de dependencias no es QA
de interfaz ni prueba de corrección funcional de cada componente.

## Correcciones derivadas de la auditoría

1. El portal familiar recibía design/measurement pero no los mostraba. Ahora
   FamilyPublishedContent presenta contenido íntegro autorizado y métricas V2
   canónicas; conserva V1 explícita y no transforma booleanos en E/A/NR.
   No carga el workspace ni recursos adicionales, no concede acceso a Storage.
2. Búsqueda se recrea por actor/clínica y campana por actor; dashboard y portal
   verifican actor del snapshot antes de mostrarlo y recargan al cambiar usuario.
3. Búsqueda/campana usan beforeNavigate del shell. Abrir una notificación no navega
   si su cambio de lectura queda desconocido/no confirmado.
4. Solicitudes incorpora beforeNativeNavigate para atrás/adelante del navegador.
5. Offline revalida identidad, clínica, ficha y capacidades antes de enviar;
   elimina comparaciones de versión/referencia que podían bloquear un replay
   después de commit con respuesta perdida. El RPC autorizado busca recibo antes
   de lock/version/recurso para nuevas escrituras; el contrato correlacionado se
   persiste con applySyncResult. Conflictos reales conservan el payload.

## Evidencia y límites

Typecheck y ESLint focal de todos los archivos corregidos: exit 0.
Build Next 16.3.4: compilación completa y 23 páginas/rutas generadas.
El último build del corte se repite después de los cambios finales de navegación.
No se ejecutó Postman, E2E, suites DB ni recorridos funcionales; corresponden a R5.

La matriz conserva 404 INTEGRADO, 16 PENDIENTE QA, una PENDIENTE R5 (limpieza
física ARCHIVOS-013) y 13 DIFERIDO UPGRADE. Ese conteo no prueba por sí solo cierre
R3/R4: documentos familiares y la revisión global restante permanecen explícitos.

## Siguiente trabajo seguro

- Paneles familiares de gestión/invitaciones revisados y corregidos en el corte
  posterior descrito abajo; mantener sus escenarios para QA R5.
- Conciliar evidencias/manuales finales y completar auditoría requisito por requisito.
- Descarga familiar autorizada e implementada en el corte siguiente; verificar en R5.
- R5 solo después del cierre de integración; no heredar QA histórico.

## Corte posterior — guardas de resultados y accesos compartidos

Archivos: `src/modules/results/program-results.tsx`,
`src/views/SharedAccessPage.tsx`, `src/features/students/ShareStudentModal.tsx` y
`src/modules/collaboration/AccessRequestsPanel.tsx`.

- Metas: exclusión síncrona de doble envío; campos/comando bloqueados durante
  resultado desconocido; reintento exacto. Un conflicto conocido libera el
  comando retenido y exige consulta autorizada con loadResultGoals. Se conserva
  nombre/valor/comparador; el usuario confirma otra operación sobre la versión
  revisada. Si la meta desapareció/está archivada, no se recrea.
- Archivo de meta requiere confirmación explícita y conserva historial.
- Correcciones de notas: misma separación de estados. La consulta autorizada
  recupera las observaciones y versión vigentes sin sustituir el borrador de nota
  y motivo. No recrea registros descartados ni escribe sin record.submit vigente.
- La ruta de resultados monta MainLayout; sus guardas componen metas y revisiones
  para shell, logout, clínica, enlaces y atrás/adelante. beforeunload advierte
  sobre formularios pendientes. Snapshot mostrado solo en su actor/clínica.
- Invitaciones: comando y clínica exactos retenidos; bloqueo síncrono de doble
  envío; recuperación dentro de los modales; no cierre/cambio de campos mientras
  el resultado sea desconocido. El cambio de nivel consulta versión vigente antes
  de otra escritura tras conflicto, conservando el nivel elegido.
- Recibo confirmado sigue confirmado si falla refreshIdentity/readLatest; se
  informa fallo de lectura sin ofrecer una segunda escritura por ese motivo.
- Accesos compartidos se monta por userId/clinicId y filtra DTO por contexto;
  consultas secuenciadas impiden que una respuesta antigua reemplace la última.
- Solicitudes internas y escrituras de invitación no se solapan con un resultado
  desconocido del otro panel. Las guardas de solicitudes se conservan.

Verificación: TypeScript y ESLint focal exit 0; build Next 16.3.4 exit 0,
23 páginas/rutas. No migración, fixtures, reset, Postman ni QA funcional en este corte.
Los comandos siguen retenidos en memoria: el aviso beforeunload no equivale a
persistencia durable del formulario tras una recarga forzada.

## Corte posterior — gestión e invitaciones familiares

Archivos: `FamilyManagementPanel.tsx`, `FamilyInvitationsPanel.tsx` y
`SharedAccessPage.tsx`. Sin migraciones ni ampliación de permisos.

- Refrescar acceso familiar no sustituye el borrador ni las selecciones de
  publicación. Confirmación y refresco tienen resultados separados: fallo de
  lectura posterior al recibo nunca vuelve la escritura a resultado desconocido.
- Exclusión síncrona de doble envío y bloqueo cruzado acceso/publicación.
  Comandos desconocidos conservan payload/clínica y ofrecen reintento exacto
  explícito; formularios y descarte quedan bloqueados mientras exista pendiente.
- Conflictos conocidos liberan el comando retenido y exigen consulta autorizada.
  El borrador mantiene su publicación/version de origen. Refrescar un vínculo
  no actualiza silenciosamente esa versión esperada. Solo la revisión explícita
  del conflicto de publicación o un recibo propio cambia el contexto de escritura.
- Destinatarios/versiones seleccionados que desaparecieron permanecen visibles
  como selecciones previas no disponibles. No se sustituyen ni eliminan solos;
  el servidor seguirá rechazando referencias no autorizadas hasta su revisión.
- Bandeja familiar se monta por actor; conserva el paquete original de clínica
  y comando cuando la respuesta es desconocida. La aceptación no concede membresía.
- Sus guardas se componen con invitaciones profesionales y solicitudes internas
  en el shell: logout, clínica, navegación/enlaces y atrás/adelante. beforeunload
  advierte; los borradores de este panel no son durables tras recarga forzada.
- Recibos confirmados sobreviven conceptualmente a un fallo de refreshIdentity
  o lectura de bandeja; la UI informa consulta pendiente y no ofrece repetir la
  escritura como remedio al refresco fallido.

Evidencia: ESLint focal exit 0, build Next 16.3.4 exit 0 (23 páginas/rutas),
diff --check focal exit 0. Sin reset, seeds, datos nuevos, Postman ni QA funcional.

La descarga permanecía deshabilitada en este corte. Posteriormente el usuario
autorizó explícitamente su implementación; ver R4_DESCARGA_FAMILIAR_SEGURA.md.
La nueva descarga exige sesión y permisos vivos por petición, sin firma bearer
reutilizable ni almacenamiento offline. La auditoría global y su conciliación
final siguen abiertas; este paquete no marca el objetivo R3/R4 completo.

## Corte vigente — dashboard, CSV de diseño y recordatorios

Las tres brechas del segundo barrido quedan integradas técnicamente, sin QA funcional.

- Dashboard: contracts.ts y dashboard.server.ts verifican actor y clínica; DashboardPage.tsx consume estudiantes autorizados y actividad diaria por estudiante. Logros permiten estudiante único y semana/mes; sesiones permiten hasta diez estudiantes y semana/mes/año. Los filtros se conservan al ampliar. Periodos calendario UTC anclados a generatedAt, corte actual parcial; se conserva la actividad agregada 7/30/90. SQL mantiene SECURITY INVOKER y capacidades/RLS, incluyendo estudiantes visibles sin actividad.
- Diseño: program-design-csv.ts, ambos diseñadores y ProgramManagementV2.tsx conectan CSV al borrador visible y sus identificadores/versiones exactos. Conserva estructura JSON, tipos, listas y orden; neutraliza fórmulas de hojas de cálculo y muestra errores. No guarda/publica ni afirma ser una importación validada.
- Recordatorios: misma exclusión por clínica que las mutaciones de agenda; bloquea y revalida organización, ficha, cita, recordatorio, participantes, membresías, personas familiares y vínculos antes de materializar. Notificación y recibo de destinatario son atómicos. La selección excluye destinatarios ya entregados para no consumir el límite y postergar otros pendientes. El estado enviado requiere recibos de los destinatarios actualmente elegibles. No se invocó despacho para probarlo.

Migraciones forward 20260926150834 y 20260926151252 aplicadas al stack aislado (94 migraciones sincronizadas); copias de fuente/local idénticas por hash. Tipos regenerados. Catálogo: search_path vacío, EXECUTE sólo postgres/authenticated; dashboard invoker estable y dispatcher definer volátil. Advisor security local: No issues found.

Verificación final: ESLint focal exit 0; Next 16.3.4 build/TypeScript exit 0 y 23 páginas generadas; git diff --check exit 0. Sin reset, seeds, fixtures, Postman ni QA funcional.

El lint SQL global public/private sí informa advertencias en funciones ajenas a estas dos RPC: variables sin uso/sombreado y rutinas IMMUTABLE con expresiones STABLE (helpers de comandos, validadores de fechas e historia/capturas). No confundir advisor de seguridad limpio con lint SQL global limpio. Estas advertencias requieren revisión de fuente y clasificación en la conciliación restante; no se cambió su volatilidad a ciegas.

Inventario vigente: 404 INTEGRADO + 16 QA + 1 R5 + 13 upgrade = 434. PROGRAMAS-039 incluye ahora PDF y CSV. El conteo acredita este paquete, no aceptación global. Siguen pendientes la auditoría consolidada requisito por requisito, clasificación de advertencias SQL y gate R4; R5 y publicación permanecen fuera de esta etapa. Chat sigue diferido.

## Corte vigente — volatilidad revisada y corregida

`R4_VOLATILIDAD_Y_LINT_SQL.md` registra revisión completa de helpers y callers
privados. Migración 20260926152059 aplicada (95 migraciones sincronizadas): diez
funciones STABLE, cuerpos y ACL intactos. Lint deja de reportar IMMUTABLE/STABLE;
once avisos restantes de declaraciones/tipos clasificados como mantenimiento por
fuente. Advisor security local limpio. No QA funcional ni reset/seeds.
La clasificación SQL ya no es pendiente; sigue abierta la auditoría consolidada
y acreditación del gate R4. No marcar completo por esta corrección aislada.

## Corte vigente — nuevas brechas de la auditoría consolidada

Grafo actual revisado con TypeScript/transpilación: 30 fuentes App Router,
151 fuentes runtime locales, cero imports locales sin resolver y cero referencias
runtime a ChatPage/modules/chat/clinical/workspace o archivos mock/dummy.
No es aprobación funcional. Los revisores entregaron hallazgos, pero sus informes
finales se interrumpieron por límite de uso; no inferir una aprobación.

Corregido en fuente:

- FamilyPortalPage monta MainLayout en todos los estados: campana/recordatorios,
  logout/clínica y guardas presentes en /family. Contenido por actor/clínica.
- Revalidación offline discriminada authorized/unavailable. Sólo una ausencia
  autorizada exitosa y correlacionada bloquea permiso; transporte/sesión/contexto
  inciertos permanecen pendientes. Conserva payload, no envía si falta ficha.
- Publicación rechazada invalid-transition/resource-unavailable habilita consulta
  explícita, preserva borrador y origen sin rebase silencioso ni recarga forzada.
- OPERACION_POC ya no afirma que solicitudes V2 siguen pendientes.

Dashboard preparado: forward 20260926221035 fecha sesiones realizadas mediante
evento finished/occurred_at, no updated_at mutable al archivar. DTO finishedAt
nullable y mensaje de cierre no disponible, sin fecha inventada. Serie/historial
usan cierre; conserva invoker/RLS. **Migración no aplicada**: Docker confirmó
"Docker Desktop is manually paused". No se despausó ni inició/resetó stack.
Frontend preparado requiere aplicar esa migración antes de usar dashboard.

Pendientes de integración comprobados, no trasladables a QA:

1. Portal y documento familiar SQL/Storage (20260920235647/20260926145135)
   no comprueban todos los gates de org/ficha/persona activos que sí usa identidad.
   Acceso API directo más amplio inferido de fuente, no probado funcionalmente.
   Endurecer límite DB y callers; shell/route no sustituyen autorización. Descarga
   familiar no aceptada hasta resolverlo.
2. Faltan ejemplos operativos copiables A4/R3 por acción; postman sólo tiene
   globals YAML. Preparar ejemplos documentales, no suites R0–R4; colección R5.
3. Completar revisión requisito por requisito y gate R4; no hay aprobación global.

ESLint focal/tipado exit 0; build Next 16.3.4 exit 0, 23 páginas, para shell/offline/
dashboard preparados. Cambio posterior de revisión de publicación pasó lint/tipos;
repetir build final tras completar DB. Diff --check exit 0. Sin QA/fixtures/reset.

Conteo vigente: 402 INTEGRADO + 2 PENDIENTE R4 (DASHBOARD-011, FAMILIA-007)
+ 16 QA + 1 R5 + 13 upgrade = 434. Seguridad documental y ejemplos operativos son
pendientes adicionales de spec; el conteo no acredita cierre.

## Corte vigente — límite familiar preparado y ejemplos A4

El corte previo fue progreso, no espera: corrigió shell/offline/publicación y
preparó el cierre inmutable del dashboard. Docker se volvió a comprobar y sigue
manualmente pausado; no se modifica ese estado del usuario.

Forward `20260926221536_family_live_resource_authorization.sql` generada con CLI,
preparada pero **no aplicada**. Extiende el boundary familiar existente, no el
motor clínico general: helper privado exacto por organización/ficha/persona/actor,
organización/ficha activas, persona no archivada con rol family, vínculo activo
del destinatario Auth y batches abiertos cuando los recursos están etiquetados.
Identidad familiar, portal, agenda y documentos consumen ese gate; publicación y
adjunto etiquetados también exigen lote abierto. Versiones exactas/manifiesto,
policy object.get_authenticated y wrappers de descarga permanecen intactos.
No concede membresía, capability clínica general ni grants de tablas familiares.

Revisión de fuente completa de cinco funciones del paquete (helper nuevo más
cuatro callers redefinidos); copias fuente/local idénticas por SHA256, diff --check
exit 0. **No catálogo, advisor ni lint SQL posterior**: requieren motor disponible.
No afirmar seguridad integrada hasta aplicar ambos forwards pendientes y verificar.
Último corte aplicado confirmado: 95 migraciones, anterior a estos dos forwards.

`A4_POSTMAN_EXAMPLES.md` documenta bodies/variantes para invitar, aceptar, rechazar,
reenviar, cancelar, cambiar nivel, revocar; solicitudes crear/aprobar/denegar;
familia invitar/aceptar/rechazar/cancelar/revocar/publicar sucesor/lecturas/descarga;
notificaciones leer/no leer y despacho. Se cotejaron con contratos/adaptadores.
Son ejemplos documentales sin secretos, no colección ni suites R0–R4; ejecución R5.
El pendiente de ejemplos A4 queda satisfecho documentalmente, no QA aprobado.

Siguen pendientes aplicación/catálogo de 20260926221035 y 20260926221536, revisión
consolidada restante de A4/A6/A7, ejemplos de entrega de otros paquetes cuando
faltan y gate R4. Mantener DASHBOARD-011 y FAMILIA-007 pendientes; chat diferido.

## Corte vigente — continuidad offline y build final

Se confirmó de nuevo el checkout Desktop/ABA, conservando cambios. SessionPage
retiene comandos exactos hasta commit IndexedDB y evita recuperar payloads
reconocidos antiguos sobre versiones más nuevas o formularios con observaciones
no guardadas. Si IndexedDB falla, el reintento sigue en memoria: no se promete
durabilidad tras cerrar la pestaña. Detalle y ejemplos: R3_A7_REVISION_INTEGRACION
y A7_OPERACION_EJEMPLOS.md.

Build final Next 16.3.4 exit 0, 23 páginas generadas, incluyendo TypeScript; ESLint
focal y tsc del cambio exit 0. No QA funcional ni Postman. Docker consultado
sin mutarlo: sigue "Docker Desktop is manually paused". Los dos forwards siguen
sin aplicar; no se acreditan catálogo, seguridad familiar ni gate R4 por el build.

## Corte vigente — trazabilidad y ejemplos A6

R3_A6_REVISION_INTEGRACION.md conecta requisitos de dashboard/búsqueda/resultados
y exportación con fuentes activas. Trece filas RESULTADOS ya no atribuyen la
integración a ProgramChartPage/features/charts ni a contratos propuestos; anclas
históricas 018/019 conservadas. No cambia el conteo ni estados de aceptación.
A6_OPERACION_EJEMPLOS.md documenta lecturas/metas versionadas y operaciones de
interfaz/exportación, sin inventar RPC de cola, metas o PDF. P3 del checklist pasa
de «integrado» a «en cierre R4», coherente con forward pendiente del dashboard.
No modificación runtime/DB, no QA. Persisten forwards y gate global abiertos.

## Corte vigente — ocho acciones de notificaciones revisadas

R3_A4_NOTIFICACIONES_REVISION.md conecta NOTIFICACIONES-001–008 con consumidor,
contratos, boundary Auth, RPC, RLS/ACL, publicación Realtime y recibos por
destinatario. Se corrigieron fuentes/contratos «propuestos» de esas ocho filas;
conteo y estados no cambian. Guía de usuario explicita entrega dentro de ABA por
lectura/foco/conexión/intervalo visible, no cron/correo/push con app cerrada.
No cambios runtime/SQL ni QA. Docker revalidado manualmente pausado; no catálogo
nuevo ni aplicación de forwards. A4 y gate R4 siguen abiertos.

## Corte vigente — recuperación y horario familiar

FamilyPortalPage ahora ofrece Reintentar consulta y Actualizar portal, invalidando
la lectura visible antes de la petición nueva. No consulta ni presenta publicaciones
con identidad no verificada o contexto no familiar. Los resultados asíncronos
anteriores se descartan al cambiar consulta/contexto. Agenda muestra inicio y fin
con la zona IANA persistida de la cita, identificada explícitamente, no la del navegador.
Lint focal exit 0; build Next 16.3.4 exit 0, TypeScript y 23 páginas. Sin QA funcional.

Relectura completa de 20260921002705 confirma que la agenda SQL familiar aplicada
carece de gates de organización activa y rol family de persona que sí añade el
forward 20260926221536. FAMILIA-008 pasa a PENDIENTE R4, junto a FAMILIA-007 y
DASHBOARD-011. No es una regresión nueva ni pendiente trasladable a QA; corrige
la aceptación documental demasiado amplia. El mismo forward preparado cubre esta
brecha: no se generó otra migración ni se modificó DB. Descarga sigue no aceptada.

Conteo vigente: 401 INTEGRADO + 3 PENDIENTE R4 + 16 QA + 1 R5 + 13 upgrade = 434.
Los cortes anteriores conservan su conteo histórico. Gate global sigue abierto.

## Corte vigente — recibo confirmado y relectura familiar

FamilyManagementPanel ofrece consulta explícita de estado vigente también fuera
de conflicto/carga inicial. Si falla refresh tras ACK de vínculo/publicación,
bloquea comandos nuevos hasta consulta exitosa. No retiene la escritura reconocida
como incierta ni la reenvía; conserva borrador/baseline y origen de publicación.
Consulta normal no rebasea el origen; sólo la revisión explícita de conflicto
actualiza ese contexto, como antes.

FamilyInvitationsPanel también bloquea otra decisión cuando falla la recuperación
tras ACK. Consultar recupera identidad y bandeja antes de habilitar decisiones;
no duplica aceptar/rechazar con claves nuevas sobre una fila desactualizada.
Recibos/reintentos exactos y guardas existentes preservados. No cambios DB, grants,
contratos ni chat. Lint focal exit 0; build Next 16.3.4 exit 0, TypeScript y
23 páginas generadas en el corte final;
QA funcional, aplicación de forwards y gate global permanecen pendientes.

## Corte vigente — recuperación de colaboración y solicitudes

SharedAccessPage bloquea otra intención cuando falla identidad/bandeja después
de ACK. Consultar recupera identidad y versión vigente, conservando nivel elegido
en conflictos; no retiene ni repite una escritura ya confirmada. AccessRequestsPanel
aplica la misma guarda tras ACK y refresh fallido: crear/aprobar/denegar permanece
bloqueado hasta consulta exitosa. Recibos exactos, conflictos y borradores existentes
preservados. No cambios de grants, persistencia ni contratos, no chat.

ESLint focal de ambos consumidores exit 0. Build Next 16.3.4 exit 0, TypeScript
y 23 páginas generadas. Revisión estática, no QA funcional ni datos nuevos.
Conteo permanece 401 INTEGRADO + 3 PENDIENTE R4 + 16 QA + 1 R5 + 13 upgrade.
Forwards de dashboard/autorización familiar y gate consolidado siguen pendientes.

## Corte vigente — consulta exclusiva de recuperación V2

AccessRequestsPanel recupera ahora bandeja mediante una función con busyRef y
estado busy, no callbacks sueltos en cada botón. Una consulta activa excluye
duplicados y activa las guardas existentes de modal/navegación/salida; respeta
blocked y pendientes de escritura. Sólo éxito de onChanged libera reviewRequired;
fallo conserva borrador y bloqueo. No crea ni repite comandos de autorización.
ESLint focal exit 0, build Next 16.3.4 exit 0 con TypeScript y 23 páginas.
Huella de fuente recalculada en R4_GATE_ESTADO_ACTUAL.md después de este cambio.
Sin QA, SQL, fixtures ni chat. Gate y tres acciones R4 siguen pendientes.

## Corte vigente — lectura descartada no acredita recuperación

SharedAccessPage.readLatest ya no devuelve como éxito una respuesta cuya secuencia
fue sustituida y por tanto nunca aplicada a la bandeja. Rechaza esa recuperación;
AccessRequestsPanel conserva reviewRequired y borrador en su catch existente.
Refrescos normales sólo actualizan error/loading si siguen siendo la secuencia
vigente: una respuesta vieja no sobrescribe el estado de la nueva consulta.
No se altera el RPC ni su correlación actor/clínica, comandos o recibos.
ESLint focal exit 0, build Next 16.3.4 exit 0 con TypeScript y 23 páginas.
Huella actualizada en gate. Sin QA, cambios DB ni ampliación de alcance de chat.

## Corte vigente — lint del grafo completo de runtime

La inspección inicial, incluyendo dependencias de tipo, alcanzó 160 archivos y
clinical/workspace. Repetida sobre JS transpilado para excluir imports type: 31
entradas (30 App Router + proxy), 153 fuentes runtime locales, cero imports locales
no resueltos y cero referencias runtime a chat/workspace/mock/dummy. No atribuir
el workspace histórico al release ni corregirlo como requisito de runtime.

Lint runtime amplio detectó errores no cubiertos por lints focales anteriores.
Corregidos DurationRecorder (openId derivado del borrador, sin estado redundante
sincronizado por effect) y attachmentUploadSchema (misma exclusión de barras y
controles U+0000–001F mediante predicado, sin no-control-regex). Lint focal exit 0;
build Next 16.3.4 exit 0 con TypeScript y 23 páginas. Sin QA ni cambios SQL.

Resultado global restante: CUATRO errores y SIETE warnings, no lint aprobado:
- UpgradePlanModal.tsx:21: set-state-in-effect al reiniciar lectura de catálogo.
- LocalAvatarSelector.tsx:19/20: dos set-state-in-effect, selección y opciones.
- CalendarPage.tsx:24: parámetro actorId sin uso.
- Warnings exhaustive-deps en cleanup de refs: InvitationDeliveries,
  CommercialAttachmentsPanel, CalendarPage (dos), PlansPage, SupportPage y TeamPage.

Estos son pendientes de ensamblaje estático reales; no se trasladan silenciosamente
a R5. Matriz conserva su conteo de acciones; errores de lint no son filas clínicas
nuevas. Huella anterior marcada histórica hasta el corte final de saneamiento.
Gate R4, forwards y revisión consolidada continúan abiertos.

## Corte vigente — saneamiento estático del runtime activo

UpgradePlanModal remonta su contenido por apertura/actor/clínica/rol: catálogo y
error parten vacíos sin setState síncrono en effect ni fuga de consulta anterior.
LocalAvatarSelector deriva selección de prop y prepara canvas en frame cancelable;
opciones sólo se muestran cuando estilo/nombre coinciden con el resultado preparado,
sin etiquetar un bitmap anterior como otro estilo. Calendar mantiene key por
actor/clínica y retira solamente la prop actorId sin uso.

Los siete warnings de cleanup se resolvieron capturando el objeto ref dentro de
cada effect, no el valor antiguo de current: se sigue incrementando el contador
vigente al limpiar, sin revalidar respuestas viejas ni restaurar contadores.
Invitaciones, adjuntos comerciales, agenda, planes, soporte y equipo preservados.

Grafo TypeScript runtime repetido: 31 entradas, 153 fuentes locales, cero imports
sin resolver, cero chat/workspace/mock/dummy runtime; ESLint cero errores y cero
warnings. No es lint de archivos históricos fuera del grafo ni de scripts públicos.
Build Next 16.3.4 exit 0 con TypeScript y 23 páginas. Huella recalculada en gate.
No QA, cambios SQL, reset ni fixtures. Forwards y aceptación R3/R4 siguen abiertos.

## Continuidad — aislamiento visual offline y estado del motor

Checkout Desktop confirmado; cambios existentes preservados. Docker ps vuelve a
reportar pausa manual, sin intervención sobre motor/stack ni aplicación de SQL.
OfflineStatus remonta por actor/clínica para no conservar error/busy de otro alcance.
OfflineProvider valida alcance vivo antes de descartar; la cola durable no se
remonta ni se modifica durante el cambio de contexto.

Grafo runtime 31 entradas/153 fuentes, cero imports sin resolver o módulos dormidos
activos; lint cero errores y advertencias. Build Next 16.3.4 exit 0 con TypeScript
y 23 páginas. Huella de 316 archivos actualizada en el gate. Sin QA, seeds, reset
ni cambios SQL. Siguen pendientes los dos forwards y la aceptación R3/R4.

## Continuidad — recuperación de conflictos en campana

Revisión de NotificationsBell/contracts/notifications.server y SQL de recibos:
se detectó consulta explícita concurrente con una escritura que podía liberar
revisión usando una consulta iniciada antes del conflicto. Consultar ahora exige
ausencia de pendientes/busy y toma lock sincrónico; mutate rechaza ese lock. Sólo
consulta vigente exitosa limpia reviewRows. Refrescos automáticos siguen sin
liberar revisión. Recibos/idempotencia y retención de resultados desconocidos
no cambian. No se habilitan chat ni nuevos permisos.

Grafo runtime 31 entradas/153 fuentes, lint cero errores/advertencias. Build
Next 16.3.4 y TypeScript exit 0, 23 páginas; huella actualizada en gate.
Sin QA, SQL, seeds o resets. Migraciones pendientes y R3/R4 siguen abiertos.

## Continuidad — PDF de resultados después de cambios de contexto

Inspección completa del exportador de resultados y route chart: route exige
chart.view/ficha/programa; filtros conservan mediciones originales y V1 separado.
PDF podía completar su import asíncrono y guardar datos de la pantalla anterior.
Se añade isCurrent antes/después del import y antes de guardar, con actor/clínica/
ficha/programa vigentes, montaje, identidad verificada y capacidad chart.view del
snapshot actual. CSV valida el mismo contexto al iniciar. No hay nueva lectura DB
ni promesa de invalidación de copias ya descargadas. Revisar aún exportadores de
diseño independientes; no aceptar todo A6 por este fix.

Grafo runtime 31 entradas/153 fuentes, lint cero errores/advertencias; build
Next 16.3.4 y TypeScript exit 0, 23 páginas. Huella en gate actualizada.
Sin QA ni SQL. R3/R4 y forwards siguen abiertos.

## Continuidad — PDF de diseño con cancelación por contexto

SkillProgramDesigner y BehaviorProgramDesigner son los dos callers inspeccionados
de downloadProgramDesignPdf. El helper ahora exige predicado vigente antes/después
del import y antes de save. Callers correlacionan apertura, verificación de identidad,
actor/clínica y programa/versión; montaje y contador de invalidación impiden completar
la exportación tras cerrar y reabrir el mismo modal. Ref bloquea doble inicio y
errores tardíos no repueblan otro contexto. CSV síncrono valida contexto al iniciar.
La descarga sigue sin guardar/publicar ni cambiar campos del borrador.

Queda resuelta la revisión de exportadores de diseño señalada en el corte anterior.
Grafo runtime 153 fuentes, lint cero errores/advertencias; Next 16.3.4 build y
TypeScript exit 0, 23 páginas. Huella actualizada en gate; sin QA ni SQL.
No implica aceptación completa de A6/R3/R4 ni aplicación de forwards.

## Continuidad — metas reconocidas y refresco recuperable

GoalsPanel descartaba la consulta posterior al ACK y no ofrecía consulta de
recuperación fuera del modal de conflicto. Ahora conserva confirmación, bloquea
nuevas altas/ediciones si la lectura falla y ofrece consulta visible. La lectura
exitosa alimenta una proyección en ProgramResults para bandeja, ambos gráficos
y PDF; las props renovadas de servidor sustituyen esa proyección anterior.
Conflictos conservan campos; meta ausente no se recrea. Ref protege bloqueos
antes de render y el panel remonta por actor/clínica/ficha/programa.

Grafo runtime 153 fuentes, cero imports sin resolver/dormidos y lint cero errores/
advertencias. Build Next 16.3.4 y TypeScript exit 0, 23 páginas; huella en gate.
Sin QA ni SQL. Forwards y aceptación R3/R4 siguen abiertos.

## Corte posterior vigente — Docker operativo y forwards aplicados

El usuario habilitó Docker. Dry-run confirmó los dos forwards previstos; aplicación
exit 0 sólo local, sin seeds/reset. Catálogo 97 migraciones; ocho cuerpos completos
coinciden con fuente, ACL/search_path/callers y policy Storage verificados. Advisors
all sin hallazgos; lint SQL mantiene once warnings anteriores, sin errores ni
avisos en los forwards. Tipos regenerados, build/tipado/lint runtime verdes.
Detalle reproducible: R4_FORWARDS_APLICADOS_CATALOGO.md. Matriz 404 integradas,
cero filas pendientes R4; total 434 sin cambiar alcance. Esto no acepta gate global
ni QA: queda revisión consolidada final y fijar candidato local.
