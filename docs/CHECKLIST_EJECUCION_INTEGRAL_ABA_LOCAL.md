# Checklist de ejecución integral ABA local

Actualización: 2026-09-30. Este tablero ordena trabajo; una casilla técnica no equivale a QA ni aceptación. La matriz de 434 acciones sigue siendo la fuente de cobertura detallada. Catálogo local actual: 100 migraciones (97 corresponde al corte R4 histórico).

## Lista única de cierre local aprobada

Esta lista sustituye las prioridades históricas inferiores. Las casillas de implementación conservan su evidencia; no son tareas que deban repetirse. Sin fechas, sin nuevo alcance y sin pruebas funcionales antes de R5.

- [x] Unificar el estado documental: 404 requisitos integrados, 97 migraciones aplicadas según catálogo documentado, cero filas pendientes R4; no volver a aplicar los dos forwards ya verificados.
- [x] Consolidar R3/R4: trazabilidad, candidato sin cambios y catálogo local actual confirmados; aceptación técnica en docs/handoffs/R4_CONSOLIDACION_CIERRE_LOCAL.md, no QA.
- [ ] Preparar ARCHIVOS-013 dentro de R5: utilidad administrativa local con preview, lote exacto, retención explícita, respaldo, autorización, revalidación y recibos por objeto; sin eliminación real automática.
  - Utilidad implementada; 28 pruebas de guardas y preview local/rechazo entre clínicas pasan. Los documentos UI archivados no llevaban etiqueta de lote y no se alteraron. Fixture dedicado QA creó dos PNG etiquetados con antigüedad simulada; preview exacto 796f24cb-235e-4dc8-a3d8-bb6370b0047e: 2 candidatos, 0 referencias/excluidos; dump y bytes de ambos respaldados/verificados. Pendientes autorización específica del preview, borrado/recibos, reintento parcial y recuperación aislada; docs/handoffs/R5_ARCHIVOS_013_PREPARACION.md.
- [ ] Ejecutar QA-001–016 en R5 sobre el candidato integrado: Postman 2.1 sin secretos, interfaz real, persistencia, permisos, archivos, captura, agenda, offline, resultados y operación/recuperación.
  - Revalidación UI base tras restore/reinicio web: `r5.local.spec.mjs` escritorio+móvil 4/4, landing→login→ficha/programa→recarga→logout; evidencia `docs/handoffs/R5_UI_FICHA_Y_BUILD.md`. Cobertura QA-002/003/004/005 parcial, no aceptación global.
  - QA-010/013 parcial: cita sintética UI/Server Action aislada de clínica B, edición/reprogramación/cancelación en fixture aparte, serie de 3 lunes con excepción conservada, vínculo a sesión finalizada y DST unitario 3/3 más rechazo/elección por UI. Agenda desktop+móvil 7 pass/5 omitidos intencionales. Gestión comercial sintética: plan A activo 6 plazas, documento interno versionado/archivado sin cobro, plan B cancelado conservando 4 membresías; desktop+móvil 4 pass/2 omitidos intencionales. Soporte por UI: ticket, respuesta, estado y aislamiento A/B desktop+móvil 2/2; DB ticket versión 3, dos mensajes, tres eventos. Agenda familiar: invitación, participante explícito, portal y revocación desktop+móvil 2/2; DB dos citas, cero vínculos activos al final. Recordatorios profesional/familiar y familiar revocado antes del despacho: tres citas `sent`, recibos/notificaciones 2/2, 2/2 y 1/1 sin duplicados ni fuga a B; campana desktop/móvil 5 pass/5 omisiones por proyecto. Falta cobertura horaria adicional y el gate global; evidencia `docs/handoffs/R5_AGENDA_GESTION.md`.
  - QA-011 parcial: ficha descargada, comando durable en IndexedDB, recarga y recuperación exacta de cola pendiente pasaron escritorio+móvil en build de producción; se corrigió revalidación al evento `online`. Conflicto real con segundo navegador bloqueó el comando sin sobrescribir; revisión/supersesión explícita y ACK pasaron escritorio+móvil 2/2. Dos comandos de sesión dependientes conservaron `dependsOn`, obtuvieron recibos distintos y versiones consecutivas, escritorio+móvil 2/2 repetido; sesión sintética versión 28 antes de los nuevos ensayos. Revocación de asignación previa a reconexión pasó escritorio/móvil 2/2: `blocked-permission` sin recibo ni cambio servidor, asignación final inactiva. Logout cancelado/aceptado, aislamiento de otra identidad y recuperación de la misma cola del técnico pasaron escritorio/móvil 2/2. Documento sintético seleccionado, bytes/hash, alcance y apertura tras recarga offline pasaron escritorio/móvil 2/2. Cambio de clínica A→B→A con cola bloqueada por conflicto pasó escritorio/móvil 2/2, con asignación sintética final inactiva. Corte de POST real del comando y replay de las mismas claves con recibo y una sola versión pasaron escritorio/móvil 2/2. Errores de cuota inyectados en documento y cola no dejaron selección ni comando parcial; recuperación exacta pasó escritorio/móvil 2/2. Captura borrador dependiente de transición de sesión obtuvo recibos ordenados y relectura, escritorio/móvil 2/2. Sesión sintética final versión 47. Faltan otras variantes de captura, falla de persistencia de ACK e instalación PWA; evidencia `docs/handoffs/R5_OFFLINE_QA.md`.
  - Corte vigente: gráfico y descargas CSV/PDF de cinco dimensiones reconciliados con seis registros V2 sintéticos; filtros y metas UI/versiones/PDF/RLS desktop/móvil2/2, dashboard contadores/filtros/series y los 12 puntos mensuales con tooltip exacto desktop/móvil2/2 (incluye valor positivo). PDF/CSV de diseño contienen el borrador visible sin persistirlo, desktop/móvil2/2. Clínica B, externo y familiar reciben 404 sin exportación desktop/móvil2/2. Conflicto/retry exacto de meta tras ACK perdido desktop/móvil2/2, sin doble versión. Build/tipos exit0, PDF renderizados e inspeccionados. V1 histórico positivo pasó en escritorio 1/1; falta móvil, inspección del PDF, regresión V2 y gate transversal. Evidencia docs/handoffs/R5_RESULTADOS_EXPORTACIONES.md. QA-012 parcial; no abrir una nueva familia de reportes. Cortes anteriores se conservan en sus handoffs, no como tareas ejecutables.
  - QA-008/009 parcial: documentos sintéticos por UI desktop/móvil2/2; firma falsa y tamaño >20 MiB rechazados, v1/v2 descargadas byte a byte, clínica B/externo/familiar sin lectura RPC ni URL firmada, archivado lógico sin borrado físico. Publicación familiar, descarga byte a byte y revocación de la misma ruta (403) desktop/móvil2/2. QA detectó URL profesional firmada que seguía en 200 tras archivo: forward 20260928182438 y ruta con sesión/revalidación corrigieron nuevas lecturas; documentos desktop/móvil2/2, build y advisors security pasaron. Una intermitencia de login familiar escritorio en corrida conjunta pasó al repetir aislada; no se oculta. EdgeRuntime ausente se reactivó sin reiniciar datos; quedó una reserva `pending-upload` conservada para ARCHIVOS-013. Las URLs anteriores al forward caducan por plazo propio sin borrado físico. Faltan ARCHIVOS-013 y QA global. Evidencia docs/handoffs/R5_DOCUMENTOS_STORAGE.md.
  - QA-014 validado local/sintético: dump privado 1.658.093 bytes, configuración Auth/Storage cifrada DPAPI y Storage físico 26 archivos con hashes verificados; `restore.ps1` pasó en QA3 sin red/puertos. Origen y restore coinciden en 111 tablas, 1.428 filas, Auth8, migraciones100 y los invariantes RLS/constraints/huérfanos. Auth/Storage reiniciados desde el respaldo, HTTP200; dos PNG descargados por API con 68 bytes/SHA correctos. Typecheck/build exit0, web reiniciado y health/login HTTP200; origen intacto. Limitación: recuperación probada con el mismo perfil Windows y bootstrap vacío aislado. Ver docs/handoffs/R5_OPERACION_RESPALDO.md y docs/runbooks/LOCAL_R5_RECOVERY.md.
  - R5 activo: tres defectos de permisos corregidos con forward 20260927160133 (catálogo 98); 71/71 lecturas API reales pasan. Colección Postman parcial de 103 solicitudes preparada y cinco verificaciones estáticas pasan; no ejecutada en Postman ni cobertura integral. Evidencia: docs/handoffs/R5_LECTURAS_PERMISOS_Y_POSTMAN.md.
  - Repetición 2026-09-28 de lecturas/API y colección estática: 78 pruebas pasan, 2 omitidas; Postman Desktop 12.30 Local View aún no importó el JSON 2.1 como colección ejecutable. Sin Push to Cloud, credenciales ni respuestas sincronizadas.
- [ ] Corregir fallos y repetir casos afectados y regresiones relacionadas; repetir toda la batería sólo ante cambios transversales.
- [ ] Entregar versión exacta, informe de QA, matriz validada, manuales y limitaciones; acreditar cero bloqueos funcionales, de seguridad o pérdida de datos y obtener aceptación local.

Chat y sus adjuntos quedan fuera como upgrade. R6 online es una entrega posterior independiente y no condiciona el cierre local ni se inicia automáticamente. Las once advertencias SQL clasificadas no se convierten en un nuevo refactor: sólo bloquean si hay evidencia de defecto funcional o de seguridad. Datos reales no se eliminan sin autorización específica del preview.

### Ejecución V5 — corte en curso

Ver `docs/handoffs/R5_EJECUCION_V5.md`: V1 móvil/PDF 1/1, regresión V2 2/2, ACK fallido 2/2, captura offline cinco dimensiones 10/10, horarios 6/6 y concurrencia de captura 2/2 ejecutados. Postman Local real: 103 solicitudes/187 aserciones aprobadas; escrituras integrales pendientes. Defecto de refresco externo corregido, repetición y candidato final pendientes. Ninguna fila QA completa se cierra sólo con estos focales; borrado no autorizado.

### Índice de cierre QA (estado, no otra lista de tareas)

La evidencia focal no acepta por sí sola la fila completa. Cada fila se cierra contra su definición en `docs/MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md` y el resultado ejecutado, no por el número de pruebas preparadas.

| Caso | Estado al 2026-09-30 | Evidencia útil / condición que falta |
|---|---|---|
| QA-001 | Validado local/sintético 2026-10-05 | Colecciones READS103/187 y HTTP36/66 sin fallos; Auth/REST-RPC/Edge/Storage conciliados con sus paquetes y límites documentados. |
| QA-002 | Validado local/sintético 2026-10-05 | Colecciones READS103/187 y HTTP36/66 sin fallos; Auth/REST-RPC/Edge/Storage conciliados con sus paquetes y límites documentados. |
| QA-003 | Parcial | Server Actions ejercidas por UI en ficha, sesiones, agenda, gestión y otros flujos focales; falta matriz completa por ruta/perfil. |
| QA-004 | Parcial | Casos escritorio/móvil focales; falta revisión integral de fidelidad UX de rutas en alcance. |
| QA-005 | Validado local/sintético 2026-10-05 | Recarga/logout/login, ocho actores98proyecciones/PNG tras arranque y regresiones API/UI/offline/Realtime posteriores conciliados; alcance en R5_CLI_GATE_V5.md. |
| QA-006 | Validado local/sintético 2026-10-05 | Cinco dimensiones, ciclo, variantes, conflictos/replay, integridad histórica y V1 conciliados; evidencia capture-variants-v5 desktop/mobile y paquetes previos. |
| QA-007 | Validado local/sintético 2026-10-05 | Cinco dimensiones, ciclo, variantes, conflictos/replay, integridad histórica y V1 conciliados; evidencia capture-variants-v5 desktop/mobile y paquetes previos. |
| QA-008 | VALIDADO R5 LOCAL/SINTÉTICO | Colaboración externa tres niveles, familia/manifiestos, solicitudes, reenvío/replay, revocaciones y Realtime conciliados; chat diferido. |
| QA-009 | Validado local/sintético 2026-10-05 | Formatos/límites/versiones/referencias/privacidad/offline y ARCHIVOS-013 conciliados; evidencia en cierre QA-009 de R5_CLI_GATE_V5.md. |
| QA-010 | Validado local/sintético 2026-10-05 | Agenda/horarios/participantes/familia/recordatorios/gestión/soporte conciliados; cierre y límites en R5_CLI_GATE_V5.md. |
| QA-011 | Validado local/sintético 2026-10-05 | Descarga/recarga/captura/reconexión/dependencias/reintento/conflicto/cambio alcance/revocación y PWA local conciliados; ACK exacto y límites en R5_CLI_GATE_V5.md. |
| QA-012 | Validado local/sintético 2026-10-05 | V1/V2, cinco dimensiones, filtros, métricas/dashboard/metas/PDF/CSV y regresión posterior al reinicio conciliados; límites UX en R5_CLI_GATE_V5.md. |
| QA-013 | VALIDADO R5 LOCAL/SINTÉTICO | Dos clínicas/perfiles, API10275/75, suspensión/reactivación, asignación futura real y denegaciones por recurso; forward102 regresado. |
| QA-014 | PARCIAL — RENOVAR RESTORE103 | Restore102 histórico preservado; forward103 requiere nueva recuperación aislada, sin restaurar sobre el stack activo. |
| QA-015 | Parcial | Correcciones y repeticiones focales documentadas; se cierra tras repetir todos los defectos que surjan del QA restante. |
| QA-016 | Pendiente | Exige cero confirmaciones ficticias y bloqueantes, matriz validada, informe/versión exacta y aceptación local tras las otras filas. |

Incidencia de entorno resuelta para continuar QA: Docker Desktop falló por acceso denegado a `sailor-ingest.sock`; el usuario lo reactivó sin `factory reset`. Se comprobaron DB/Auth/Edge/web 3000/build QA 3001 y se ejecutó revocación QA-011 escritorio+móvil. Si reaparece, verificar el motor antes de iniciar contenedores; no alterar volúmenes.

Control unitario independiente de Docker: `npm test` **75 passed, 75 skipped opt-in, 0 failed** después de alinear el harness PGlite con Auth/Storage/Realtime y las pruebas de RPC legacy con los grants V2 revocados. No sustituye las 75 pruebas API omitidas ni el QA funcional R5.

## Ejecución SDD aprobada — prioridad vigente

Este bloque ordena los paquetes sin sustituir el alcance de la spec maestra ni convertir casillas técnicas en QA. Las notas históricas inferiores conservan evidencia, no prioridad.

| Paquete | Dependencia | Estado | Cierre requerido |
|---|---|---|---|
| P0 — reglas y backlog | Estado real | Integrado documentalmente | AGENTS propio, checkout/fases/propiedad definidos y pendientes P1 identificados |
| P1 — cierre R2 | Contratos existentes | Integrado técnicamente | Ficha/documentos/foto, diseñadores/sesiones y A5 conectados; guardas/conflictos; rutas reales y revisión estática |
| P2 — colaboración/familia | P1, identidad y adjuntos | Integrado técnicamente | Consolidación R3/R4 aceptada; invitaciones, solicitudes V2, publicaciones, descarga familiar, notificaciones/recordatorios; QA P6/R5 pendiente, chat diferido |
| P3 — reportes | P1, mediciones/sesiones | Integrado técnicamente | Consolidación R3/R4 aceptada; resultados, metas, búsqueda/exportaciones y dashboard con cierre inmutable aplicado; QA P6/R5 pendiente |
| P4 — offline/PWA | P1; coordinar permisos P2 | Integrado técnicamente | Descarga explícita, cola durable, recuperación, sincronización y conflictos; QA reservado a P6/R5 |
| P5 — ensamblaje | P1–P4 | Aceptado técnicamente para R5 | R4_CONSOLIDACION_CIERRE_LOCAL.md: matriz, cadenas de integración, candidato y catálogo actual conciliados; no aceptación funcional |
| P6 — QA R5 | P5 | En ejecución, parcial | Lecturas/permisos corregidos y repetidos; Postman/UI/seguridad/offline/recuperación y aceptación integral pendientes |
| P7 — online R6 | Aceptación local | Diferido | Staging, VPS, HTTPS/correo y pruebas online autorizadas |

Loop: seleccionar paquete listo → especificar contratos/criterios → implementar verticalmente → revisar conexiones/tipado → integrar → registrar evidencia al cierre. No crear suites R0–R4 ni frameworks de tooling como prerrequisito. Máximo tres subagentes, propiedad exclusiva y migraciones sólo root.

### P1 — pendientes agrupados de cierre

- [x] Implementación técnica de descarga/reintentos/revisión documental y guardas de fotografía; pendiente aceptación conjunta.
- [x] Diseñadores conservan formularios, reintentan comandos exactos y releen tras recibo sin inventar snapshots.
- [x] Publicación comprueba revisión esperada del borrador bajo lock; migración local 20260919001112 aplicada y verificada por catálogo. QA concurrente reservado a R5.
- [x] Sesión/captura base: recibo→relectura autorizada, reintento exacto, conflicto visible, guardas, descarte local y archivo persistido; SESION-001–019 conciliadas. QA reservado a R5.
- [x] A5 conciliado 43/43: agenda, gestión, soporte y landing; ocupación vigente corregida con 20260919052718. Entrega durable de recordatorios sigue como dependencia P2.
- [x] Programación conciliada 47/49: diseñadores, lifecycle, publicación concurrente y versiones/V1 visibles. PDF y gráfico real pasan a P3/A6.
- [x] Ficha/historial/adjuntos conciliados 66/67: historial clínico general, «Otro diagnóstico», búsqueda por diagnóstico, tarjeta ampliada y guarda atrás/adelante integrados. Sólo limpieza física administrativa queda diferida.

- [x] Ficha/documentos/foto: revisión conjunta de comandos, conflictos y guardas completada; no confundir persistencia cliente con durabilidad offline A7.
- [x] Programación/captura: cerrar guardas y conflictos de diseñadores, fases de publicación y relectura autorizada tras recibo.
- [x] Revisar alcance A5 contra rutas/contratos y dejar recordatorios como dependencia concreta de P2.
- [x] SESION-020–022: dimensión explícita por captura sin conversión/pérdida, V1 agregado sólo histórico y archivo blando versionado con recibo (`20260920172710`; aplicada localmente).
- [x] ARCHIVOS-013 ubicado en procedimiento administrativo P6/R5 (`docs/runbooks/ATTACHMENT_PHYSICAL_CLEANUP.md`), sin ejecutar limpieza física.
- [x] Conciliar acciones P1 y aceptar handoffs con evidencia estática. QA permanece P6.

## R0–R1 · base reproducible e identidad

- [x] Spec maestra, inventario UX y propiedad por paquete.
- [x] Docker/Supabase/Next/Mailpit sólo loopback, Node22.23.2 y CLI2.117.
- [x] Auth, clínica activa, perfil, roles, invitaciones y correo local.
- [x] Ledger transaccional e identidad profesional.
- [x] Fixture trazable listo y Edge local supervisado.

## R2 · módulos base

### A2 · ficha, historial y adjuntos

- [x] Esquema aditivo de ficha/personas/hermanos/historial/consentimiento (`20260915124349`).
- [x] Helpers comunes de replay/conflicto/rechazo (`20260915125556`, forward-fix `20260915125749`).
- [x] Lecturas autorizadas lista/detalle V1+V2 sin inferir datos (`20260915193337`).
- [x] Comando de ficha create/initialize-v2/update/archive/reactivate con lock, versión, relaciones archivables, auditoría y recibo (`20260915194305`).
- [x] Contrato/UI de inicialización explícita para `version:null`; nombre histórico permanece nulo.
- [x] Modelo de tratamiento separa historyId, versionId, supersedesVersionId y versión propia.
- [x] RPC transaccional de historial clínico, cadena inmutable, transición, evento y cierre de escritura V1 (`20260915195448`, forward-fix de identidad `20260915200137`; tipos regenerados y typecheck estático verde, QA funcional reservado para R5).
- [x] RPC transaccional de consentimiento, cadena lineal, decisión autorizada, eventos y cierre de escritura V1 (`20260915200257`; evidencia no nula permanece bloqueada hasta confirmar adjuntos, QA funcional reservado para R5).
- [x] Tabla/RPC/Edge de adjuntos privados: reserva, carga sin upsert, verificación real de tamaño/firma/SHA-256, confirmación interna, lectura autorizada, archivo y guardas de referencia (`20260915200857`–`20260916024844`; Edge `verify-attachment-upload` con JWT; carga funcional/aislamiento quedan para R5).
- [x] Lista, preview/descarga temporal, reemplazo y archivo lógico de documentos conectados desde `StudentDocumentsPanel` (QA funcional reservado para R5).
- [x] Edición versionada de personas/contactos/hermanos, foto privada y consentimiento con IDs estables y guardas de asociación (typecheck verde; QA funcional reservado para R5).
- [x] Restaurar selector «Otro diagnóstico», búsqueda por diagnóstico y metadatos ampliados de tarjeta (`FICHA-028`–`030`) con proyección autorizada `20260919163445`.
- [x] Rutas `/students` y `/students/[studentId]` conectadas a StudentsPage/StudentDetail originales, retirando el workspace provisional de esas dos entradas; identidad del componente aislada por usuario/clínica/ficha. Typecheck verde, sin QA.
- [x] Identificación editable incluye fecha de nacimiento, ID clínico e iniciales separadas del RUT; programación original V2 montada dentro de la pestaña de ficha. Alta conserva operación pendiente y bloquea doble envío/cierre/navegación del shell.
- [x] Completar guardas de borrador/conflicto de ficha, historial, medicación y documentos; los diseñadores se concilian en A3. Compartir A4 y vistas de resultados A6 siguen en sus paquetes. La ruta chart provisional fue sustituida durante P3 por resultados V2 autorizados.
- [x] Guardas parciales de ficha/medicación: validación antes de retener comando, reintento exacto explícito, exclusión de envío simultáneo, bloqueo de campos pendientes y salida del shell/retorno/inicio de sesión clínica; typecheck verde. No incluye aún estados internos de adjuntos/personas/diseñadores ni resolución completa de conflictos.
- [x] Conflictos de comandos de ficha/medicación: conservan formulario, consultan versión autorizada y exigen revisión explícita antes de habilitar otro envío. La revisión no escribe; tratamientos desaparecidos no se recrean. Typecheck verde; QA y conflictos de paneles independientes pendientes.
- [x] Familia/contactos/hermanos: guarda de salida conectada a ficha/shell, bloqueo de modal/campos durante pendientes, reintento exacto dentro del modal y protección ante recreación de personas retiradas concurrentemente. Fallo de refresco posterior al recibo se distingue de fallo de guardado; typecheck verde, QA R5 pendiente.
- [x] Documentación: carga conserva File/reserva/confirmación y ofrece reintento sin reselección; valida tamaño/MIME/firma antes de retener operación. Consentimiento valida schema antes de retener; exclusión de operaciones simultáneas, revisión explícita de conflictos y guarda de salida conectada al shell. Typecheck verde; recuperación durable queda para A7.
- [x] Historial clínico no farmacológico montado en la ficha: alta/corrección de diagnóstico, evaluación y procedimiento, agrupación por identidad lógica, versiones anteriores visibles y sin borrado de evidencia. Typecheck verde; QA R5 pendiente.
- [x] Proyección autorizada de lista incluye `clinicalId`; migración `20260919055014` aplicada al stack local activo y tipos regenerados por URL local. Sin reset ni fixtures.
- [x] Tarjeta original recuperada desde fuentes persistidas: diagnóstico, sesión V2 activa/pausada, asignación familiar activa y profesional visible según RLS. Guarda nativa atrás/adelante reutiliza el contrato de salida del shell. Typecheck/lint verdes; QA R5 pendiente.

### A3 · programas, sesión y captura

- [x] Esquemas TypeScript V2 y adaptadores parciales.
- [x] DDL canónico con FK `(organization_id,id)` y cierre de DML/RPC heredadas de escritura (`20260916043000`; lectura V1 permanece explícita).
- [x] Validadores SQL cerrados equivalentes a ProgramDesignV2/SessionCommandV2/MeasurementV2, incluidas reglas de submit/revise (`20260916043000`).
- [x] RPC de programa, ciclo de vida, sesión y captura con ledger, lock, reautorización, versión, auditoría y recibo (`20260916044000`; privadas sin EXECUTE API).
- [x] Snapshot inmutable de programas, múltiples registros estables por programa y lectura V1+V2 sin inventar observaciones (`20260916044000`).
- [x] `ProgramManagementV2` montado en la ficha activa y `SessionPage` montado en `/session/[studentId]` con lectura autorizada (typecheck verde; QA visual/funcional reservado para R5).
- [x] Cronómetros, pausas, prompts de respuesta/estímulo, intervalos, duración y latencia conservan timestamps/pendientes explícitos (revisión estática; QA de interacción reservado para R5).

### A5 · agenda, comercial y soporte

- [x] Contratos/adaptadores parciales y textos sin promesas falsas.
- [x] Revisión raíz con12 bloqueantes documentados.
- [x] DDL/FKs/lotes y eventos canónicos (`20260916050000`, aplicado localmente).
- [x] Helpers privados de regla semanal cerrada, fechas civiles IANA y rechazo de horas ambiguas/inexistentes (`20260916102312`, aplicado; ACL sólo postgres). Validación funcional reservada para R5.
- [x] Validación cerrada, RPC transaccional de agenda y recurrencia local IANA, lectura autorizada y selector de sesiones finalizadas (`20260916104236`, `20260916104414`, `20260917162205`, `20260917162350`; aplicados, tipos regenerados y typecheck verde; QA pendiente).
- [x] Ruta `/calendar` y navegación: calendario/listado, filtros, creación/edición/reprogramación, cancelación explícita, alcances de serie/ocurrencia, participantes, recordatorios persistidos y vínculo con sesión; revisión estática, QA pendiente.
- [x] Entrega de recordatorios locales con recibo durable por destinatario y conexión a notificaciones A4 (`20260921003020`; sin QA).
- [x] RPC comercial interno de demostración, sin pagos ni documentos tributarios (`20260916051000`, aplicado; QA funcional pendiente).
- [x] Tickets e inquiry público con rate limit durable (`20260916052000`, aplicado; QA funcional pendiente).
- [x] Ruta `/support`: tickets, conversaciones, respuestas, transiciones autorizadas, conflictos y reintentos estables; typecheck verde, QA R5 pendiente.
- [x] Ruta `/plans`: catálogo, selección/cambio de plan y plazas, cancelación, creación/sustitución/archivo de documentos internos; typecheck verde, QA R5 pendiente.
- [x] Modal comercial real montado en IdentityShell: catálogo conserva diseño de tarjetas y conduce al plan seleccionado con confirmación explícita.
- [x] Ruta `/help` con guía local y enlaces a agenda, planes y soporte.
- [x] Adjuntos comerciales desde Planes: carga privada verificada, vínculo/desvínculo explícito con versión esperada, lectura temporal, descarga, archivo de referencias e historial. Reintentos conservan File y comandos en memoria; shell/modal bloquean abandono pendiente. Typecheck verde; QA R5 pendiente.
- [x] Extensión del límite común de autorización al documento comercial exacto y su lote; guarda de referencias activas y replay de confirmación (`20260917164427`, aplicada; 61 migraciones). Corrección de propósito student-document y del adaptador que intentaba descargar objetos pending-upload con sesión ordinaria. No se amplió SELECT de Storage.
- [x] Formulario público `/contact` conectado a landing, consentimiento de contacto y recibo de inquiry; no promete envío de correo. Typecheck verde; QA R5 pendiente.

## R3 · módulos dependientes

- [x] A4 colaboración, acceso específico, invitaciones, familia y notificaciones aceptado técnicamente en R4_CONSOLIDACION_CIERRE_LOCAL.md. Chat excluido; QA R5 pendiente.
  - Descarga familiar implementada; boundary aplicado/verificado. Consolidación técnica aceptada en R4_CONSOLIDACION_CIERRE_LOCAL.md; QA pendiente.
  - [x] Acceso profesional por ficha, invitaciones enviadas/recibidas y notificaciones persistentes.
  - [~] Chat profesional conservado como implementación dormida; fuera del release y QA actuales, sin navegación operativa.
  - [x] Acceso familiar con ciclo cerrado, bandeja recibida previa al contexto, manifiestos inmutables, contexto `family` sin membresía y portal `/family` por proyección dedicada.
  - [x] Gestión/publicación familiar en la pestaña clínica original, con selección de versiones autorizadas, guardas de salida y reintento exacto.
  - [x] Replay estable del comando `markRead` ante resultado desconocido.
  - [~] Chat familiar conservado para upgrade posterior; no se expone en el portal actual.
  - [x] Agenda familiar de sólo lectura: gate SQL de organización/ficha/persona/vínculo activo aplicado y verificado (20260926221536); participación explícita, recuperación y zona persistida. Sin QA.
  - [x] Descarga familiar: boundary 20260926221536 aplicado y verificado por catálogo/ACL/policy/advisors; ruta y versión exacta conectadas. Consolidación técnica aceptada; QA pendiente, chat diferido.
  - [x] Entrega local durable de recordatorios por destinatario, materializada idempotentemente en notificaciones y sin marcar éxito global antes de todos los recibos vigentes.
- [x] A6 dashboard, gráficos, reportes y exportaciones: consolidación técnica aceptada en R4_CONSOLIDACION_CIERRE_LOCAL.md; QA R5 pendiente.
  - [x] Ruta de gráfico real: registros V2 sometidos, métricas canónicas, filtros de periodo/fase/profesional, tabla/notas/revisiones, dimensiones sin mezclar, eje validado, ampliación estable y CSV.
  - [x] Impresión del reporte disponible mediante diálogo nativo, incluido «guardar como PDF»; no se confunde con un PDF generado directamente por la aplicación.
  - [x] Metas crear/editar/archivar versionadas: dimensión/unidad explícita, `chart.configure`, historial inmutable, conflicto optimista, reintento exacto y recibo correlacionado.
  - [x] Dashboard 13/13 técnico: DASHBOARD-011 usa cierre inmutable por evento finished, forward 20260926221035 aplicado y verificado en catálogo. Sin métricas inventadas; no implica QA.
  - [x] Búsqueda shell 3/3: estudiantes, programas y documentos visibles por RLS; sin rutas de Storage ni ampliación de permisos al abrir.
  - [x] Resultados 19/19: revisión trazable de notas y PDF/CSV generados por la aplicación desde la vista autorizada, además de filtros, metas, gráfico y tabla.
  - [x] Exportación PDF multipágina y CSV estructurado del diseño de programa (PROGRAMAS-039) desde el borrador visible de habilidad o conducta; no guarda/publica cambios y no se confunde con el reporte de resultados.
- [x] A7 IndexedDB, cola offline, conflictos, PWA y logout seguro integrado técnicamente; typecheck/lint/build verdes, QA funcional reservado a R5.

## R4 · ensamblaje

- [x] Rutas definitivas ensambladas; componentes mock/provisionales históricos quedan fuera del grafo activo y `/chat` no es operativa por decisión de alcance.
- [x] Slots reales de búsqueda, notificaciones y offline montados por `MainLayout`; navegación filtrada por identidad/capacidades.
- [x] Realtime, correo local, Storage y offline conectados técnicamente de extremo a extremo; su ejecución funcional permanece reservada a R5.
- [x] Matriz de 434 filas: 404 integradas, cero pendientes R4 por fila, 16 QA, una R5 y 13 upgrade. Ejemplos A4/A6/A7 completos; el conteo no acredita gate global ni QA.
- [x] Manuales local, operador y usuario actualizados (`scripts/local/README.md`, `OPERACION_POC.md`, `docs/GUIA_USUARIO_LOCAL.md`).
- [x] Resolver `COMPARTIR-030/031`: solicitudes internas V2 con elegibilidad vigente, locks de participantes, decisiones versionadas, recibos e historial. Migraciones 20260922174831 y 20260926141441 aplicadas; docs/handoffs/R4_SOLICITUDES_ACCESO_V2.md; sin QA.
- [x] Revisar y corregir volatilidad de helpers/validadores privados (`20260926152059`, aplicada); diez funciones STABLE con ACL intactas. Once avisos restantes de lint clasificados en docs/handoffs/R4_VOLATILIDAD_Y_LINT_SQL.md; advisor security limpio, no lint global limpio.
- [x] Consolidación requisito → fuente → contrato → persistencia → ruta acreditada en R4_CONSOLIDACION_CIERRE_LOCAL.md; gate técnico R4 aceptado para R5, no aceptación funcional.
- [x] Ejemplos operativos A4 documentados sin suites ni ejecución: docs/handoffs/A4_POSTMAN_EXAMPLES.md; contratos/adaptadores actuales cotejados, QA R5 pendiente.
- [x] Ejemplos A6/A7 documentados y trazabilidad activa de RESULTADOS corregida: docs/handoffs/A6_OPERACION_EJEMPLOS.md, A7_OPERACION_EJEMPLOS.md y R3_A6_REVISION_INTEGRACION.md. No acreditan QA ni gate global.
- [x] Forwards 20260926221035/20260926221536 aplicados sólo local. Catálogo 97, ocho cuerpos idénticos, ACL/policy/advisors verificados, tipos regenerados y build/lint runtime verdes; sin QA.

## R5 · QA posterior a integración

- [ ] Colección Postman2.1 y runner local sin secretos.
- [ ] QA navegador/Auth/RPC/RLS/Storage/Realtime/correo/offline/PWA.
- [ ] Reintentos, concurrencia, aislamiento tenant y cero éxitos ficticios.
- [ ] Evidencias versionadas y aceptación local del usuario.

## R6 · publicación diferida

- [ ] VPS, dominio, secretos y despliegue online sólo después de aceptación local.

## Corte vigente 2026-10-04 por CLI

Ver [R5_CLI_GATE_V5.md](handoffs/R5_CLI_GATE_V5.md): HTTP Newman36/66 PASS; Realtime real1/1 PASS; ARCHIVOS-013 cerrado con aprobación específica y recuperación sin alterar estados/permisos; persistencia77proyecciones PASS; defecto origen interno del callback Auth corregido y correo desktop1/1. QA completos continúan parciales salvo QA-014; QA-016 pendiente.

## Planificación del ensayo humano final — 2026-10-05

Documento de planificación solicitado por el usuario: [plan maestro y tres recorridos](qa/R5_ENSAYO_FINAL_PERFILES.md). Estado PLANIFICADO, NO EJECUTADO. Propuesta: cuenta local del usuario como admin y nuevas cuentas supervisor/técnico invitadas por UI; identidades y variante de cambio de rol pendientes de acordar. Se ejecutará al final de R5, tras pendientes técnicos y antes de aceptación QA-016. No sustituye la cobertura completa de la matriz ni modifica estados QA. Shift-right/VPS queda como etapa futura independiente. Crear la planificación no crea cuentas, cambia permisos ni autoriza despliegue o limpieza.

## Corte 2026-10-05 — equipo y forward local

Ver [evidencia y pendientes vigentes](handoffs/R5_CLI_GATE_V5.md): perfil/avatar escritorio+móvil aprobados, asignaciones B y suspensión/reactivación aprobadas en ambos tamaños, solicitudes internas deny/approve escritorio+móvil, API75/75 y negativos RLS9/9. Defecto admin sin asignación personal no podía releer asignaciones corregido con forward20261005041707; **catálogo101**. La concesión a solicitante limitado no se extrapola desde un supervisor con edición preexistente. Restore100 histórico conservado; vigencia del candidato101 requiere respaldo/restore actualizado. QA-014 pasa a vigencia pendiente sobre candidato actual, sin invalidar el ensayo histórico. QA-001–013/015 parciales, QA-016 pendiente; ensayo humano reservado para el final.

## Vigencia renovada 2026-10-05 — catálogo101

Ver [último corte CLI](handoffs/R5_CLI_GATE_V5.md): restore101 aislado completado, Storage26archivos/1768bytes con hashes,90tablas/1685filas verificadas (85principales+5privadas), Auth8 por API y descarga ordinaria A200/B-anónimo denegados; policy nueva y RLS9actores comprobadas. QA-014 queda nuevamente validado local/sintético en este candidato; la nota de vigencia pendiente del corte anterior queda resuelta. Membresías EQUIPO-005/006/007 escritorio/móvil2/2, valores originales restaurados. QA-001–013/015 aún parciales, ensayo humano final planificado y QA-016 pendiente.


## Corte adicional vigente — solicitante limitado 2026-10-05

Ver [último corte CLI](handoffs/R5_CLI_GATE_V5.md): concesión real20s, caducidad, recibos/replay, conflictos y elegibilidad retirada comprobados escritorio/móvil2/2 en fichas sintéticas exclusivas. Restore101 previamente renovado; no permanece pendiente la policy nueva. Dos fichas nuevas posteriores al snapshot no se presentan como contenidas en ese dump. Originales y membresías conservados; asignaciones propias inactivas. QA-001–013/015 parciales, QA-014 validado local/sintético y QA-016 pendiente. Ensayo humano final sólo planificado.


## Bloqueo vigente de entorno y correo — 2026-10-05

Ver [último corte CLI](handoffs/R5_CLI_GATE_V5.md): invitación/reenvío2/2 y respuesta perdida2/2 aprobados; concesión limitada2/2 y API75/75 previos aprobados. La prueba completa aceptación/cambio de correo falló por autoconfirmación Auth incompatible con promesa de doble confirmación. Cuenta sintética desktop recuperada a correo original, cuenta móvil pendiente de aceptación. Config enable_confirmations=true preparada; runtime aún sin aplicar.

Windows bloquea adaptador Docker loopback (CodeIntegrity3077, VerifiedAndReputableDesktop). Supabase detenido oficialmente con backup/volúmenes preservados; web reanudada. No arranque clínico sin aislamiento verificado. QA-014: evidencia restore101 histórica conservada, **vigencia final pendiente** hasta aplicar/revalidar configuración y entorno. QA-001–013/015 parciales, QA-016 pendiente; ensayo humano reservado para el final.

## Recuperación Docker y correo seguro — 2026-10-05 (estado vigente)

El bloqueo operativo anterior queda resuelto sin configurar Windows ni acceder a carpetas ajenas. PowerShell fue autorizado exclusivamente como intérprete de comandos en ABA y Docker; límite registrado en AGENTS.md. Herramientas Linux dentro de `aba-local-tools-v5`, CLI Supabase 2.117.0 y cliente Docker oficial fijado por digest. Los tres volúmenes DB/Storage/Edge originales se conservaron. Arranque sin seeds ni aplicación automática de migraciones; catálogo101 sin alteración SQL.

Servicios Supabase saludables, todos los bindings publicados127.0.0.1. Auth health200. Config aplicada: GOTRUE_MAILER_AUTOCONFIRM=false, SECURE_EMAIL_CHANGE_ENABLED=true. Comparación antes/después PASS: ocho actores,98proyecciones y PNG exacto; evidencia `.aba.local/qa/persistence-v5/email-confirm-config-20261005.json` y salida after correspondiente. No acredita respaldo de toda la DB, recibos privados, Mailpit ni Realtime mediante ese probe.

R5-AUTH-DOBLE-CONFIRMACION-AUTOCONFIRM corregido y regresado. Correo seguro escritorio/móvil2/2 PASS: primer enlace conserva email anterior, segundo completa cambio; login nuevo y retorno reversible al original, mismas identidades/membresías. Evidencia durable saneada `.aba.local/qa/invite-email-v5-desktop-safe-20261005.json` y `...mobile-safe-20261005.json`. Las repeticiones posteriores reutilizan invitaciones ya aceptadas y contraseñas privadas; no se presentan como nuevas aceptaciones. La aceptación móvil y nueva clave sí pasaron antes de esa repetición,12,1s, sobre303cd976-6539-49cc-b38d-c5d29831031e. Desktop conserva58e3e7fa-0455-4769-9622-27fcbab1eb79. Cuenta real del usuario intacta.

Primer intento móvil no aprobado: Mailpit recreado no conservaba el mensaje anterior. Se reenvió por UI exclusivamente la invitación sintética existente y se aceptó el correo nuevo. No nuevas cuentas, reset ni correo a destinatarios reales. El buzón local no tiene continuidad acreditada entre recreaciones; los recibos SMTP históricos no equivalen a conservar mensajes.

Regresión API final75/75 PASS, cero skipped,7,23s, con lectura de sesión, conflicto y cinco dimensiones habilitada. Lint focal exit0 previo al ajuste de etiquetas de evidencia; se repite en el cierre del paquete. No se declara QA-002 completo por este focal. QA-014 sigue pendiente de vigencia del respaldo/recuperación de configuración final; restore101 previo sigue histórico. Faltan variantes de entregas unknown/claimed/resolution y conciliación QA integral, además de respaldo y manual final. Los tres recorridos humanos y QA-016 continúan reservados al final.

## Restore final Docker confirmado — 2026-10-05 (prevalente)

**QA-014 renovado local/sintético sobre candidato101 y configuración Auth final.** Respaldo e114e774-f4ab-4fed-9a6e-fbf8488318ee, dumpSHA4e908bdf7f5b2e9825dd7f3d1b627fb617abe45126561420ed81a499e5362b85; captura2026-10-05T15:15:19Z. Destino nuevo aba-restore-5936980d, DB sin red/puertos; Auth/Storage comparten únicamente ese namespace. Todos los servicios recuperados quedan detenidos, sus volúmenes conservados; stack activo íntegro y sano.

Restauración pg_restore exit0, catálogo101 y policy admin. Storage26archivos/1768bytes, agregadoSHAa3d3e0f278cd521651aa15b959507e9cb4946be41b31d7fec6415482170808e9, inventarios/hash origen→copia→destino exactos. Datos90tablas/1763filas en public/private/storage/migraciones más Auth users/identities conciliados antes de las pruebas Auth recuperadas; fingerprint8d095bcc04243c19cc4972a1e43f6dd0b2fa474e46e275f2bb9398a77e813de4. No se extrapola a todas las tablas de todos los esquemas; dump/restauración completa sí sin error. Cero tablas públicas sin RLS.

Auth recuperado10logins/User/logout ordinarios: ocho actores originales y dos invitaciones recién aceptadas; mismos IDs y passwords privadas sin evidencia pública. Storage A200/PNG68bytes/SHA exacto; B/anónimo denegados400. Policies públicas/Storage idénticas y RLS9actores (tres positivos/seis denegados) mediante roles PostgreSQL ordinarios y UUIDs autenticados, complementando API Auth/Storage; no se arrancó REST recuperado.

Defectos del procedimiento de restore reproducidos y resueltos sólo en destinos aislados: pg_dump no incluía supabase_functions_admin; respaldo de roles gestionados añadido. Espera de arranque usa pg_isready TCP definitivo, evitando tomar el servidor temporal de inicialización como listo. Los intentos e114e774 y6f2b24e9 quedaron parciales/detenidos y conservados, nunca se reimportó sobre ellos.

La imagen base otorgaba privilegios adicionales al crear objetos bajo el usuario de restauración. Se reconciliaron164objetos sólo en el destino; snapshot portable cifrado de342ACL de tablas/secuencias/esquemas/rutinas en public/private/storage/auth/migraciones. Comparación posterior342/342exacta, nueve negativos/positivos RLS y Auth10/Storage repetidos tras corrección. Roles15 incluyen atributos y hashes de credenciales idénticos al respaldo; membresías gestionadas25/25 idénticas, con opciones admin/inherit/set. No se modificaron grants/roles/RLS del stack activo ni se creó migración.

Config Auth/Storage/DB, roles, ACL y membresías cifradas AES-256-GCM con clave privada separada en .aba.local/backup-keys. Dump, Storage y todos los sobres están bajo .aba.local/backups, ignorados; ninguna salida/HTML/colección contiene secretos. Sin DPAPI, registro, políticas ni carpetas Windows externas. La clave y copias siguen en el mismo equipo: protección frente a pérdida del equipo requiere que el usuario conserve ambos en un soporte seguro independiente. No se realizó esa copia externa.

Evidencia privada saneada: .aba.local/qa/restore-final-current.json y restore-final-data-proof.json. Backup renovado registra configuración final y cuentas aceptadas; datos sintéticos añadidos posteriormente no se atribuyen a este snapshot. Límites: recuperación local aislada; no REST/Realtime/SMTP/PWA ni promoción VPS en destino; ACL verificadas sólo en los cinco esquemas enumerados, sin afirmar cobertura de ACL de otros esquemas. Ver docs/runbooks/LOCAL_R5_DOCKER_TOOLS.md para procedimiento actual. QA-001–013/015 siguen parciales; ensayo humano y QA-016 al final.

## Worker de invitaciones y regresiones posteriores a recuperación — 2026-10-05

Candidato BUILD_ID ZLD0G_lNLWR-fufnzOPZw. Resultados/offline: **4/4 PASS44,6s**, escritorio y móvil, cinco dimensiones UI/CSV/PDF y comando durable tras reconectar con fallo de persistencia del ACK. Copia durable de CSV/PDF/PNG en `.aba.local/qa/post-recovery-20261005/results-offline`. Realtime real/reconexión/aislamiento B: **1/1 PASS16,6s** posterior al arranque; estado de lectura original restaurado. Estas regresiones no acreditan por sí solas toda QA-011/012/013.

Invitaciones claimed→unknown→resolución: **1/1 PASS3,3min**, suite `tests/e2e/r5.invite-worker-v5.spec.mjs` y config dedicada. Dos escenarios reales en serie mediante Next/Edge/proxy Docker clonados: Auth aceptó y Mailpit recibió cada correo; respuesta de Auth retenida y exclusivamente el worker clonado interrumpido antes de su timeout. Lease90s transcurrió sin alterar reloj ni SQL. Consulta UI recuperó recibo claimed; nueva petición bloqueada. Expiración natural produjo unknown/claim-expired, versión2→3. Resoluciones UI observed-sent y allow-new-request produjeron versión4; primera sent/operator-mailpit, segunda failed/riesgo de posible duplicado. Ambas resoluciones y replays exactos no enviaron correo adicional. Admin de otra clínica, técnico, ACK falso y versión obsoleta rechazados en cada escenario, sin cambio del recibo.

Evidencia saneada `.aba.local/qa/invite-worker-v5-safe-20261005.json`: invitación85cb9cb8-d860-482d-afa7-14207089421b, usuario sintético nuevo b4a36874-b196-41e8-83d0-7f39ea3950dd, sin aceptar. Un correo inicial y dos explícitos reales; las negativas y recuperaciones no añadieron correo. Cuenta mínima creada por UI para cubrir este pendiente; las dos invitaciones anteriores ya aceptadas no son elegibles para esta variante. Esta nueva cuenta posterior al backup e114e774 no forma parte de aquel snapshot.

Clones aba-r5-invite-ui-v5/fault-v5/worker-v5 quedan detenidos; cachés y registros conservados. Source Auth/DB/Storage/Edge permanecieron activos, sin cambio de configuración, código de producto, RLS ni migración; sólo los comandos propios QA escribieron sus registros autorizados. Proxy sólo interceptó la invitación propia y no guardó credenciales, tokens ni links. Tipado/lint final de candidato pendiente de cierre transversal. QA-001–013/015 continúan parciales hasta conciliación completa. Ensayo humano de tres perfiles y QA-016 continúan al final, sin ejecutar.
## Documentos PDF/JPEG, consentimiento y fotografía — 2026-10-05

Suite `r5.document-media-v5.spec.mjs`, configuración dedicada: **2/2 PASS31,3s**, escritorio/móvil en serie sobre ficha B sintética bbf1e89c-6b06-4f5c-a62a-1d3fa94122de. PDF válido12562bytes (SHA3e6a97b59c9445a166e5e16dbce49972fe031565a8c2513cd3283fb754f6596b), reutilizado del resultado QA; JPEG geométrico24×24 generado en memoria (SHAbb06d53c98671d7f423a66f675c3ec73af0c4f6e24a2e25afd3f0486debc9a88). Carga por UI, preview PDF autorizado, descargas de bytes exactos, sustitución PDFv1→JPEGv2 con mismo ID lógico y supersedesVersionId, recarga y nuevas descargas. Versión anterior archivada: metadatos/hash conservados y lectura denegada; no se afirma descarga de una versión archivada.

Consentimientos nuevos37ed187f-9ccc-4acf-9b63-8f1346f89334 y1bab1ad3-c364-47f2-b816-be033df2dc5b válidos, vinculados al attachmentId lógico propio y persistentes tras recarga. Fotografías9780ffd2-cbed-4666-b820-d29be270c8c3 yacd8ab0c-55b8-4b1b-8d37-de9001c27f24: carga verificada no cambió vínculo; confirmación explícita incrementó versión de ficha. Imagen decodificada24×24 tras recarga y bytes exactos por lectura autorizada. Foto final propia móvil conservada en la ficha sintética; foto desktop previa permanece como archivo. No se tocó foto/cuenta real del usuario ni la ficha A original.

Otra clínica y acceso anónimo denegados; personas/hermanos/historial/consentimientos y versiones de adjuntos preexistentes iguales por IDs. Archivos nuevos disponibles vinculados no se archivan/borran automáticamente. Evidencia durable saneada `.aba.local/qa/document-media-v5-desktop-desktop-e7f0957a-7376-4805-a274-c08f93727d43-safe.json` y equivalente móvil `...mobile-mobile-b36df55d-e1b1-46f1-8dde-e65d2e6cec4c-safe.json`.

Intentos iniciales no PASS: harness esperaba descargar la versión sustituida, aunque el contrato aplicado la archiva; después el selector del input oculto Mantine impidió abrir archivados. Corregidos criterios/selector del arnés, sin cambiar producto ni permisos para aprobar. Registros y archivos de los intentos conservados. Los datos añadidos después de e114e774 no se incluyen en aquel backup.

Realtime repetido para conservar JSON durable: **1/1 PASS13,8s**, wire real/reconexión/aislamiento y lectura original restaurada; `.aba.local/qa/realtime-v5-post-recovery-*-safe.json`. No se declara cierre transversal por esta repetición. Tipado/lint de nuevos arneses sin errores. Queda conciliación explícita de cada definición QA, captura/permisos restantes, validación técnica final, manual/versionado y recorridos humanos/QA-016.
## Cierre QA-009 local/sintético — 2026-10-05

Conciliación contra definición «Archivos/límites/versiones» y alcance formatos/avatares del SPEC: **QA-009 VALIDADO R5 LOCAL/SINTÉTICO**, BUILD_ID ZLD0G_lNLWR-fufnzOPZw, HEAD39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios locales. No equivale a aceptación ni a QA global. La dependencia ARCHIVOS-013 ya está cerrada con aprobación exacta; no se vuelve a borrar ningún objeto.

| Requisito | Ruta/perfil y evidencia | Contrato/persistencia comprobados |
|---|---|---|
| PDF/JPEG/PNG carga/preview/descarga | Ficha→Documentación Legal; adminA/B; documents + document-media-v5 desktop/móvil | reserva/upload/list/read, bytes/SHA y recarga |
| Sustitución/versiones/archivo | Ficha; adminA/B; PNGv1→v2 y PDF→JPEG | IDs/predecesor conservados; versión sustituida archivada y lectura denegada |
| Referencias/consentimiento/foto | FichaB; document-media-v5 | attachmentId lógico, asociación explícita/versión y recarga; foto decodificada |
| Límites/rechazados | Documentos20MiB; perfil5MiB; documents + avatar-limits-v5 | Firma falsa/vacío/>límite rechazados; perfil/inventario exactos |
| Privacidad/permiso/revocación | attachments/read y family/documents; profesional/familiar autorizado; negativos B/externo/familiar/anónimo | RPC y Storage privado; URL exacta deja de leer tras revocación/archivo |
| Selección documental offline | Workspace adminA; offline | selección explícita, IndexedDB, bytes/hash tras recarga sin red |
| Limpieza física | ARCHIVOS013 exacto autorizado | respaldo, dos recibos, fallo parcial/retry/replay y recuperación aislada; ajenos preservados |

Avatar negativos completados en corridas seriales separadas: **desktop1/1 PASS10,4s**, **mobile1/1 PASS6,7s**. >5MiB+1, firma falsa y vacío rechazados con aviso UI; perfil y listado propio de Storage iguales antes/después y recarga. Evidencia `.aba.local/qa/avatar-limits-v5-desktop-safe.json` y móvil equivalente. Los mensajes detallados esperados no se muestran en producción: los intentos iniciales que exigían esa cadena no PASS; ensayo final acredita aviso y rechazo sin mutaciones, no ese texto. Esto no se declara garantía de todos los mensajes de error del producto.

Contador actual de casos QA completos: **2/16 (QA-009 y QA-014)**. Los demás siguen sujetos a su definición exacta; no se desmarcan focales ya aprobados. Sin chat/R6/VPS ni aceptación QA-016; ensayo humano reservado al final.
## Conciliación y cierre QA-010 / QA-012 — 2026-10-05

**QA-010 y QA-012 VALIDADO R5 LOCAL/SINTÉTICO**, candidato BUILD_ID ZLD0G_lNLWR-fufnzOPZw, HEAD39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios locales. Se concilia cada definición propia del SPEC y de la matriz; los «gates globales» históricos no añaden escenarios nuevos a estos casos ni permiten afirmar QA003/004/013/015 completos.

QA010 Agenda/gestión: calendar acredita creación/edición/reprogramación/cancelación, serie/excepción y vínculo de sesión; horarios6/6 incluye DST ambiguo, fin inválido sin persistir y medianoche; participantes desktop/móvil2/2 conserva IDs, retira técnico y recarga, DTOversionado y rechazoB; family-calendar acredita agenda/revocación familiar. reminders acredita profesional/familiar, destinatario revocado y recibos/repetición sin duplicados. commercial/support acreditan planes/plazas/cancelación sin perder membresías, documento versionado/archivado, ticket/respuesta/estado/aislamiento. Evidencia detallada en R5_EJECUCION_V5.md, R5_CLI_GATE_V5.md y suites homónimas. Pendientes horarios/participantes de cortes históricos quedan resueltos.

QA012 Conciliación resultados/dashboard/exportaciones: results acredita cinco dimensiones, observaciones/revisiones, filtros fecha/profesional/fase, CSV exacto y PDF por dimensión; repetición postrecuperación escritorio/móvil forma parte del4/4 resultados/offline. Dashboard acredita contadores/sesiones/logros/filtros/series,12puntos mensuales y tooltips exactos desktop/móvil. goals/goal-conflicts acreditan creación/edición/archivo/historial/PDF/conflicto/replay. V1 positivo desktop y móvil/PDF inspeccionado; diseño PDF/CSV refleja borrador sin persistir; diez PDF/catorce páginas de regresión V2 inspeccionadas sin bloqueos visuales. No se inventa una familia adicional de reportes.

Acciones UX no probadas específicamente desde sus controles aún se concilian en QA003/004: edición de nota DESDE el gráfico, cancelar modal de meta y vista mensual de agenda. No se declaran realizadas por estos cierres. Chat/R6/VPS y aceptación siguen fuera. Contador casos completos **4/16: QA009,010,012,014**; restantes casos parciales o pendientes según definición.
## Conciliación QA-005 / QA-011 y caducidad real — 2026-10-05

**QA-005 Persistencia y QA-011 Offline VALIDADO R5 LOCAL/SINTÉTICO**, candidato ZLD0G_lNLWR-fufnzOPZw. Se concilian sus definiciones propias; operación/restore y aceptación son casos independientes.

QA005: suites UI cubren crear/consultar/editar/retirar, recarga, logout y nuevo login en ficha/programas/captura/documentos/accesos/agenda/gestión. Último arranque con volúmenes conservados y nueva configuración Auth: ocho actores/98proyecciones/PNG exactos; API75/75, resultados/offline4/4 y Realtime real1/1 posteriores acreditan regresión pertinente. No se extrapola el read probe a todas las tablas ni al ledger privado completo. Mailpit recreado perdió mensajes previos: no se afirma continuidad del buzón.

QA011: descarga explícita de ficha/documento, IndexedDB y bytes/hash tras recarga sin red; captura cinco dimensiones escritorio/móvil10/10, borrador/envío/corrección/dependencias y sincronización RPC. Transporte, cuota/cola/documento y ACK después de éxito servidor ejercidos con misma identidad/payload/recibo/versión, sin duplicación ni pérdida. Conflicto conserva borrador; cambio usuario/clínica y revocación bloquean sincronización fuera de alcance. PWA instalada, abierta standalone y recargada con controller real en Chrome Windows. Límites: móvil emulado; instalación Android/iOS no probada; cuota inyectada, no saturación física del disco. No se exige una plataforma móvil nativa fuera del alcance local.

IDENTIDAD006 caducidad: `r5.auth-expiry-v5.spec.mjs` **2/2 PASS10,9s**, escritorio/móvil3001. JWT firmado original de sesión QA propia expiró realmente2026-10-05T16:40:14Z, refresh previamente revocado y nuevamente rechazado; sin editar firma/exp, reloj ni configuración global. Token caducado rechazado por Auth; cookies del mismo token→ruta protegida /team redirigida a /login?redirectTo=/team, luego mismo usuario/rol adminB reautenticado y ruta restaurada. Evidencia `.aba.local/qa/auth-expiry-v5-{desktop,mobile}-safe.json`; journal con secretos sólo privado/ignorado. Ninguna otra sesión ni cuenta real fue modificada.

## 2026-10-05 — captura final y conciliación QA-006/007

Variantes ejecutadas en producción local Docker localhost:3001: escritorio 1/1 PASS (33,5 s, reanudación controlada de la misma sesión sintética tras un selector fallido) y móvil 1/1 PASS (39,2 s, recorrido fresco). Diez ayudas de respuesta, siete de estímulo, borrador/recarga/envío, cancelar y confirmar reinicio conservando IDs, revisión con original intacto, cancelar y confirmar cambio de dimensión con nueva identidad, finalización, cancelar y confirmar archivo, recibo correlacionado y replay exacto. Los hashes de registros y revisiones permanecen iguales tras el archivo y los resultados históricos siguen accesibles.

Evidencia durable: `.aba.local/qa/capture-variants-v5-desktop-safe-20261005.json` y `capture-variants-v5-mobile-safe-20261005.json`; journals originales terminados preservados por separado, incluido el fallo previo del arnés. No se tocaron la sesión offline original ni usuarios reales. Los registros nuevos posteriores al respaldo de las 15:15 UTC no están incluidos en ese respaldo.

Conciliados con captura online/offline de las cinco dimensiones, ciclo de sesión, concurrencia/conflictos, ACK perdido, compatibilidad y exportaciones V1: **QA-006 y QA-007 VALIDADO R5 LOCAL/SINTÉTICO**. No implica aprobación de fidelidad UX ni aceptación humana. Pendientes concretos QA-003/004: nota desde gráfico, transiciones de programa/diseñador, archivo/reactivación de ficha y comparación explícita del frontend base en escritorio/móvil.


## 2026-10-05 — Postman renovado y conciliación QA-001/002

Colecciones 2.1 importadas y ejecutadas mediante Newman contra API Docker local, ocho identidades ordinarias sintéticas: READS **103 solicitudes/187 aserciones**; HTTP **36 solicitudes/66 aserciones**, cero fallos de transporte/scripts/aserciones. Evidencia segura: `.aba.local/qa/postman-reads-newman-2026-10-06T00-28-56-177Z.json` y `.aba.local/qa/postman-http-newman-2026-10-06T00-29-54-410Z.json`. Variables sensibles vacías o placeholders en exportaciones, ningún JWT literal; inyección privada sólo en memoria y sin exportar respuestas.

Defecto del arnés reproducido: Newman colisionaba con variables léxicas `data` de scripts exportados; Auth200 pero scripts SyntaxError y lecturas posteriores401. Corregido mediante bloque explícito por script en ambas colecciones; las dos ejecuciones fallidas se conservan. Repetición completa de READS y HTTP pasa. No se alteró producto ni autoridad por este arreglo. La colección nativa YAML previa conserva su ejecución histórica; esta renovación corresponde exactamente a los JSON 2.1 corregidos y sus hashes en cada reporte.

QA-001 conciliado con definición Consolidar colección Postman sin secretos. QA-002 conciliado con Auth/REST-RPC/Edge/Storage: correo seguro, expiración real de JWT y recuperación2/2, invitaciones/worker, API75 y objetos privados/denegaciones ejecutados, además de estas colecciones. **VALIDADO R5 LOCAL/SINTÉTICO** en ambos casos. No sustituye QA-013 de permisos exhaustivos ni QA-016 de aceptación humana.


## 2026-10-05 — asignación futura y defecto externo reproducido

Asignación futura: **1/1 PASS, 53,2 s**. Una fila sintética nueva en ficha QA-R5-LIFECYCLE-V5 con effective_at45 segundos posteriores a la hora real de DB. Técnico A: capacidades vacías/detalle null/UI denegada antes, student.view/detalle y UI reales después; cierre únicamente de esa fila por RPC ordinario admin, denegación recuperada, effective_at conservado, historial inactive/ended_at y originales idénticos. No reloj alterado ni permisos globales cambiados. Evidencia `.aba.local/qa/future-assignment-v5-safe-20261005.json`. Datos posteriores al respaldo15:15UTC quedan fuera de aquel snapshot.

**Defecto abierto R5-EXT-PROGRAM-RESULTS-001.** Esperado: externo program-results ve programas/gráfico/resultados con identificación mínima, sin ficha clínica. Obtenido: capacidades exactas program.view/record.view/chart.view/result.download, ficha null y REST programa positivo; gráfico real ausente. La respuesta HTTP200 del stream Next no prueba éxito visual. Alta/reenvío versionado externo y replay exacto de aceptación no duplicaron versión. Evidencia `.aba.local/qa/external-minimal-repro-v5-defect-safe.json`; invitación propia00342b8c-c292-43ee-9c92-5c89178d1ce6 conservada para diagnóstico/reanudación, no se cerró un grant ajeno. Reenvío aquí es comando/aviso interno, no acredita SMTP.

Causa confirmada por fuente: el loader de gráfico, los lectores program-session/metas y RPC read_program_session_v2 exigen student.view, que el nivel mínimo deliberadamente no concede. Corregir lectura/navegación mínima manteniendo permisos por recurso; no ampliar ficha clínica para el externo. QA-008/013 permanecen pendientes; no aceptación ni despliegue.


## 2026-10-05 — forward102 aplicado, restore101 histórico

Nueva migración20261006003823_qa_external_program_results_minimal_read aplicada exclusivamente por CLI local tras dry-run102-only. Configuración de arranque original migrations=false/seed=false intacta; CLI dedicado dentro .aba.local/migration-102. Proyección mínima aba_program_student_scope_v2 retorna únicamente id/clinicId/initials/status/capabilities con Auth y motor canónico; no otorga student.view ni amplía clients. RPC snapshot conserva SECURITY INVOKER, archivo e historia V1/V2, omite sesiones cuando falta student.view. Tres políticas de lectura de sesiones V1/V2/events exigen record.view Y student.view; registros/revisiones permanecen bajo record.view.

Reproducción antes: externo mínimo leía cuatro filas con notas no vacías por REST, además de no ver gráfico. Seis archivos de aplicación corregidos para proyección mínima, entrada programas/resultados y guard de sesión. Tipado y lint fuente pasan; buildV6 y repetición funcional/regresión pendientes. No declarar defecto resuelto aún. Nueva API mínima es corrección necesaria de contrato por recurso, sin funcionalidades nuevas.

**QA-014 reabierto:** restore101 fue válido para su candidato, pero no prueba recuperación de función/ACL/políticas102. Renovar respaldo y restore aislado102, preservando destinos anteriores. **QA completos actuales9/16**, regresiones y aceptación pendientes.


## 2026-10-05 — corrección externo mínimo validada focal V6

Candidato Docker aba-local-qa-v6, webpack BUILD_ID **kMkEi2_BQ8g1F6y1kcnG8**, catálogo102/102. R5-EXT-PROGRAM-RESULTS-001: repetición escritorio1/1 (7,5s) y móvil1/1 (7,6s) PASS: entrada desde invitaciones recibidas, identificación por iniciales, programas y gráfico reales, CSV/PDF descargados, ausencia de ficha/captura/edición clínica. API scope tiene sólo claves id/clinicId/initials/status/capabilities; clínica B devuelve null. Snapshot contiene registros y sessions=[]; REST directo clients/sesionesV1/stateV2/events no devuelve filas protegidas. Grant exacto único, aceptación replay sin duplicar/versionar. Tabla de concesiones es interna y deniega lectura ordinaria42501; su conteo se concilió por inspección Docker sólo de ID sintético propio.

Tras ambos recorridos, admin A revocó exclusivamente00342b8c-c292-43ee-9c92-5c89178d1ce6 por comando ordinario y recibo v4: capacidades vacías, scope null, snapshot42501; anónimo nuevoRPC42501. Historia preservada; ningún grant ajeno cerrado. Evidencia external-minimal-v6-desktop-safe.json/mobile-safe.json/close-safe.json en .aba.local/qa.

Fallos del arnés posteriores al arreglo se conservaron: carrera de pestaña durante carga resuelta usando la ruta real /invitations; expectativa de lectura de tabla interna y filtro organization_id inexistente en clinical_sessionsV1 corregidos según catálogo/ACL. No ocultar esos fallos como ejecución continua sin correcciones. Defecto de producto validado focal; regresión amplia en curso. APIactual:73PASS/2SKIP de75 (faltaron dos opt-ins históricos, se repetirá con ellos). Tipado102 y lint fuente pasan. Los tipos se generaron vía servicio pg_meta local existente, pues el wrapper Docker bloqueó el contenedor auxiliar del CLI; no se amplió el wrapper ni el host.

QA-008/013 continúan abiertos hasta completar los controles correspondientes y regresión. QA-014 requiere restore102 al terminar las mutaciones QA; QA-016 y tres recorridos humanos siguen reservados para el final.


## 2026-10-05 — programas de adquisición, controles de gráfico y reenvío UI

Candidato Docker V6 BUILD_ID kMkEi2_BQ8g1F6y1kcnG8 y migraciones102/102. Regresión API renovada75/75, sin skips (api102-regression-safe.json); acceso externo completo escritorio/móvil2/2 conservando permisos y revocación.

Adquisición: escritorio1/1 (24,4s) y móvil1/1 (31,9s), doce comandos y recibos correlacionados por recorrido. Dos programas sintéticos propios por proyecto: borrador/reapertura con pasos, sets, ítems y ayudas; publicación original, sucesor y original inmutable; cancelar pausa no escribe; pausa/reactivación/logro y descontinuación versionados. Programas, sesiones y registros ajenos permanecen idénticos. Primera ejecución escritorio previa sólo confirmó DTO porque el observador no capturaba query tab=programs; se conserva como prueba parcial y no acredita recibos. Repetición fresca completa sí acredita los doce.

Gráfico: escritorio completado por reanudación controlada y móvil fresco1/1 (23s). Nota desde gráfico: cancelar no cambia registro; revisión conserva medición/IDs y original íntegro en revisión, incrementa versión y correlaciona recibo; recarga conserva nota/motivo. Cancelar meta, rechazar salida y aceptar descarte no escriben metas. Volver a ficha selecciona Programación. El evento del enlace de salida bajo modal se disparó mediante DOM click, no puntero; limitación explícita. Sesión sintética propia finalizada antes de revisión y archivada después por RPC ordinario (no se acredita archivo UI en esta prueba). Intento escritorio falló por suponer que /session reabre una sesión terminal; ruta abre borrador nuevo sin persistir. Se preservó el journal y se archivó únicamente la sesión identificada, sin duplicar captura. Archivo UI ya tiene evidencia independiente de QA006/007.

Colaboración: reenvío UI escritorio completado por reanudación de la única invitación pendiente propia (7,6s); móvil fresco1/1 (9s). Selección UI Programas y resultados, invitación pendiente sin permisos, Reenviar v2 y replay exacto con mismo recibo, Cancelar v3 sin grant. Tres recibos por recorrido y resto de invitaciones intacto. Fallo inicial escritorio fue espera ausente del modal de detalle; no hubo reenvío ni mutación adicional antes de reanudar. No se presenta esta prueba como entrega SMTP.

Evidencia durable en .aba.local/qa/{program-acquisition-v5,chart-controls-v5,external-resend-v5}-{desktop,mobile}-safe.json y journals por ID. QA003/004/008/013 siguen abiertos hasta conciliar su definición completa; archivo/reactivación de ficha y agenda mensual están en ejecución. Restore102, regresión final y aceptación humana siguen pendientes.


## 2026-10-05 — conciliación y cierre QA-008 / QA-013

**VALIDADO R5 LOCAL/SINTÉTICO** en candidato V6/catalog102. QA-008: externo sin membresía general, aceptación/rechazo/revocación y full-read→clinical-edit por UI escritorio/móvil; programas-resultados mínimos con cuatro capacidades exactas, gráfico/exportaciones y detalle/notas clínicas denegadas; pendiente sin permisos, reenvío UI/replay/cancelación y aceptación replay con concesión única. Familia sólo manifiesto de versiones/recursos seleccionados, descarga, agenda y pérdida de acceso a la misma URL tras revocación. Solicitudes internas incluyen decisión, ganancia temporal, expiración real, replay/conflicto y pérdida de elegibilidad. Realtime real incluye eventos/reconexión/estado recuperado y clínica B aislada. Evidencia familiar, limited-requester y Realtime vinculada en R5_EJECUCION_V5.md y paquetes focales previos; external-minimal-v6/external-resend-v5 safe y sus journals cierran pendientes recientes. Chat permanece diferido por decisión expresa.

QA-013: dos clínicas y perfiles admin/supervisor/técnico/externo/familiar/anónimo, rutas reales y denegaciones Auth/REST-RPC/Edge/Storage/Realtime/correo local. API10275/75 sin skips; suspender/reactivar membresía retira/restaura permisos en sesión abierta; asignaciones y supervisor preservados. Asignación futura validada contra hora real DB antes/después, cerrada sólo la propia e historia conservada. URLs manipuladas/cross-clinic, recursos privados/familia/agenda y RPC mínimo clínica B/anónimo/revocación denegados. Nuevas políticas de sesiones102 excluyen notas y metadata clínicas del externo mínimo; registros autorizados siguen disponibles.

**R5-EXT-PROGRAM-RESULTS-001 cerrado**: reproducción original conservada, forward102, UI mínimo desktop/móvil2/2, REST notas vacías, revocación, full-read/clinical-edit2/2 y API75/75. No se afirma entrega SMTP del reenvío externo: acredita comando/aviso/versionado; correo Auth tiene prueba independiente. Restore102 sigue pendiente y no se hereda restore101. Este cierre no aprueba las404acciones ni QA003/004/014/015/016.


## 2026-10-05 — ficha/agenda validadas focales y defecto PROGRAMAS012

Ficha/agenda: escritorio completado por reanudación de auditoría (7,6s), móvil fresco1/1 (11,9s). Agenda mensual positiva, filtro por estudiante, mostrar canceladas, listado sin filtro de mes, limpiar y actualizar; citas/participantes/recordatorios/vínculos idénticos por RPC ordinario. Cancela archivo sin escritura; archivo propio→lista Antiguos y captura deshabilitada; reactivación→lista Vigentes/captura y recarga. Dos recibos correlacionados, versión+2; solamente updatedAt cambia como auditoría esperada, todo otro dato clínico y snapshot programas/sesiones/registros permanece igual. Intentos escritorio conservados: selector de clearButton aria-hidden y aserción errónea timestamp estático corregidos; reanudación posterior sólo leyó transiciones ya confirmadas, sin repetir escrituras. No se acredita cancelar reactivación aún.

**R5-PROGRAM-STEP-REORDER-001 abierto:** matriz PROGRAMAS012 exige reordenar pasos manteniendo ID; fuente y UI candidatoV6 carecen de control mover. Reproducción1/1 de sólo lectura en diseño propio existente con dos pasos, controles0 y snapshot idéntico (program-reorder-v6-defect-safe.json). No se transforma requisito en N/A ni cambia denominador. Corrección fuente añade mover arriba/abajo, preserva IDs/descripciones y renumera order; respeta bloqueo/submitting y límites. Tipado/lint pasan; buildV7 y repetición UI/DTO escritorio+móvil pendientes. Sin cambios de API/migración/permisos.

QA003/004 siguen abiertos: falta conciliar controles de retiro/filtros/historial/contactos y comparación explícita contra frontendbase dc1b0c4 por acciones inventariadas, escritorio/móvil.17rutas/822anclas léxicas no equivalen a404acciones validadas. QA014 restore102 y QA015 regresión final siguen pendientes; aceptación/recorridos humanos al final.


## 2026-10-05 — PROGRAMAS012 corregido y validado V7, ledger404 iniciado

**R5-PROGRAM-STEP-REORDER-001 cerrado focal:** candidato DockerV7 webpack BUILD_ID FCT6l_uO6YDGRmI3UZFs2, catálogo102. UI escritorio1/1 (11,9s) y móvil1/1 (11,4s): mover arriba/abajo y límites, IDs/descripciones conservados con order renumerado, retirar paso medio y conservar supervivientes, retirar ítem/conjunto, descartar-dismissing conserva local sinwrite y aceptar descarta sinwrite; guardar y recargar DTO exacto y dos recibos correlacionados por recorrido. Seis filtros de estado concilian subset autorizado; expandir/contraer historial de versiones conserva originalDesign y snapshot. Otros programas, sesiones y registros idénticos. ReproducciónV6 separada preservada; contenedorV6 detenido retenido. Tipado/lint/buildV7PASS; no migración/contrato/permiso nuevo.

Ledger404 iniciado en docs/qa/R5_LEDGER_ACCIONES_404.json/md: denominador verificado404IDs únicos INTEGRADO, doce acciones recientes vinculadas por ID/control/prueba/evidencia;392 pendientes de conciliación documental, no declaradas ejecución ausente ni aprobadas por heurística. Comparación UXbase dc1b0c4 aún pendiente; ARCHIVOS013 validado permanece complementario. QA003/004 continúan abiertos: contacto principal/retirada propia/cancelar reactivación y resto de conciliación por control; QA014restore102/QA015regresión/QA016aceptación pendientes.11/16 completos.


## 2026-10-09 — contactos móvil corregido, candidato V8

R5-CONTACT-MOBILE-OVERFLOW-001 cerrado focal: tabla de contactos con desplazamiento horizontal dentro del panel. V7 reproducía botones de edición interceptados en390×844; un solo contacto/recibo preservado, sin force click. Reanudación mixta V7→V8 pasó y queda separada. Recorridos frescos V8 escritorio+móvil2/2PASS30,0s, cinco ACK correlacionados por recorrido: crear contacto principal, desmarcar, archivar contacto conservando ID/historia, archivar/reactivar ficha. Cancelar archivo de contacto y reactivar no escribe. Perfil clínico, programas, sesiones, registros y accesos ajenos idénticos; ficha sintética termina activa sin contactos activos, personas sintéticas archivadas conservadas. Diagnóstico detallado docs/qa/R5_CONTACT_MOBILE_OVERFLOW_001.md.

Docker V8 BUILD_ID hBWDTZf8SyHXQcLh_yocw, catálogo102. V7 detenido conservado; Supabase/volúmenes intactos. Tipado/lint/buildwebpackPASS; regresión diseñador desktop+móvil2/2PASS22,2s (reordenar/retirar/descarte/filtros/historial, cuatro ACK total). Evidencia V7 y mixta preservada, nuevas pruebas identificadas V8. Sin migraciones/contratos/permisos nuevos. Ledger404 incorpora240auditorías documentales separadas de validación; tresFICHA y ochoPROGRAMAS acreditados por controles concretos V8. ComparaciónUXbase aún pendiente; no aprobación global inferida.

QA11/16sin cambio: abiertos003/004/014/015/016. Siguiente: pendientes por control/UXbase, restore102 aislado, regresión final y ensayos manuales clínica/supervisor/técnico al final. ARCHIVOS013 cerrado, no repetir borrado; no cuenta humana modificada.


## 2026-10-09 — navegación/búsqueda/cancelación V8

Paquete de sólo lectura desktop+móvil2/2PASS30,0s: búsqueda abierta/validación mínima/ID clínico conciliado con RPC/resultados vacíos/abrir ficha y cerrar; navegación por sidebar a cinco rutas, Burger móvil; nueva ficha rellenada y cancelada sin alta; filtros admin/supervisor/técnico concilian conteos DTO, búsqueda por email, edición de miembro cerrada sin guardar; catálogoUpgrade abre y concilia planes, Escape sin cambiar suscripción. Snapshots exactos antes/después de estudiantes/equipo/comercial/shares/programas-sesiones-registros. Sin escrituras de esos recursos. Prueba tests/e2e/r5.shell-readonly-v8.spec.mjs, safes por proyecto. Intento previo intentaba fill en Select readonly; corregido arnés, sin cambio de producto.

Catorce controles mapeados: búsqueda programas/documentos/otros actores y variantes nombre/profesión mantienen límites parciales explícitos; no se afirma aprobación de las404 ni comparación visual. QA11/16sin cambio. Restore102 está en preparación documental, todavía no ejecutado.


## 2026-10-09 — variantes captura y método intervalos V9

R5-INTERVAL-METHOD-NULL-001 cerrado focal: al pulsar opción vigente de Método, Mantine permitía deselect null y validación impedía persistir. allowDeselect=false + guard null conserva método obligatorio, sin migraciones/contratos/permisos nuevos. Tipado/lint/buildwebpackPASS. DockerV9 BUILD_ID FdAlCRUJasCmkUnD5NHVn, V8 detenido conservado.

Escritorio retomado1/1PASS55,4s: cinco recibos precedentesV8 conservados, parcial/momentáneo/duración/latencia y cancelación concluyenV9; no repetición de capturas originales. Móvil frescoV9 1/1PASS1,4min: frecuencia deshacer y dos ventanas pausadas/reanudadas; tres métodos intervalos seleccionados dos veces sin borrar, true/false/null en borrador, reload y envío con IDs/timestamps originales; duración abierta guardar/cerrar/reabrir sin auto-completar y dos episodios cerrados; latencia pending guardar/cerrar/reabrir sin NR implícito, respuesta y NR explícito en dos ensayos. Seis registros y catorceACK UI más archivoRPC por recorrido. Cancelar diálogo sesión no escribe; confirmar cancela sólo sesiónpropia, archivo conserva resultados. Todas las proyecciones ajenas idénticas. tests/e2e/r5.capture-details-v8.spec.mjs; safes V9 fechados y journals preservados.

Ledger404 ya tiene auditoría documental individual; no aprobación global. Se vinculan34controles concretos de variantes con candidatos mixtos claros. Fase/métricas derivadas/ediciónV1/descarteoffline y comparaciónUXbase requieren su evidencia específica. QA11/16sin cambio; restore102scripts preparados, ensayo todavía no ejecutado.


## 2026-10-09 — avatar y cancelaciones de compartir V9

UI escritorio+móvil2/2PASS22,5s: cuatro categorías de avatar con doce previewsPNG locales cada una; cerrar selector no guarda; seleccionar persona genera previewblob y cerrar perfil no sube ni guarda; tres niveles de acceso disponibles y cuatro plantillas mensaje; cancelar modal limpio al reabrir; accesoactivo cambiar nivel local/cancelar, revocación dismissed y detalle cerrado conservan DTO exacto. Setup mínimo necesitó un único acceso temporal (no había invitación aceptada existente), mismo grant para ambos recorridos, cuentasfixture reutilizadas sin cuenta nueva. Invitación122886c6 creada/aceptadaRPCv1→v2, UI no cambia ni versión ni grants, cleanupRPC exclusivo v3 receipt3361e764:revocado,caps[],mínimoscopeNULL,snapshot42501. Invitaciones ajenas y detalleclínico idénticos. Intentos sinactivo se conservan parciales, no presentados aprobados.

Escape en selector anidado puede cerrar también editor exterior; arnés no debe suponer lo contrario. Caso de cierre propio usa botónXdel selector y comprueba editor siguevisible, sin escrituras. El guardado del bitmap seleccionado y comparación UXbase mantienen su evidencia separada; no se atribuye persistencia desde preview.19controles mapeados con límites. QA11/16sin cambio; ensayo humanos al final.


## Renovación restore102 — 2026-10-09 (estado vigente)

**QA-014 VALIDADO R5 LOCAL/SINTÉTICO sobre catálogo102; QA12/16.** Respaldo 26980a59-0f88-44ce-ae1c-d4be172bd865, captura 2026-10-09T04:20:06.254Z, dump SHA256 51008786ab943d7cfd35d8693e85e1cb467a9e0a21ecaa34a840fab77d6818a0. Destino aba-restore-26980a59, DB sin red/puertos; Auth/Storage en su mismo namespace aislado. Destinos recuperados y fallidos detenidos, contenedores/volúmenes preservados. Web V9 FdAlCRUJasCmkUnD5NHVn y Auth originales revalidados HTTP200.

PASS: snapshot exportado PostgreSQL y relectura independiente sin escrituras observadas;90 tablas/2350 filas del alcance declarado;102 migraciones;98 políticas,221 funciones,111 flags RLS,343 objetos ACL,15 roles y25 memberships exactamente conciliados. Storage40 archivos/85140 bytes, inventario completo y cada hash iguales entre origen/copia/destino. Auth10 logins/user/logout ordinarios, incluidas dos cuentas previamente aceptadas; no se presenta como nueva aceptación. PNG A200/68bytes/SHA exacto; B/anónimo400 denegados. Nueve perfiles SQL ordinarios (tres positivos/seis denegados), SELECT anónimo42501 y grant mínimo revocado sin capabilities/scope/lectura; forward102 verificado.

Correcciones sólo del procedimiento de ensayo: delimitadores DO, lectura de rolconfig desde pg_roles y preservación de parámetros tipo lista sin alterar la sesión del restaurador. Los tres destinos fallidos4f576c29/356121da/cf4df7d9 se conservaron; ninguna reimportación sobre un destino existente, ninguna modificación de roles/grants del origen. La documentación de preparación queda histórica; scripts y pruebas102 fueron ahora ejecutados.

Evidencia privada saneada: .aba.local/qa/restore-final-data-proof-26980a59-0f88-44ce-ae1c-d4be172bd865.json y locator restore-final-current.json. El alias restore-final-data-proof.json conserva101 histórico; usar el proof por UUID. Dump/config/roles/snapshot cifrados bajo .aba.local/backups y clave separada en .aba.local/backup-keys. Los fingerprints cubren el alcance declarado, no toda tabla del dump; Storage y PostgreSQL carecen de snapshot transaccional común. Clave y respaldo permanecen en el mismo equipo; no hay copia externa. No se acreditan REST/Realtime/SMTP/PWA/VPS recuperados ni configuraciones per-database de roles.

Siguen abiertos QA-003 (controles/rutas/perfiles), QA-004 (comparación UX base), QA-015 (regresión y versión final) y QA-016 (aceptación explícita). Los tres recorridos humanos clínica/supervisor/técnico permanecen planificados para el final. Cambios posteriores de contratos/esquema que invaliden esta evidencia exigen renovar el ensayo.


## QA003 — fases/porcentaje preparado; ejecución bloqueada por Docker pausado

2026-10-09: tests/e2e/r5.percentage-phase-v9.spec.mjs y playwright.percentage-phase-v9.config.ts preparados para ejecutar en serie escritorio/móvil sobre V9. Alcance: cuatro fases, I/A/E/NR/null, porcentaje25% excluyendo ensayo sin registrar, borrador/reload/envío con IDs/timestamps, resize cancelado y expansión/reducción preservando observaciones; cancelación/archivo sólo de sesión sintética propia y proyecciones originales iguales. Lint focal PASS. Sin cambio de producto.

Intento de ejecución detenido al consultar Docker: daemon informa pausa manual. Ambos casos fallaron en preflight antes de autenticar, crear journal o iniciar sesión; no son defectos funcionales ni prueba aprobada. Docker no fue reanudado ni Windows configurado. Requiere reanudación manual de Docker para continuar la ejecución. QA permanece12/16, QA003/004/015/016 abiertos. Restore102 aprobado conserva vigencia de su snapshot; disponibilidad actual del ambiente está suspendida por pausa manual.


## 2026-10-09 — fases/porcentaje y corrección V10

Docker reanudado manualmente; web/Auth200. R5-PERCENTAGE-RESIZE-CANCEL-001 cerrado focal: cancelar cambio5→2 conservaba cinco ensayos pero NumberInput mostraba2; remonte sólo del campo cancelado restablece5. Tipado/lint/buildwebpackPASS. Candidato V10 oOsSbvhBdtZSHeN1230vG en loopback3001, V9 detenido/preservado.

Escritorio retomado1/1PASS39,9s sin repetir inicio/borrador confirmadosV9; móvil frescoV10 PASS. Cuatro fases baseline/treatment/generalization/maintenance persistidas; I/A/E/NR y quinto null dan25% (denominador4), ayuda gestural conservada. Borrador/reload/envío conserva IDs y recordedAt de los ensayos; capturedAt global se actualiza legítimamente al persistir. Cancelar reducción conserva DTO y restaura campo5; expansión a6 añade sólo null y reducción a5 conserva cinco observaciones. Cada recorrido: cuatro registros, diez ACK UI y archivoRPC; cancelar diálogo no escribe, sesión propia cancelada/archivada, todas las proyecciones ajenas idénticas. Escritorio mixto2ACK V9+8ACK V10; móvil10ACK V10. Diagnóstico de aserción capturedAt del arnés conservado, sin confundirlo con pérdida de timestamps.

Evidencia: tests/e2e/r5.percentage-phase-v9.spec.mjs y safes/journals V10 fechados. Sin nuevos contratos/migraciones/permisos. QA12/16 permanece; QA003/004/015/016 abiertos. Restore102 vigente para su snapshot/contratos; datos sintéticos añadidos después no se atribuyen a ese respaldo. Recorridos humanos siguen para el final.


## 2026-10-09 — identidad pública/landing/soporte V11

Paquete completo escritorio+móvil2/2PASS19,3s. Login marca→landing, proveedores OAuth deshabilitados y simulación retirada; términos/privacidad abren/cierran; recuperación→volver acceso. Landing Conocer más y CTA login/contacto comercial/soporte; escritorio anchorscaracterísticas/entorno/documentación/brand. Gate anónimo de ayuda/soporte redirige login con redirectTo preservado. Formulario comercial vacío rechaza nativamente sin enviar; no nueva solicitud comercial acreditada aquí.404autenticado real/volverhistory. Shell Soporte abrir/cerrarEscape/Ayuda→guía→ticket/Contacto→support; formulario nuevo se cancela con confirmación sin envío, snapshots autorizados soporte iguales y cero comandos. Capturas de rutas públicas sirven como evidencia actual, aún no comparaciónUXglobal.

DefectoR5-SUPPORT-MOBILE-MENU-001 cerrado focal: right-end oscilaba x-171↔370 (ancho190) en390x844 y clic Ayuda fallaba. top-start sólo móvil conserva right-end escritorio; ocho muestrasV11idénticasx37/ancho190 y clics naturalesAyuda/ContactoPASS, sin force. Tipado/lint/buildwebpackPASS, V11 mZeZnMMBZ4vYp1uE31Kon loopback3001, V10detenido/preservado. Harness ajustó queryredirect legítima, espera DOMúnico y confirmaciónnativa; no cambios de autorización. Backend/contratos/migraciones sin cambio.

QA12/16 sin cierre automático003/004/015. Referencia dc1b0c4 extraída71blobsSHA, dependencias lockhistórico en volumen Docker exclusivo ignore-scripts; renderloopback3002 separadoSupabase, originalsourcesRO. QA004 comparación visual dashboard detecta distribución5/7→KPIarriba+6/6, pendiente corregir/verificar; baseline mocks sólo referencia, nunca aprobación del producto.


## 2026-10-09 — QA-003: controles de ficha V11

Escritorio 1/1 PASS (11,8 s) y móvil 1/1 PASS (11,5 s), ejecutados en serie sobre V11 mZeZnMMBZ4vYp1uE31Kon. Perfil admin-a y ficha sintética propia: RUT inválido rechaza sin comando; edición de identificación, diagnóstico libre y contexto persiste con recibo correlacionado y recarga. Búsqueda por cinco claves, ausencia de coincidencias, filtros Todos/Antiguos/Vigentes, menú Escape y Ver carpeta comprobados. Dos ACK por recorrido: edición y restauración de valores originales. Versiones 25→27→29 y updatedAt avanzan legítimamente; programas, sesiones, registros y resto de ficha conservados. Lint PASS. Primer fallo fue locator requerido del arnés, con cero comandos; retomado mismo runId tras verificar DTO original.

Evidencia: docs/qa/proposals/clinical-field-controls-v11-current.json; pruebas tests/e2e/r5.clinical-field-controls-v11.spec.mjs; safes fechados .aba.local/qa/clinical-field-controls-v11-{desktop,mobile}-safe-20261009.json. Se vinculan 16 acciones focales, sin cierre global QA-003 ni comparación UX. Pendientes separados: perfiles adicionales, selección/autocompletado de diagnóstico, fallback de nombre vacío y botón Volver al listado. No se modificó producto ni contratos en este paquete; QA conserva 12/16.


## 2026-10-09 — dashboard, composición UX V12

Defecto R5-DASHBOARD-DISTRIBUTION-001 cerrado focal. Comparación visual directa de pares dc1b0c4/candidato desktop1440×900 y móvil390×844: antes, bienvenida/KPI a ancho total y sesiones/gráficos6/6 rompían distribución exigida por spec. Corrección en DashboardPage: columna5 bienvenida+sesionesactivas+finalizadas, columna7 KPI+sesioneslínea+logrosbarras; móvil conserva ese orden. Cuatro KPI reales y tarjetas adicionales persistidas se conservan; no se repone simulación de roles/ModoAplicador, porcentajes mock ni resultados inventados.

Prueba final tests/e2e/r5.dashboard-ux-v12.spec.mjs: 2/2 PASS24,3s en serie. Geometría5/7 y orden móvil, scroll horizontal inexistente, contadores contra RPC autorizado, logros mensuales,12bucketsanuales/tooltip por estudiante contra persistencia, ampliación/cierre con filtros, rangoactividad, refresco y logout. Cero escrituras clínicas. Lint PASS; tipado/lint del cambio y build webpack PASS. Candidato V12 0Ehm1gKf372lHuuQ0KjeM, loopback3001; V11 detenido/preservado. Fallos previos del arnés por puntos superpuestos y borde del área de tooltip conservados; interacción final hover real sobre columna dentro del plot, sin force/dispatch, sin cambio de cálculo del producto.

Pares PNG, hashes y adaptaciones en docs/qa/R5_DASHBOARD_UX_V12_20261009.json. Comparación focal de distribución aprobada, no aprobación global QA004. Bienvenida con nombre exacto y expansión/navegación de sesiones se mantienen pendientes separados. QA003/004/015 abiertos; QA12/16 y404acciones integradas conservan denominadores.


## 2026-10-09 — QA-003: campana y navegación dashboard V12

Campana: botones Marcar leída/Marcar no leída, ACK correlacionado y recarga: desktop1/1PASS13,3s/móvil1/1PASS10,7s. Abrir aviso ya leído →Agenda sin escritura extra. Suplemento Abrir no-leído: desktop1/1PASS12,0s/móvil1/1PASS8,6s; marcarno-leído y abrir generan2ACK; framenavigated confirma ambos recibos ANTES de URLAgenda. Reutilizado aviso sintético existente, sin nuevas cuentas/citas/notificaciones. Estado boolean original leído=true restaurado, contenido/createdAt exactos, demás notificacionesA/B idénticas. Versiones16→18→20→22→24 legítimas; readAt actualizado, no afirmar restauración de su timestamp. Sin defecto producto. NOTIFICACIONES003/004/005 focales positivos; ruta revocada y otros perfiles siguen separados. Propuestas notifications-controls-v12-current y notifications-open-unread-v12-current JSON/MD contienen recibos y límites.

Dashboard suplemento: escritorio+móvil2/2PASS18,9s. Bienvenida exacta nombre/clínica del DTO de identidad, ausenciaModoAplicador simulado, expansión sesiónactiva conIDclínico/programas reales, botónprograma→rutaresultados exacta, expansiónsesiónfinalizada propia yAbrirsesión→workspaceautorizado conrecarga. Proyecciones programas/sesiones/registros eidentidad exactas antes/después; cero escrituras clínicas. DASHBOARD001/005/006/008 vinculados;009 navegación parcial: no se afirma selección de un sessionIdhistórico específico desde enlaceporstudentId. ComparaciónUX distribución/dashboard ya acreditada en paquete anterior; demásfamilias/perfiles pendientes.

Candidato V12 0Ehm1gKf372lHuuQ0KjeM; suites y safes fechados .aba.local/qa/*-v12-{desktop,mobile}-safe-20261009.json. QA12/16 conserva denominadores; QA003/004/015 aún abiertos. Final QA015 exige regresión del candidato tras cerrar brechas; estas pruebas focales no sustituyen gate final.


## 2026-10-09 — QA004 público y verificaciones estáticas V12

Cuatro pares PNG landing/login escritorio+móvil comparados directamente con dc1b0c4 y documentados en docs/qa/R5_PUBLIC_UX_PAIRS_20261009.{json,md}. Landing conserva header/hero/trescards/banda/footer; login conserva cardcentrada/email/password/submit. AdaptacionesAuthreal, retiroaccesomock, OAuthlocaldeshabilitado, recuperación/legal y CTA soporte/comercial/local explícitas. RecapturaV12estable: ocho muestras porviewport, opacity1/ancestors1 ybotónenabled; cuatroCTAlegibles en imágenes. Reserva visual de transparencia resuelta sin atribuir causa no demostrada. Título móvil mantiene overflowleveheredado: solicitado390, innerWidth396, hero x-6/ancho402; baselinePNG402. Cosmético diferido, CTA/marca visibles y clics previos acreditados; no se afirma viewport totalmente libre de overflow.

Tipado completo ylintcompleto PASS, comandos/BUILD_ID/hashes registrados en .aba.local/qa/candidate-static-v12-20261009-safe.json. BuildwebpackV12PASS vigente. No constituyen cierreQA015: faltan paquetesUI/perfiles/UX yregresión del candidato final.

Accesos Compartidos: reproducción de vistaActivas escritorio/móvil conlecturas ordinarias completa, ceroescrituras yproyecciónexacta. Lote actual tiene0invitacionessent/accepted; muestraestado vacío. Pérdida de Accordion original detectada encódigo NO se declara reproducida visualmente conestado vacío. Próximo paquete requiere accesos sintéticos mínimos nuevos propios; no reactivar grantsrevocados ni modificar originales. Evidencia .aba.local/qa/ux-current-v12-shared y shared-active-v12-inventory-safe.json. Primer diagnóstico falló al inferirmanageableStudents desdeRPCque no tiene ese campo; corregido a null sin cambio producto. QA12/16 permanece.


## 2026-10-10 — compartidos V13 cerrado focal

R5-SHARED-GROUP-DISTRIBUTION-001 corregido y validado: Accordion por clínica/ficha, dos grupos con 2/1 profesionales, filas y acciones existentes preservadas. Candidato aba-local-qa-v13, BUILD_ID rFuUzZbqYsCB2mKTHX09X. Escritorio y móvil PASS en ejecuciones separadas; cuatro ACK de cambios de nivel y restauración de capacidades. Escritorio reanudó el primer ACK confirmado tras fallo del selector del arnés, sin repetirlo. Capturas finales expandidas revisadas después de estabilizar la animación. No cambios de contratos, migraciones ni Auth.

Cierre exclusivo del lote propio: tres revocaciones por UI móvil con recibos correlacionados, ficha nueva archivada lógicamente, cero borrados físicos. Invitaciones previas, detalle clínico y programas exactos; capacidades previas restauradas. Evidencia y límites: docs/qa/R5_SHARED_GROUP_V13_20261010.json. Tipado y lint focal V13 PASS; build webpack PASS. Gate final QA015 todavía pendiente. QA mantiene 12/16; QA003/004/015/016 abiertos y los tres recorridos humanos siguen planificados para el final.


## 2026-10-10 — búsqueda autorizada V13

Escritorio 1/1 PASS26,9s y móvil 1/1 PASS17,9s, ejecutados en serie. Resultados de estudiante/programa/documento coinciden con RPC autorizado; click real al destino, campos/versiones/filas y recarga comprobados. Clínica B devuelve cero para los tres recursos de A y niega destinos directos. Validación vacío/un carácter, sin resultados y cierre acreditados. Cero comandos de escritura; detalle, programas/sesiones y documentos idénticos, incluidos los originales b347 de sólo lectura.

Primer intento detenido antes de UI por testBatchId documental null. Procedencia reconciliada exclusivamente contra tuple histórico attachment/version/filename/SHA/68bytes/createdBy/admin-a y clínica/ficha, sin recrear datos. Diagnóstico preservado y escritorio reanudado sólo desde discovery sin búsquedas ni comandos. Evidencia docs/qa/R5_AUTHORIZED_SEARCH_V13_20261010.json. QA003/004/015/016 siguen abiertos; contador12/16.


## 2026-10-10 — perfiles B y retiro clínico V14

Perfiles B V13/catalog102: supervisor crea/publica programa por UI; técnico inicia/guarda/reabre/envía/finaliza/archiva su sesión. Escritorio resume1/1PASS15,7s y móvil1/1PASS26,4s,14ACK correlacionados. Roles/asignaciones/ficha13/originales exactos. Dos programas/registros nuevos retenidos y sólo sus sesiones archivadas. Incidentes del arnés capturedAt/hasActiveSession/revision0 documentados sin duplicar escrituras. Evidencia docs/qa/R5_ROLE_ACTIONS_V13_20261010.{json,md}; regresión focal finalV14 pendiente.

Defecto R5-HISTORY-WITHDRAWAL-001 reproducido por control disabled/ausencia de transición, corregido y cerrado focal. Nuevo forward20261010152644 aplicado local103/103 tras dry-run exclusivo. Comando existente conserva forma y añade retire-reference confirmado sólo para referencias no farmacológicas activas, payload exacto; crea sucesor inactive, conserva predecesor/evidencia y usa permisos/versiones/recibos canónicos. No DELETE ni nuevos grants/RLS. UI muestra Retirada, conserva versiones, bloquea corrección activa de retirada, permite cancelar sin escribir y recuperar misma operación desconocida. V1 exige inicialización explícita; originales no modificados.

Candidato V14 -N6_dbDzA8P56-Y0qP5nR; typecheck/lintfocal/buildwebpackPASS y contrato3/3PASS. UI escritorio17,2s+móvil15,2s PASS, ocho recibos únicos y reintento escritorio con mismo recibo/sin doble versión; cuatro guardasSQL puras PASS, alteración de contenido y clínicaB rechazadas. Baselineclínico/programas exactos fuera de cuatro cadenas nuevas propias. Capturas responsive inspeccionadas; dc1b0c4 no tiene esta pestaña no farmacológica, por lo que no se inventa un par QA004 con Documentación Legal. Evidencia docs/qa/R5_HISTORY_WITHDRAWAL_V14_20261010.json.

QA-014 REABIERTO: restore102 se conserva como prueba histórica y no acredita función/constraints103. Pendiente respaldo+restore aislado103, sin recuperar sobre stack activo. Estado actual11/16; QA003/004/014/015/016 abiertos. Falta diseño conductual, medicación específica, estadosUI/controles restantes, familiasUX y regresión final. Recorridos humanos siguen al final.


## 2026-10-10 — diseño conductual V14, prueba terminal

Escritorio1/1PASS18,0s y móvil1/1PASS22,5s; lintPASS. Todos los campos textuales/extras, funciones attention+escape y dimensión Duración conciliados contra comando y DTO completo; borrador, recarga/reapertura, sucesor, cancelación sin escritura y publicación verificados. Doce ACK correlacionados. Dos programas sintéticos propios retenidos; no se crearon sesiones/capturas ni se alteraron originales, fichas o programas ajenos. Evidencia docs/qa/R5_BEHAVIOR_DESIGN_V14_20261010.{json,md}. CandidatoV14 -N6_dbDzA8P56-Y0qP5nR, catálogo103. Admin-a solamente; no acredita captura ni exportaciones. QA003/004/015 globales continúan abiertos. Medicación funcional también terminó, pero su paquete permanece abierto mientras se corrige y repite un desborde móvil confirmado; no declarar su UX aprobada.


## 2026-10-10 — medicación V16, prueba y UX focal terminadas

Escritorio1/1PASS12,5s y móvil1/1PASS11,7s sobre V16 SqXFb86Tn89rgGpuEGkKu / catálogo103; tipado, lintfocal y buildwebpackPASS. Se reutilizaron las cinco versiones históricas de cada medicamento sintético B y se conciliaron nombre/dosis/frecuencia/prescriptor/fechas/notas/predecessor. Desplegar/cerrar versiones, cancelar cambios, reabrir limpio, Escape y rechazar Finalizar preservaron DTO clínico/programas exactos: cero intentos de escritura. No se recreó el ciclo farmacológico ni se inventó nueva persistencia positiva.

R5-MEDICATION-MOBILE-001: a390px los nombres largos desbordaban la tarjeta y ampliaban la página a469px. Corregido únicamente StudentMedicationPanel: ajuste flexible y texto con salto; acciones debajo en móvil. V15 eliminó desborde pero revisión visual detectó columna estrecha; V16 probado y revisado conserva390px, nombre242px y acciones debajo. Capturas finales de panel, versiones, agregar y editar contrastadas contra baseline dc1b0c4 en escritorio/móvil. Modales capturados con opacity1 y viewport; transparencias de capturas anteriores eran animación, no defecto de producto. Adaptaciones por fechasISO/nullable/endDate/historia inmutable registradas en docs/qa/R5_MEDICATION_CONTROLS_V16_20261010.json. Evidencia funcional/visual focal completa; QA003/004/015 globales abiertos.

Candidato actual aba-local-qa-v16, BUILD_ID SqXFb86Tn89rgGpuEGkKu. V14/V15 preservados detenidos; Supabase y volúmenes sin cambio. QA11/16; restore103 y otros controles pendientes.


## 2026-10-10 — estados locales y controles menores V16, terminal

EstadosUI escritorio1/1PASS15,5s+móvil1/1PASS14,3s; lintPASS. Fallos/demoras limitados a IDs NextAction de lectura reales: dashboard carga/error/Actualizar y refresco fallido conserva último DTO; búsqueda busy/error/retry/cierre; lista cargador/menu/ficha/Volver/Dashboard. Cero escrituras, originales y proyecciones exactas. Evidencia docs/qa/R5_UI_STATES_V16_20261010.{json,md}. Pendientes explícitos app/error y app/loading globales: loaders locales no los sustituyen. Noencontrado queda conciliado con prueba pública histórica por separado.

Controles menores readonly escritorio1/1PASS11,9s+móvil1/1PASS9,8s: tarjetas reales contra DTO, diagnóstico Otro+libre+selección autocomplete sin guardar, recarga descarta cambio, nombre original exacto/volver, búsqueda equipo nombre/profesión/resultados exactos/no-match/tres perfiles. Cero comandos. Guard inicial suponía fullName original null; falló antes deUI y sin escrituras. Fallo conservado, criterio corregido a datos actuales. Para nombre vacío no había fixture sin nombre: prueba focal aparte sóloown94, escritorio1/1PASS10,8s+móvil1/1PASS10,5s, cuatroACK total; fullName null persiste y muestra iniciales en detalle/lista tras reload; nombre original propio restaurado y restoDTO exacto. Own94 versión29→33; originalb347, programas y sesiones intactos. Evidencia docs/qa/R5_SMALL_CONTROLS_V16_20261010.json. No nuevo producto/SQL/Auth ni comparaciónUX global; sólo controles y campos focales. QA11/16,003/004/014/015/016 siguen abiertos.


## 2026-10-11 — estados globales V16 terminal

Escritorio1/1PASS12,6s y móvil1/1PASS12,4s, lintPASS. Error real app/error por excepción contextual de render; cerrar alerta no envíaNextAction; limpiar flag y Reintentar/reset recupera métricasDTO reales. app/loading real role=status observado al retener RSC y móduloDashboard originales; liberar devuelve lectura autorizada. Ir al Inicio real desde404 recupera dashboard. ESTADOS005/007 yaV11public-support y no se repiten. Cero comandos/escrituras, bundle de disco intacto y proyecciones propias/originales idénticas. Dos fallos del arnés preservados: SW sirvió original y retención del wrapperStudents mostróloader local; corregidos sólo contexto/harness, nunca producto. Prueba final cubre seischecks completos. Evidencia docs/qa/R5_GLOBAL_STATES_V16_20261011.{json,md}. No equivale a caída de servidor ni todoslosperfiles. QA003global permaneceabierto. V17cabecera se prueba por separado; este paquete corresponde aV16 SqXFb86Tn89rgGpuEGkKu/catálogo103.


## 2026-10-11 — compartir cabecera/lista V19 validado focal

PASS focal: escritorio 1/1 (16,1s), móvil 1/1 (15,5s). Tres perfiles sintéticos por tamaño; cero comandos, proyecciones clínicas/programas/invitaciones y originales idénticos. Candidato `aba-local-qa-v19`, BUILD_ID `A7t-LPX5vzBg-DMDbF8_z`, catálogo103. Tipado, lint focal y build webpack PASS.

Se recuperó el acceso original Compartir en la cabecera según capacidad por recurso, usando el mismo modal y contrato. Los indicadores de sesión/familia dependen del DTO. Todos los flags encontrados eran false: se prueba ausencia correcta, sin afirmar render true.

V17 detectó navegación de la tarjeta al abrir el menú Compartir. V18 bloqueó la navegación, pero cerrar el dropdown desmontaba el componente y el modal. V19 detiene propagación del árbol interactivo y mantiene montado el menú. Regresión: abrir desde cabecera/lista, escribir correo, cancelar, Escape, X, reabrir limpio, recargar; la lista conserva URL y tarjeta. Supervisor/técnico B sin authorization.decide no ven el botón. Sin enviar invitaciones. Fallos V17/V18 y candidatos previos preservados.

Inspección visual desktop/móvil contra la cabecera dc1b0c4: acceso recuperado, header y modal legibles; actual móvil390px sin desborde. Foto/archivar/iniciar son controles reales añadidos. No existe par original del modal en este paquete; no equivale a QA004 completo. Evidencia con SHA en el JSON.

QA global11/16:003,004,014,015,016 abiertos. Restan captura/offline/V1/métricas, pares UX restantes, conciliación404, restore103 y gate final. Recorridos humanos al final.



## 2026-10-11 — métricas V19 y equipo V20 terminales

Escritorio1/1PASS8,1s y móvil1/1PASS8,0s, cero comandos. DTOs actuales iguales a20registros finales V9/V10 conservados. UI y CSV confrontados con cálculo independiente de las cinco dimensiones: tasa eventos/min, porcentajes sobre observados, duración total/promedio y latencia responded-only; NR y sin registrar no se inventan. Payload, revisiones, fase, profesional y versión exactos; snapshots programas completos idénticos tras recarga.

CSV numérico con tolerancia1e-9 absoluta/1e-12 relativa; UI es-CL máximo2decimales. Primera ejecución falló por etiqueta CSV Línea base frente a enum esperado baseline: corregido sólo arnés, conservando evidencia y versión r1. El JSON original conserva el enum y se compara exacto.

Candidato V19 A7t-LPX5vzBg-DMDbF8_z/catálogo103; host y contenedor activo/build verificados antes de Auth. Ejecutado antes de activarV20; no se atribuye repetición aV20. Faltan borradores/open-windows/V1/descarte/offline/otros perfiles y PDF; no cerrar QA003 ni QA004 por este paquete.


Escritorio1/1PASS9,4s y móvil1/1PASS9,3s. Tipado/lint/buildwebpackPASS. V20 cCIcgk_9ZUsrSS21afE_I/catálogo103. Defecto R5_TEAM_MOBILE_TOOLBAR_001: tres controles comprimidos recortaban Invitar miembro; SimpleGrid base1/sm3 deja filtros y acción a326px en móvil, label102/102px sin truncado, página390/390px. Escritorio conserva3columnas.

Buscar por nombre, filtrar Supervisor y recargar funcionan. Abrir/cerrar invitación con correo sintético sin enviar; abrir/cerrar perfil sin guardar. Cero comandos y snapshot equipo idéntico. Cuenta humana y creación de cuentas siguen para los recorridos finales.

Inspección visual real de lista original dc1b0c4 y actuales V16/V20 en ambos tamaños: retiene títulos, grid3/1, tarjetas/avatar/nombre/profesión/contacto/Editar; roles/status/datos reales y correos de invitación son adaptaciones. Modal invitación actual legible; par original perfil/avatar queda pendiente. No aprobar QA004 completo.


Evidencia docs/qa/R5_CAPTURE_METRICS_V19_20261011.{json,md} y docs/qa/R5_TEAM_TOOLBAR_V20_20261011.{json,md}. QA11/16 sin aceptación ni VPS.


## 2026-10-11 — familia/documentos poblados V21

Candidato aba-local-qa-v21, BUILD_ID 7AtdY0nw3olpUC5PDvk7o, catálogo103. Cuatro capturas/regresiones escritorio+móvil PASS,0comandos, snapshot B exacto, versión13 preservada. Fixture retenido:2personas familiares,2hermanos y documentos/consentimientos existentes; no crear ni modificar datos. Tipado/lint/buildwebpackPASS.

Dos defectos reales corregidos: hermanos sobresalían globalmente641px y finalidad de consentimiento442px en viewport390. Hermanos ahora Table.ScrollContainer700 con scroll local; se comprobó llegada a la última acción sin sacarla del panel. Consentimientos con grupo reducible y texto wrap-anywhere. Nuevas capturas390px, body390 y document390. Se preservan V20 y sus PNG. El passed de captura V20 no aprobaba UX: medir sólo documentElement no detectó overflow; PNG/bodynowcubiertos.

Pares reales dc1b0c4: contactos/table/Agregar y documentos/icono/nombre/metadatos/Ver/zona carga conservados, adaptados a roles/canales y datos autorizados. Documento actual seis filas legales; ocho versiones available del catálogo incluyen fotos. Consentimientos, hermanos y portal son extensiones sin par operativo original. Original familia móvil530px no se reproduce su desborde. Formularios/previews/acciones portal/descargas y controles individuales siguen con evidencias separadas; no aprobar QA004 completo.

QA11/16; faltan captura/offline/V1 y pares UX restantes, conciliación404, restore103 y gatefinal. Recorridos humanos al final.

Evidencia docs/qa/R5_POPULATED_FAMILY_DOCUMENTS_V21_20261011.{json,md}.


## 2026-10-13 — captura móvil y perfil V21

Captura/offline móvil V21: 1/1 PASS en35,2s; cierre/reapertura y descarte local, Frecuencia con ventana abierta guardada y recargada, archivo de borrador preservando payload, bloqueo de retirar descarga con pendiente, descarte desde layout real offline, reconexión con cola vacía, cancelación y archivo de sesión. Cinco ACK únicos; cero escrituras del pendiente offline; snapshots clínicos y originales preservados. Complementa escritorio ejecutado el11oct. Límites: sólo una entrada de cola, V1/documentos y otras filas de cola separados.

Perfil/avatar:16pares/32imágenes revisadas y hashes verificados; composición escritorio/móvil PASS focal. Email Auth readonly y Canvas local son adaptaciones; artwork remoto bloqueado no comparable. Indicador Formas original capturado durante transición; footer miembro no acredita todas las asignaciones. No guardado/subida/persistencia de avatar acreditados aquí.

QA11/16; QA003/004/014/015/016 siguen abiertos. Candidato V21 7AtdY0nw3olpUC5PDvk7o,103migraciones. Próximo: controles V1, persistencia perfil/avatar, ejes/ampliación resultados, preservación de otros elementos offline y pares UX restantes; conciliación por acción y gatefinal.

Evidencia: docs/qa/R5_CAPTURE_PROFILE_V21_20261013.{json,md}.


## 2026-10-13 — V1 y resultados V21

V1: escritorio+móvil2/2PASS11,4s. Agregado histórico c38dbfa7 frecuencia3 visible Sólo lectura, sin botones/campos de edición dentro de su tarjeta; recarga mantiene snapshot completo. Sin convertir V1 en V2 ni modificar sesión original.

RESULTADOS-018/019: escritorio+móvil2/2PASS27,1s. Eje real SVG0..100→10..90; puntos cambian según escala. Filtros dimensión/periodo/fase/profesional y tabla exactos antes/después de ampliar/cerrar, mismo eje y coordenadas estabilizadas. Snapshot own+original idénticos; cero comandos. Lint final focalPASS. Fallos anteriores del arnés conservados: capa SVG, label ambiguo y coordenadas animadas. No corrección de producto requerida.

CandidatoV21 7AtdY0nw3olpUC5PDvk7o; QA11/16 sin cierre global. Pendientes: perfil/avatar persistido, selección offline y otros elementos, pares UX y conciliación por acción, gatefinalQA015.
Evidencia docs/qa/R5_V1_RESULTS_CONTROLS_V21_20261013.{json,md}.


## 2026-10-13 — perfil y selección offline V21

Perfil propio sintético admin-b: escritorio1/1PASS18,2s y móvil1/1PASS14,4s. Nombre/profesión/título/descripción/teléfono distintos guardados, reload y DTO exactos; avatar Canvas Personas persistido, reemplazo Formas, retiro y restauración de todos los campos originales. Cuatro ACK por recorrido, versiones4→8→12. Bytes PNG descargados coinciden con preview y versiones anteriores conservadas; cuatro PNG nuevos retenidos. Avatar original null restaurado, Auth email y membresías sin cambios. No borrar archivos.

Selección offline: escritorio1/1PASS7,9s y móvil1/1PASS8,3s. Admin-b autorizado sobre B-V5 y QA-R5-LIMITED-DESKTOP; supervisor-b sólo veía una ficha, sin alterar permisos. Dos fichas y dos documentos existentes descargados. Cancelar retiro conserva caché exacto; confirmar offline retira sólo el documento seleccionado y conserva bytes/hash/metadatos del segundo y caché de otra ficha. Retirar ficha seleccionada conserva la segunda. Snapshots clínicos/programas/adjuntos idénticos, cero comandos. Intento inicial falló por selector del contenedor padre+fila; r1 usa ancestro más cercano. Producto sin modificación.

Límite pendiente: cola de este caso estaba vacía; conservación de entradas acknowledged/superseded al descartar pendientes no inferida. QA11/16; siguen pares UX, conciliación por acción y gatefinal.
Evidencia docs/qa/R5_PROFILE_OFFLINE_SELECTION_V21_20261013.{json,md}.


## 2026-10-14 — redirecciones de login V21

IDENTIDAD-007 focal: escritorio y móvil 2/2 PASS (15,4 s), cinco entradas por recorrido. Login redirectTo rechaza destino absoluto, protocol-relative, backslash y control codificado hacia /dashboard; destino interno /team conservado. Recarga mantiene destino, cero solicitudes externas y comandos clínicos, identidad sin cambios. Candidato V21 7AtdY0nw3olpUC5PDvk7o.

La prueba no ejecuta callback /auth/confirm con next inválido; ese alcance permanece abierto. No acredita invitación inicial ni cambio de clínica. QA 11/16, sin cierre global ni cambio de producto.
Evidencia docs/qa/R5_REDIRECTS_V21_20261014.{json,md}.


## 2026-10-18 — cola offline conservada

OFFLINE-016: conservación de cola acreditada en escritorio y móvil sobre V21. Conflicto real y operación reemplazante correlacionada; cancelar descarte conserva tres entradas, confirmar elimina sólo pending y conserva acknowledged/superseded y caché. Reconexión sin envío del comando descartado. Cinco recibos por sesión; ambas sesiones sintéticas canceladas y archivadas, snapshots previos y alumno original exactos. Escritorio recuperado en18,2s y móvil en17,6s; son continuaciones con journal y hash de origen, no dos corridas completas desde cero.

Evidencia: docs/qa/R5_QUEUE_RETENTION_V21_20261018.{json,md}. Mobile inicial: notificación interceptó clic Descargar ficha tras primer ACK. Reanudación con contexto nuevo pasó; superposición del aviso móvil pendiente de evaluación visual, no declarada corregida. QA003/004/014/015/016 siguen abiertos; QA11/16. PROGRAMAS037: ensayo V1 no encontró diseño histórico en alumno original; no aprobado. Registro de medición V1 existente no sustituye diseño V1.


## 2026-10-18 — captura técnica y selector de ayudas

Captura técnica V21 completada:42imágenes (21 por viewport) de tableros, diseñadores, sesión, cinco dimensiones y resultados. Cero comandos clínicos, cero submits fuera de login, cero solicitudes externas; snapshots de ficha y programas de ambos alumnos exactos. PORCENTAJE026 focal PASS: abrir ayudas de estímulo y cerrar con Escape sin seleccionar conserva todos los valores/selecciones DOM del borrador vacío, escritorio y móvil. No acredita payload React oculto ni ayuda de respuesta A. Capturar no equivale a aprobar comparación visual; QA004 continúa abierto.

Evidencia docs/qa/R5_REMAINING_CAPTURE_V21_20261018.{json,md}. PROGRAMAS037 no aprobado: inventario sólo lectura de alumnos clinical_id QA% encontró21versiones, todas schemaVersion2; prueba V1 requiere fixture específico mínimo, sin convertir los diseños existentes. QA11/16; respaldo/restore103 y validaciones del candidato final pendientes; recorridos humanos no ejecutados.


## 2026-10-19 — tableros móvil V22

Defecto reproducido y corregido: las tablas de Programación expandían el viewport móvil390→398px y el selector recortaba Borradores/Todos. ProgramsDashboard añade ScrollArea al selector y Table.ScrollContainer(minWidth700) a ambas tablas. V22 verifica seis filtros por viewport, filas/títulos exactos contra RPC, acceso horizontal a acciones, abrir/cerrar ambos diseñadores, cero comandos y snapshots completos intactos. Doce comprobaciones de ancho PASS:1440 escritorio y390 móvil. Ocho capturas actuales; inspección focal de tabla y acciones completada, sin atribuir cierre visual global.

Candidato aba-local-qa-v22, build FgNwRAIHnpp1xvN3xuuEX. Evidencia docs/qa/R5_PROGRAM_BOARD_V22_20261019.{json,md}. V22 es candidato focal nuevo, no entrega final aceptada. QA003/004/014/015/016 abiertos; QA11/16.
