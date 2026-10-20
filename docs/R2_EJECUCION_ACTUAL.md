# Ejecución actual R2

## Estado vigente de continuidad — 2026-09-29

### R5 — corte de seguridad documental posterior 2026-09-28 (vigente)

QA-011 inició ejecución funcional: sesión y descarga explícita por UI,
`update-notes` retenido como `pending` en IndexedDB sin red, ACK al reconectar
y nota confirmada en PostgreSQL (misma sesión sintética versión 16 tras repeticiones).
Build aislado de producción exit0; recuperación de lectura de ficha desde
`/offline-workspace` tras recarga sin red pasó escritorio+móvil 2/2. También
se recuperó una cola todavía pendiente con claves/payload exactos y ACK tras
reconectar, escritorio+móvil 2/2. La prueba detectó que no se revalidaba
identidad al evento `online`; corrección acotada y regresión repetida. Next dev
no rehidrató esa recarga, pero el fallo no se reprodujo en producción. Faltan
dependencias/conflicto, revocación, documentos offline, fallos de
almacenamiento/transporte e instalación PWA. Estado **parcial**. Evidencia
`docs/handoffs/R5_OFFLINE_QA.md`.
Suite base `r5.local.spec.mjs` repetida en el build QA tras el cambio de
identidad: escritorio+móvil 4/4; se parametrizaron expectativas de puerto de
la prueba, sin alterar la app.
QA-011 añadió conflicto real entre dos contextos: comando offline original
`blocked-conflict` sin recibo ni pérdida de borrador, revisión de versión y
supersesión explícita con claves nuevas/ACK; escritorio+móvil 2/2. La misma
sesión sintética quedó en versión 20 con la nota local elegida, sin
last-write-wins automático. Dos comandos `update-notes` dependientes
conservaron orden, claves y recibos propios tras recarga/reconexión,
escritorio+móvil 2/2, repetido con versiones consecutivas 2/2; sesión
versión 28 con la segunda nota. Revocación,
dependencias de captura, documentos offline y fallos de
almacenamiento/transporte continúan pendientes.

Revalidación posterior al restore/reinicio web: suite UI base real
`r5.local.spec.mjs` escritorio+móvil **4/4**, con persistencia tras recarga,
programa y logout; sin nuevas cuentas ni clínicas. Evidencia en
`docs/handoffs/R5_UI_FICHA_Y_BUILD.md`. Sigue siendo cobertura parcial de
QA-002–005, no aceptación R5.

QA-010/013 agrega cita sintética por UI/Server Action, recarga y aislamiento
entre clínicas; mutación completa de otra cita sintética, serie semanal de tres
lunes con excepción conservada, vínculo con sesión finalizada y DST unitario
3/3 más rechazo/elección explícita por UI. Batería focal escritorio/móvil
7 pass/5 omitidos intencionales. Gestión comercial sintética
añade plan/plazas A, documento interno versionado/archivado sin cobro y
cancelación de plan B conservando membresías; 4 pass/2 omisiones móviles
intencionales. Soporte: ticket, respuesta, estado, recarga y aislamiento A/B
por UI escritorio/móvil 2/2; DB confirma versión 3, dos mensajes, tres eventos.
Agenda familiar con invitación, participación explícita, portal y revocación
escritorio/móvil 2/2; DB dos citas con recordatorio, cero vínculos activos.
Recordatorios profesional y familiar vencidos por UI/campana: dos
destinatarios, dos recibos durables y un `sent` en cada cita, sin duplicados
tras repetición ni aviso para clínica B; el aviso familiar conserva ruta
`/family` pero la revocación posterior ya no muestra la cita en el portal.
Un tercer recordatorio con familiar revocado antes de crear/despachar entregó
solo al admin A: dos participantes, un recibo/notificación, sin aviso familiar.
Desktop/móvil 5 pass/5 omisiones por proyecto. Cobertura horaria adicional
y gate integral R5 siguen pendientes.
Evidencia `docs/handoffs/R5_AGENDA_GESTION.md`.

QA-014 validado en alcance local/sintético: dump privado 1.658.093 bytes,
configuración de servicios cifrada DPAPI y Storage físico 26 archivos con SHA
verificados. El script restauró DB en QA3 sin red ni puertos; origen/restore:
111 tablas, 1.428 filas, Auth8, migraciones100 e invariantes idénticos.
Auth/Storage se reiniciaron desde la configuración respaldada, HTTP200 internos;
dos PNG se descargaron por API QA3 con 68 bytes/SHA correctos. Typecheck/build
exit0, reinicio sólo web y health/login HTTP200; origen intacto. Recuperación
limitada al mismo perfil Windows y bootstrap vacío sin red externa. Evidencia:
`docs/handoffs/R5_OPERACION_RESPALDO.md`.

ARCHIVOS-013: fixture dedicado creó dos PNG de 68 bytes etiquetados al lote,
con antigüedad simulada sólo para QA. Preview exacto
`796f24cb-235e-4dc8-a3d8-bb6370b0047e` contiene 2 candidatos, cero
referencias/exclusiones; backup privado de metadatos y ambos objetos verificó
SHA-256. Ningún byte fue eliminado. Se pidió autorización del preview exacto
antes de ejecutar apply. Evidencia en
`docs/handoffs/R5_ARCHIVOS_013_PREPARACION.md`. Dashboard anual: 12 puntos y
tooltip numérico por estudiante reconciliados con proyección persistida,
incluyendo valor positivo, escritorio/móvil2/2. PDF y CSV de diseño de programa
desde borrador visible, sin guardarlo, pasaron escritorio/móvil2/2; cuatro
páginas PDF renderizadas e inspeccionadas. QA-012 global sigue parcial por
otros reportes.

QA-009 detectó que una URL profesional firmada seguía dando 200 tras archivar
el documento sintético. Forward 20260928182438 aplicado sólo local y nueva
ruta `/attachments/read` vinculada a sesión revalidan cada lectura; URL
firmada directa nueva denegada. Documentos escritorio/móvil2/2, familiar móvil
y escritorio repetido pasaron; una corrida conjunta tuvo login de escritorio
intermitente previo a Storage. Build aislado, tipos, lint focal y advisors
security verdes. Catálogo local **100**. Véase
`docs/handoffs/R5_DOCUMENTOS_STORAGE.md`. Los tokens emitidos antes del forward
expiran por plazo propio, sin borrado físico. ARCHIVOS-013 y QA global siguen
pendientes. Los cortes a continuación conservan su contexto histórico.

### R5 — corte posterior 2026-09-28 (histórico)

Resultados/exportaciones: docs/handoffs/R5_RESULTADOS_EXPORTACIONES.md.
Gráfico servido y cinco dimensiones conciliadas en CSV/PDF contra lectura
autenticada; build de producción desktop/móvil 2/2, servicio local habitual
Webpack desktop1/1 y filtros desktop/móvil2/2, metas UI/versiones/PDF/RLS
desktop/móvil2/2, contadores y filtros/estructura de series dashboard
desktop/móvil2/2;
build/TypeScript exit0. Se corrigió el layout de filtros
móviles y el 404 exclusivo de Next dev Turbopack mediante `--webpack` local.
Catálogo99, stack Supabase9, sin SQL ni datos eliminados. QA-012 y R5 no están
cerrados: valores por punto/tooltip del dashboard, PDF de programa y otros reportes siguen
pendientes, junto al resto de QA-001–016 y ARCHIVOS-013. Conflicto/retry de
metas y denegación de exportación para clínica B, externo y familiar ya pasaron
desktop/móvil2/2 cada caso. Los cortes de
2026-09-27 a continuación son historial.

QA-008/009 parcial añadido: `docs/handoffs/R5_DOCUMENTOS_STORAGE.md`. UI de
documentos desktop/móvil2/2 con rechazo de firma y >20 MiB, v1/v2, descargas
byte a byte, denegación RPC/Storage para clínica B/externo/familiar y archivado
lógico. EdgeRuntime faltaba tras reinicio del stack y fue reactivado
aisladamente; una reserva sintética interrumpida sigue `pending-upload`, sin
eliminación física. Publicación familiar, descarga byte a byte y revocación de
la misma ruta (403) pasaron escritorio/móvil2/2. Se corrigieron la redirección
inicial de rol familiar desde dashboard y una excepción al editar introducción
de publicación; ambas se repitieron en UI. Sigue pendiente la revocación de
una URL firmada profesional ya emitida y ARCHIVOS-013; QA global no cerrado.

### R5 en ejecución — actualización posterior del mismo día

Último corte: docs/handoffs/R5_CONFLICTO_Y_RESPUESTA_PERDIDA.md; UI1/1 de conflicto
y respuesta perdida, API75/75 + regresiones10/10. Sin doble actualización, cancelación
explícita tras rechazo de finalizar sin capturas. Código/build/huella del corte
anterior conservados. Siguiente resultados/exportaciones; QA integral pendiente.

Último corte vigente: docs/handoffs/R5_SESIONES_BORRADOR_Y_CORRECCION.md.
UI sesión1/1; API74/74 + regresiones10/10; borrador A/model+NR, pausa/recarga,
reanudación, revisión conservada y finalización. Caída por notas corregida.
Build/tipos exit0, catálogo99 sin SQL nuevo. Huella318:
2031eafc23964252767c0e43d9ae08390408702d59951ab164dabba130bcaad0.
Continúan conflictos/reintentos y resultados; QA integral no aceptada.
Los cortes inferiores del mismo día son historial, no candidato actual.

Último corte vigente: docs/handoffs/R5_PROGRAMAS_Y_CINCO_DIMENSIONES.md.
Programa publicado y cinco dimensiones enviadas, persistidas y sesión finalizada
por UI desktop2/2; móvil ficha/programa2/2; API73/73 + regresiones10/10.
Corregidos reloj de sesión tras ACK y claves duplicadas del shell; build/tipos
exit0 después de repetir casos. Catálogo99 sin nuevo SQL. Huella318 archivos:
934d313621cc4d9760a31d755049be11d6f10739d4c0b228b426256cbf77ed54.
QA parcial; siguen sesiones/correcciones/conflictos/resultados y resto R5.
Los cortes siguientes del mismo día son historial, no versiones actuales.

Último corte: docs/handoffs/R5_UI_FICHA_Y_BUILD.md. Catálogo99 después del forward
20260927161726 que completa DTO de detalle; API72/72, UI desktop/mobile4/4,
build23 páginas y tipos exit0. Una ficha sintética estable, sin reset/borrado.
Huella318 archivos: 53d4cb25976e08ba95a2b798815e6e67fd408cb9bfb9910f65ae5bc0203173ec.
QA parcial, no aceptación global. Próximo bloque: programas y cinco dimensiones.

R3/R4 consolidados; utilidad ARCHIVOS-013 implementada, validación administrativa
pendiente. QA real detectó tres defectos de permisos (identidad, dashboard,
adjuntos/búsqueda), corregidos por forward 20260927160133 aplicado localmente.
Catálogo actual 98; lectura API 71/71, utilidad 28/28, colección estática 5/5 y
typecheck exit0. Colección Postman 2.1 parcial preparada, aún no ejecutada en
Postman. No hay aceptación funcional global. Evidencia y continuación exacta:
docs/handoffs/R5_LECTURAS_PERMISOS_Y_POSTMAN.md. El catálogo/huella/build de 97
migraciones indicado en el corte inferior es histórico, no el candidato actual.

Este bloque sustituye como prioridad los cortes históricos inferiores. P1/R2
aceptado técnicamente; R3/R4 consolidados técnicamente para R5 según
docs/handoffs/R4_CONSOLIDACION_CIERRE_LOCAL.md. QA y aceptación local pendientes.
Chat y adjuntos excluidos como upgrade. Estado histórico de auditoría abierta
en cortes anteriores sustituido por esta consolidación.

- Matriz tras aplicación/catálogo de forwards: 404 INTEGRADO, cero PENDIENTE R4,
  16 pendientes QA, una R5 y 13 diferidas; total 434. No acredita gate global.
- Solicitudes de acceso V2 y grants legacy sustituidos/aplicados. Descarga familiar
  expresamente autorizada e implementada; boundary SQL vivo de portal/agenda/
  documentos/Storage aplicado y verificado. Aceptación global y QA aún pendientes.
- Último catálogo aplicado confirmado: 97 migraciones hasta 20260926221536.
  Docker habilitado por el usuario; forwards 20260926221035/20260926221536 aplicados
  sólo al stack local, sin reset/seeds. Ocho cuerpos SQL coinciden con fuente;
  ACL/policy/advisors verificados y tipos regenerados. Detalle:
  docs/handoffs/R4_FORWARDS_APLICADOS_CATALOGO.md.
- Fuente corregida: recuperación offline durable/reintentos y protección de borrador;
  consulta/horario de portal; recuperación de vínculo/publicación/invitación familiar
  y colaboración/solicitudes tras ACK seguido de lectura fallida. Recibos reconocidos
  no se repiten; nuevas escrituras requieren recuperar estado vigente.
- Continuidad posterior: correlación de clínica de cada publicación/cita familiar;
  consulta/mutación excluyentes en campana; PDF de resultados/diseño cancelable por
  cambio de contexto; metas con consulta visible tras ACK y proyección compartida
  entre bandeja/gráficos/PDF. Ver cortes finales de handoffs A4/A6 y auditoría R4.
- Ejemplos A4/A6/A7 disponibles sin ejecución. Trazabilidad activa de resultados
  y notificaciones actualizada. Build final Next 16.3.4 exit 0, TypeScript y 23
  páginas; lint focal exit 0. No equivalen a QA ni aceptación total.

Gate y huella de fuente: `docs/handoffs/R4_GATE_ESTADO_ACTUAL.md`.
Evidencia acumulada: `docs/handoffs/R4_AUDITORIA_GLOBAL_2026-09-26.md`.
Plan de cierre local aprobado: lista ejecutable única en el checklist. Consolidar
R3/R4 antes de R5; preparar ARCHIVOS-013 y ejecutar QA-001–016 al final. R6 es
independiente del cierre local y no se inicia automáticamente. La consolidación
técnica acreditó entrada a R5; QA está activo según la actualización superior.
Los conteos, permisos pendientes y autorizaciones antiguas mencionados abajo son
históricos; no asumir que descarga familiar necesita otra autorización del usuario.

Actualización: 2026-09-19. R1 aceptada en `ACEPTACION_R1_GATE_R2.md`; ningún QA aprobado. Meta integral sigue activa y no completada.

## Reanudación 2026-09-18 — estado vigente

### Avance P2 / A4 — familia, 2026-09-20

El vertical familiar ya cuenta con persistencia y límites de autorización propios, pero A4 continúa abierto. Las migraciones forward `20260920235059`, `20260920235647` y `20260921000721` están aplicadas al stack `aba-reintegration-local` (79/79), sin reset ni seeds. Cubren invitación/aceptación/rechazo/cancelación/revocación familiar con identidad derivada de Auth, versiones, replay exacto y recibos; manifiestos inmutables con programas, revisiones y adjuntos seleccionados y validados contra la misma ficha; y contexto de identidad `family` sin crear membresías ni ampliar `has_student_capability`.

La familia lee únicamente proyecciones dedicadas: no recibió SELECT general sobre tablas clínicas. Se añadieron adaptador, contratos, navegación por rol y ruta real `/family`. Las migraciones forward `20260921001348` y `20260921001638` cierran la bandeja previa al contexto y la composición clínica: el destinatario puede aceptar/rechazar desde `/invitations` por identidad Auth exacta; la pestaña Familia y Contacto administra vínculos y publica versiones inmutables con guardas de salida y reintento exacto. `markRead` del chat conserva ahora la misma operación ante resultado desconocido. `20260921002412` incorpora chat familiar: el responsable selecciona audiencia familiar y sólo puede incluir vínculos activos de esa ficha; el familiar lee/envía únicamente como participante vigente. `20260921002705` añade agenda familiar de sólo lectura cuando esa misma persona está explícitamente asignada a la cita. `20260921003020` crea recibos durables por recordatorio/destinatario y materialización idempotente en la campana; no marca `sent` hasta que todos los participantes vigentes tienen recibo. Stack local 84/84, tipos regenerados, typecheck, lint focal, build de 21 rutas y advisors security/performance verdes. No se ejecutó QA funcional. Pendientes A4: descarga de documentos publicados (requiere autorización explícita adicional por información sensible) y adjuntos de chat.

Decisión de alcance posterior, 2026-09-21: todo chat y sus adjuntos quedan fuera del release actual. La implementación y persistencia descritas arriba se conservan dormidas como insumo del upgrade, pero se retiraron los accesos de navegación y `/chat` no es operativo. Chat deja de ser pendiente de R3/R4/R5; el pendiente A4 vigente sigue siendo la descarga familiar sensible. Véase `docs/DECISION_CHAT_UPGRADE_POSTERIOR.md`.

### Cierre técnico P1 — 2026-09-20

P1 queda aceptado técnicamente, sin QA funcional. SESION-020–022 pasan a INTEGRADO: la dimensión del programa es predeterminada y la captura conserva su dimensión explícita; cambiarla crea otra captura sin transformar la anterior. Los agregados V1 se presentan de sólo lectura con `true`/`false`, conteo o duración originales y sin inventar detalle. El archivo de sesión es un comando V2 separado, con motivo, permiso `record.submit`, versión, lock, idempotencia, recibo y relectura; conserva todos los registros/resultados y excluye la sesión de la bandeja operativa.

La migración forward `20260920172710_close_p1_session_capture_contracts.sql` fue aplicada sólo a `aba-reintegration-local`, sin seeds ni reset. Tipos públicos regenerados con Node 22. Typecheck, lint dirigido y `git diff --check` verdes; advisors de seguridad locales sin hallazgos. Metadatos confirmaron `search_path` fijo, RPC pública ejecutable sólo por authenticated, implementación privada no ejecutable por cliente y retiro del guard que confundía dimensión predeterminada con dimensión obligatoria.

ARCHIVOS-013 no se implementa como botón clínico: queda ubicado en `docs/runbooks/ATTACHMENT_PHYSICAL_CLEANUP.md` y reasignado a Root/A8 para P6/R5, con preview, autorización exacta, respaldo, revalidación de referencias y recibo por objeto. No se ejecutó ninguna limpieza.

Matriz global: 213 INTEGRADO y 221 PENDIENTE. P1 cerrado técnicamente; siguientes paquetes P2–P5 continúan pendientes y QA integral permanece P6/R5.

### Paquete SDD P1 — actualización posterior (2026-09-18, migración UTC 20260919001112)

Este bloque sustituye los pendientes históricos inferiores únicamente para los cambios descritos. P1 continúa abierto; no hay QA aprobado.

Actualización A2 2026-09-19: ficha, historial y adjuntos quedan conciliados 66/67 técnicamente. Historial Clínico cubre diagnóstico/evaluación/procedimiento con alta, corrección y versiones. La lista recibe ID clínico (`20260919055014`) y tarjeta ampliada (`20260919163445`): diagnóstico, sesión V2 activa/pausada, asignación familiar activa y profesional visible según políticas. Alta/edición recuperan «Otro diagnóstico» y la búsqueda incluye diagnóstico. La guarda nativa atrás/adelante reutiliza el mismo contrato de salida del shell. Ambas migraciones fueron aplicadas al stack local; tipos regenerados, advisors sin hallazgos y typecheck/lint verdes. Sólo `ARCHIVOS-013` queda pendiente en A2. Matriz global: 210 integradas y 224 pendientes; sin QA funcional.

Actualización 2026-09-19: sesión/captura base ya usa comandos validados, reintento exacto y relectura autorizada después del recibo; no fabrica eventos ni registros. Conflictos conservan el borrador y requieren revisión. Se añadió descarte explícito del registro sólo local y archivo trazable del borrador persistido. SESION-001–019 quedaron conciliadas en este corte histórico; SESION-020–022 fueron cerradas por el bloque vigente de 2026-09-20. Typecheck exit0, sin QA funcional.

A5 queda conciliado 43/43 técnicamente. La migración forward 20260919052718, aplicada al stack local aislado, calcula occupiedSeats desde memberships activas en cada lectura y PlansPage alerta sobreocupación sin inventar plazas. Recordatorios configurados/scheduled no equivalen a entrega; esa dependencia permanece en P2/A4.

Programación queda conciliada 47/49 técnicamente. El historial autorizado permite expandir versiones V2 y consultar V1 original sin transformación ni edición implícita. Exportación PDF y gráfico continúan pendientes en P3/A6. La matriz global registra 144 acciones integradas y 290 pendientes; estos conteos miden trazabilidad técnica, no avance porcentual ni QA.

### P3/A6 en curso — resultados reales 2026-09-20

La ruta `/students/[studentId]/programs/[programId]/chart` dejó de montar la pestaña provisional de sesiones. Ahora valida UUID, clínica activa, pertenencia del programa y capacidad `chart.view`, y reutiliza `read_program_session_v2` para no crear una segunda proyección clínica. Sólo grafica registros V2 sometidos y no descartados; las métricas se derivan con `measurementV2Metrics` desde observaciones persistidas.

La pantalla filtra por periodo, fase, profesional y dimensión; presenta serie y tabla con notas y revisiones, impide mezclar unidades, no interpreta una subida como mejora, valida límites 0–100 para porcentajes/intervalos y conserva filtros al cerrar la vista ampliada. CSV descarga los datos autorizados ya filtrados. La impresión usa el diálogo nativo y permite guardar PDF, pero el PDF generado directamente por la aplicación sigue pendiente junto con metas CRUD, edición de notas desde resultados, dashboard y búsqueda.

Evidencia estática: typecheck exit0, ESLint focal exit0 y build Next 16.3.4 exit0 con 21 rutas. No hubo migración, reset, seeds ni QA funcional; este corte reutiliza contratos/persistencia existentes y permanece dentro de R3.

Continuación A6 2026-09-21: metas longitudinales separadas del criterio de dominio del diseño. La migración forward `20260921004144_results_goals_v2.sql` añadió meta vigente, revisiones inmutables y comando único crear/editar/archivar con versión esperada, identidad exacta, lock, revalidación de `chart.configure` y recibo. RLS limita la lectura a `chart.view`; las tablas no aceptan escritura directa. La UI conserva comandos de resultado desconocido para reintento exacto, bloquea cierre mientras hay operación incierta y reconsulta tras recibo.

La migración fue validada primero dentro de `BEGIN/ROLLBACK` y luego aplicada como 85/85 al proyecto `aba-reintegration-local`, sin reset ni seeds. Tipos públicos regenerados. Typecheck, ESLint focal y build de 21 rutas verdes; advisors locales de seguridad y rendimiento sin hallazgos. Metadata confirmó RLS en ambas tablas, `search_path=''`, implementación privada no ejecutable por clientes, RPC pública sólo para `authenticated`. No se ejecutó QA funcional.

Dashboard A6 2026-09-21: `aba_dashboard_read_v2` consolida en servidor únicamente recursos visibles por capacidades actuales. Entrega estudiantes/programas activos, sesiones activas/pausadas y finalizadas, programas seleccionados, actividad operativa de 90 días y transiciones explícitas `achieved`; no interpreta mediciones como mejoría. `DashboardPage` ofrece expansión, enlaces a sesión/resultados, filtro 7/30/90 y ampliación sin perder periodo. Se retiró el remanente conceptual de modo simulado.

Las migraciones forward `20260921142144_dashboard_read_v2.sql` y `20260921142752_fix_dashboard_invoker_authorization.sql` fueron aplicadas hasta 87/87 sin reset ni seeds. La corrección mantiene `SECURITY INVOKER` y usa el autorizador público canónico, evitando elevar la RPC. Tipos regenerados; typecheck, lint focal y build de 21 rutas verdes; advisors de seguridad/rendimiento sin hallazgos. Metadata: `prosecdef=false`, `search_path=''`, anon sin EXECUTE y authenticated con EXECUTE. QA funcional continúa reservado a R5.

Búsqueda A6 2026-09-21: el icono deshabilitado del shell fue sustituido por `AuthorizedSearch`, montado por defecto desde `MainLayout`. La RPC `aba_authorized_search_v2` busca entre estudiantes, versiones actuales de programas y nombres de documentos disponibles, conservando RLS mediante `SECURITY INVOKER`; limita consulta y resultados, exige membresía activa y no devuelve objetos ni enlaces de Storage. Abrir navega a ficha o resultados, donde se vuelven a verificar permisos.

Migración `20260921143158_authorized_shell_search.sql` aplicada como 88/88 sin reset ni seeds; tipos regenerados. Typecheck, lint focal y build de 21 rutas verdes; advisors locales sin hallazgos. Metadata confirmó `prosecdef=false`, `search_path=''`, anon sin EXECUTE y authenticated con EXECUTE. No hubo QA funcional ni datos de prueba.

Cierre técnico de RESULTADOS 19/19: la edición de notas reutiliza `CaptureCommandV2` con acción `revise`, cambia sólo `measurement.notes`, exige motivo, conserva observaciones y deja revisión/recibo. Conflictos e incertidumbre retienen el comando exacto y bloquean el cierre. La exportación PDF directa usa `jspdf` 4.2.1 fijado en package/lock y genera un documento multipágina con programa, estudiante, advertencia clínica, metas y registros filtrados; CSV permanece disponible. `npm audit --omit=dev` informó 0 vulnerabilidades de producción. Typecheck, lint focal y build de 21 rutas verdes.

Cierre técnico A6 2026-09-21: PROGRAMAS-039 exporta desde ambos diseñadores un PDF multipágina del borrador visible, con tipo, dimensión y todas las secciones clínicas del programa. El documento declara que no es un reporte de resultados; descargarlo no guarda ni publica el formulario. Se reutiliza `jspdf` 4.2.1 ya fijado, sin migración ni cambio de autorización. Typecheck, lint focal de los dos diseñadores/utilidad y build de producción de 21 rutas verdes. Matriz global: 236 INTEGRADO, 197 PENDIENTE y una fila PENDIENTE R5; A6 queda integrado técnicamente y su interacción sigue reservada a R5.

- Documentos: preparación común de archivos validada antes de retener, descarga autorizada real, enlace temporal sin popup asíncrono, reintento exacto de archivo/retirada, revisión y aceptación explícita de conflictos. Se excluyen fotografías de la lista documental y se deduplican versiones en opciones de consentimiento.
- Fotografía: conserva archivo y comandos para reintentar; reserva un adjunto nuevo sin invalidar la foto vinculada; confirma el vínculo por separado. Guardas de salida/beforeunload conectadas a ficha.
- Programación: control compartido de envío de diseñadores, formularios conservados, guardas de cierre, sin snapshots inventados tras recibo; si falla la relectura sólo se reintenta lectura. Conflictos requieren lectura autorizada y aceptación explícita.
- Publicación: contrato exige expectedDraftRevision entero no negativo para publish y null para otras transiciones. El consumidor envía la revisión leída; SQL la compara bajo lock de program_versions antes de publicar, conservando autorización, recibos y orden de locks programa→versión. La revisión aceptada de un conflicto de publicación actualiza la base del editor sin enviar automáticamente.
- Migración forward 20260919001112_reintegration_publish_draft_revision aplicada únicamente a aba-reintegration-local, sin reset ni fixtures nuevos. Metadatos confirman versión instalada y presencia del guard. Clientes antiguos sin el nuevo campo se rechazan: recargar la aplicación antes de iniciar nuevas transiciones; no modificar identidades/payload de operaciones inciertas.
- Evidencia: typecheck exit 0 después del contrato; revisión estática del SQL y consumidor. No se ejecutaron comandos clínicos ni pruebas funcionales/concurrentes: quedan para R5.
- Pendientes P1 de este corte histórico: `SESION-020`–`022`, aceptación final de handoffs y ubicación administrativa de `ARCHIVOS-013`; todos fueron resueltos o reasignados por el bloque vigente de 2026-09-20. Durabilidad tras recarga corresponde a P4/A7; chart/reportes a P3. Este bloque no equivale a QA.

Recuperación: ante incidencias conservar datos y recibos; corregir mediante migración forward. No revertir sólo el backend al contrato anterior, porque reabriría la carrera de publicación. La prueba concurrente y los replays deben quedar en la matriz final R5.

Documentos: StudentDocumentsPanel conserva File y versión anterior junto con reserva/confirmación; reintenta sin reselección y valida tamaño, MIME y firma antes de declarar operación pendiente. Un error local no produce el aviso de resultado desconocido. Schema de consentimiento también se valida antes de retener. Un ref excluye operaciones simultáneas y el panel registra guarda de salida con StudentDetail/shell, más beforeunload. Typecheck exit0. Pendientes: conflicto/revisión documental completa, preview/descarga explícita sin popup asíncrono, guardas de foto/diseñadores y durabilidad A7. Ningún QA funcional ejecutado.

Familia/contactos/hermanos: StudentPeoplePanel registra su guarda en StudentDetail y conserva formularios abiertos durante lectura/actualización de props. Los campos y el cierre quedan bloqueados mientras el comando people está pendiente, con reintento dentro del modal y exclusión de envíos simultáneos. Un ID editado que desaparece del snapshot vigente no se vuelve a insertar automáticamente. Los conflictos de ficha bloquean persistencia familiar hasta la revisión común. Se distingue recibo acknowledged de un fallo posterior de onRefresh: el alta confirmada cierra su formulario para evitar duplicados, mostrando advertencia de lectura pendiente. Typecheck exit0; sin pruebas funcionales. Guardas de foto/documentos/programas, atrás SPA y persistencia A7 siguen pendientes.

Conflictos de StudentDetail: ahora todas las respuestas conflict de ficha/estado/medicación, incluido reintento, abren una revisión del snapshot autorizado tras onRefresh. El borrador sigue en el formulario; ningún comando nuevo se permite hasta revisar. La aceptación sólo actualiza el tratamiento seleccionado a su versión actual y devuelve al borrador, sin escribir; si no existe el tratamiento no se recrea. Fallos de lectura mantienen el bloqueo y ofrecen reconsulta. Cerrar el modal no resuelve el conflicto y conserva aviso para reabrir. Typecheck exit0 tras corregir narrowing de la unión de comandos. Conflictos de adjuntos/personas/diseñadores y QA integral siguen pendientes.

Guardas de ficha ampliadas: los comandos de ficha/medicación se validan con sus schemas antes de retenerlos, por lo que errores locales no crean una operación incierta. Se añadió reintento explícito del comando conservado (también dentro del modal), exclusión de envíos simultáneos, bloqueo de campos pendientes, guarda de salida conectada al shell/retorno a lista/inicio de sesión clínica y advertencia beforeunload. Typecheck exit0. Esto no cubre todavía los estados internos de adjuntos/foto/personas/diseñadores ni navegación atrás SPA; tampoco resuelve por sí mismo los conflictos con revisión visible o la persistencia durable A7. Esos pendientes no se dan por cerrados.

Continuación de ficha: la inspección de rutas detectó que `/students` y `/students/[studentId]` todavía montaban ClinicalPage/ClinicalWorkspace, pese a existir componentes originales con adaptadores V2. Se conectaron ambas entradas a StudentsPage/StudentDetail con Suspense y validación UUID del detalle. StudentsPage se aísla por usuario/clínica/ficha mediante key. `StudentProgramsPanel` carga el snapshot autorizado y monta ProgramManagementV2 dentro de la pestaña original; se retiró el placeholder que sólo enviaba a sesión. El enlace chart conserva la ruta existente, cuya sustitución por A6 sigue pendiente; no se afirma retirada completa del workspace provisional.

Se restauró edición de nacimiento, identificador clínico e iniciales, manteniendo RUT opcional separado; iconos originales de pestañas y botón de sesión condicionado a `record.capture`/ficha activa. Alta valida el comando antes de conservarlo, libera rechazos conocidos, evita doble envío y bloquea cierre de modal/navegación del shell con resultado incierto. Typecheck exit0 después de estos cambios. Pendientes explícitos: guardas completas de borradores/conflictos de ficha y paneles, controles de compartir A4, resultados A6 y verificación visual/funcional final. No se acepta A2 completo todavía.

Este apartado sustituye conteos y pendientes históricos inferiores. Metadata local comprobada: 61 migraciones hasta `20260917164427_reintegration_commercial_attachment_scope.sql`. Docker informa web, Edge y servicios Supabase activos; no fue necesario reiniciarlos. Sin reset, limpieza ni fixtures nuevos.

Adjuntos comerciales integrados mediante `CommercialAttachmentsPanel` montado en `/plans`: validación PDF/JPEG/PNG y 20 MiB, carga privada, verificación Edge, asociación o desvinculación explícita con versión esperada del documento, lectura temporal, descarga, archivo de referencias e historial. Cargar crea un registro nuevo para no invalidar el archivo vinculado antes de confirmar el cambio. Upload y vínculo tienen recibos separados. Los conflictos exigen revisión explícita; los resultados inciertos conservan comandos y File en memoria y bloquean cierre de modal y navegación del shell. La recuperación durable tras recarga sigue siendo parte de A7, no se afirma resuelta.

La migración amplía el autorizador común al documento comercial exacto de la clínica administrada, hereda su lote y protege referencias comerciales activas contra archivo. Corrige también la validación de propósito student-document y permite reverificar una confirmación disponible para recuperar el recibo original. El adaptador compartido ya no intenta descargar objetos pendientes con una sesión ordinaria: Edge verifica los bytes reservados antes de confirmar, incluso si el upload devolvió error de duplicado/transporte. No se amplió SELECT de Storage ni se habilitó upsert.

`/contact` está montada como ruta pública desde la landing: captura consentimiento, valida inquiry, conserva identidad de reintento y muestra éxito únicamente con recibo. Explica que es registro local sin envío automático de correo.

Validación de integración: `scripts/local/typecheck.ps1` exit0 tras montar adjuntos comerciales; revisión de código y `git diff --check` sin errores de whitespace (avisos habituales LF/CRLF). Sólo se consultó metadata del historial de migraciones y estado Docker; no se ejecutó QA funcional. Pendientes inmediatos: fidelidad integral de StudentDetail (A2), entrega durable de recordatorios conectada con A4, y módulos R3 según checklist. R4/R5/R6 pendientes.

## Reanudación 2026-09-17 — estado vigente

Este apartado sustituye los conteos y handles históricos más abajo. Base local: 60 migraciones aplicadas hasta `20260917162350_reintegration_calendar_linkable_sessions.sql`. Tipos public regenerados y typecheck estático exit0 después de montar agenda. Ninguna suite funcional ejecutada.

A5 tiene DDL canónico, RPC comercial/tickets/inquiry y ahora comandos de agenda create/edit/reschedule/cancel/link-session con validación cerrada, ledger, versión, lock, autorización y recibo. La recurrencia materializa fechas civiles IANA. Las modificaciones de serie conservan IDs, excepciones y sesiones vinculadas; las asociaciones se archivan y los eventos conservan el comando y snapshots de la cita. La escritura reutiliza la capacidad existente `record.capture`; la lectura usa `student.view`. Las RPC públicas tienen EXECUTE sólo para authenticated; las implementaciones privadas sólo para postgres.

`/calendar` está montada en el shell original con calendario/listado, filtros, formulario, alcance serie/ocurrencia, selección de sesiones finalizadas y reintento estable. El conflicto conserva el formulario y exige revisar la versión actual. El shell acepta un guard de navegación para evitar abandonar operaciones pendientes desde su menú.

Pantallas A5 añadidas: `/support` (tickets, respuestas, estados), `/plans` (planes/plazas, cancelación y documentos internos) y `/help`. UpgradePlanModal real montado en IdentityShell; la selección navega a `/plans?plan=...` para confirmar plan/plazas antes de enviar. Los formularios bloquean cambios mientras un resultado es incierto y conservan texto ante conflictos. Typecheck verde tras corregir el guard de página nula del modal.

Pendientes A5: entrega durable de recordatorios (conexión A4), adjuntos comerciales desde planes, formulario público de contacto y revisión funcional/visual final R5. Tener recordatorios scheduled no prueba entrega. Permanecen pendientes A2 visual y R3/R4/R5/R6 según checklist.

Docker DB/Auth/Storage y demás servicios base estaban activos al reanudar; web y Edge estaban terminales Exited255. Se recuperó web mediante start.ps1 (exit0, datos conservados). Snapshot Edge verificado; serve-edge.ps1 -Apply iniciado con handle92128. Revalidar Docker/handle antes de afirmar su estado en otra sesión. No se ejecutó reset, limpieza ni un lote nuevo.

## Agentes y capacidad

- A1 plataforma/identidad concluyó y su handoff fue aceptado. No trabajo nuevo asignado.
- A2 `a2_ficha_documentos`, Terra/high, PARCIAL por cuota: root integró lectura V1+V2, comandos de ficha/historial/consentimiento, adjuntos privados y paneles de documentos/foto/personas/medicación. Permanece la fidelidad visual integral de `StudentDetail` antes de aceptar A2.
- A3 `a3_programas_captura`, Sol/high, integración técnica R2 cerrada por root: propuestas revisadas y convertidas en `20260916043000`/`20260916044000`; DDL/RPC/grants aplicados, tipos regenerados, ficha y ruta de sesión montadas y typecheck verde. Aceptación visual/funcional permanece en R5.
- A5 `a5_agenda_comercial_soporte`, Terra/high, PROPUESTO/PARCIAL: entregó adaptadores, ajustes de textos y DDL no aplicado. Root registró doce bloqueantes en `handoffs/ROOT_REVIEW_A5_R2.md`; no se crea migración A5 hasta resolver FKs A2/A3 y RPC concretos.

## Estado local a conservar

Historial52/52 coincidente tras aplicar por CLI las migraciones R2 hasta `20260916044000_reintegration_program_session_v2_commands.sql`. Tipos public regenerados desde el stack aislado con Node22.23.2 y typecheck estático verde; ninguna suite funcional ejecutada. Metadatos verificados: las cuatro RPC públicas A3 son `SECURITY DEFINER` y ejecutables sólo por `authenticated`; las cuatro implementaciones privadas conservan ACL únicamente de `postgres`; la lectura es `SECURITY INVOKER`. Lote único2155e99e-bda4-4c68-95cf-b74cacd84ecd ready. Next y Supabase/Studio/Mailpit operativos solo loopback.

Root mantiene `serve-edge.ps1 -Apply` ACTIVO en sesión50202. La sesión76753 terminó al reemplazar Edge de forma controlada; los diez servicios noEdge conservaron exactamente IDs/StartedAt. Metadata actual: `invite-clinic-member`, `resend-clinic-invitation` y `verify-attachment-upload`, todos `verifyJWT=true`; el nuevo slug cargó y rechazó el cuerpo vacío con400. No detener ni reiniciar por timeout de observación. Snapshot/hashes y fuentes revisadas quedaron sincronizados.

Root conserva contratos/rutas/package/lock/tipos/migraciones. Solo root crea/aplica nuevos archivos SQL después de revisar propuestas de agentes. No reset/seeds automáticos/fixtures nuevos ni suites o consultas funcionales en R2. QA completa/Postman sigue R5/A8; PostmanDesktop12.28 local disponible. Publicación R6 después de aceptación local final.
