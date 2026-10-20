# Ledger de acciones R5

Las404 acciones INTEGRADO tienen auditoría documental individual en R5_LEDGER_ACCIONES_404.json; cada fila separa comprobantes históricos, parciales, ejecución focal V8 y comparación UX base dc1b0c4 pendiente. La auditoría no convierte404 acciones en VALIDADO. Estado vigente2026-10-10: QA11/16 completos; QA003/004/014/015/016 abiertos y denominador separado; ARCHIVOS013 sigue complementario validado, sin repetir borrado.

Candidato actual: aba-local-qa-v16, BUILD_ID SqXFb86Tn89rgGpuEGkKu, catálogo103. V8 y los demás candidatos de apartados históricos no son el candidato vigente. Controles de contactos, diseñador y navegación/cancelaciones tienen pruebas frescas desktop/móvil, con límites explícitos por acción. Las propuestas originales se conservan en docs/qa/proposals.


## Renovación restore102 — 2026-10-09 (histórico; renovar103)

**Evidencia histórica QA-014 sobre catálogo102; reapertura para catálogo103 el2026-10-10. Estado vigente QA11/16.** Respaldo 26980a59-0f88-44ce-ae1c-d4be172bd865, captura 2026-10-09T04:20:06.254Z, dump SHA256 51008786ab943d7cfd35d8693e85e1cb467a9e0a21ecaa34a840fab77d6818a0. Destino aba-restore-26980a59, DB sin red/puertos; Auth/Storage en su mismo namespace aislado. Destinos recuperados y fallidos detenidos, contenedores/volúmenes preservados. Web V9 FdAlCRUJasCmkUnD5NHVn y Auth originales revalidados HTTP200.

PASS: snapshot exportado PostgreSQL y relectura independiente sin escrituras observadas;90 tablas/2350 filas del alcance declarado;102 migraciones;98 políticas,221 funciones,111 flags RLS,343 objetos ACL,15 roles y25 memberships exactamente conciliados. Storage40 archivos/85140 bytes, inventario completo y cada hash iguales entre origen/copia/destino. Auth10 logins/user/logout ordinarios, incluidas dos cuentas previamente aceptadas; no se presenta como nueva aceptación. PNG A200/68bytes/SHA exacto; B/anónimo400 denegados. Nueve perfiles SQL ordinarios (tres positivos/seis denegados), SELECT anónimo42501 y grant mínimo revocado sin capabilities/scope/lectura; forward102 verificado.

Correcciones sólo del procedimiento de ensayo: delimitadores DO, lectura de rolconfig desde pg_roles y preservación de parámetros tipo lista sin alterar la sesión del restaurador. Los tres destinos fallidos4f576c29/356121da/cf4df7d9 se conservaron; ninguna reimportación sobre un destino existente, ninguna modificación de roles/grants del origen. La documentación de preparación queda histórica; scripts y pruebas102 fueron ahora ejecutados.

Evidencia privada saneada: .aba.local/qa/restore-final-data-proof-26980a59-0f88-44ce-ae1c-d4be172bd865.json y locator restore-final-current.json. El alias restore-final-data-proof.json conserva101 histórico; usar el proof por UUID. Dump/config/roles/snapshot cifrados bajo .aba.local/backups y clave separada en .aba.local/backup-keys. Los fingerprints cubren el alcance declarado, no toda tabla del dump; Storage y PostgreSQL carecen de snapshot transaccional común. Clave y respaldo permanecen en el mismo equipo; no hay copia externa. No se acreditan REST/Realtime/SMTP/PWA/VPS recuperados ni configuraciones per-database de roles.

Siguen abiertos QA-003 (controles/rutas/perfiles), QA-004 (comparación UX base), QA-015 (regresión y versión final) y QA-016 (aceptación explícita). Los tres recorridos humanos clínica/supervisor/técnico permanecen planificados para el final. Cambios posteriores de contratos/esquema que invaliden esta evidencia exigen renovar el ensayo.


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
