# Checklist pendiente de cierre local R5 — 2026-10-10

Estado verificado: 11/16 casos QA completos. QA-003, QA-004, QA-014, QA-015 y QA-016 siguen abiertos; restore102 histórico tras forward103. Las 404 acciones están integradas; no se declaran todas validadas. Candidato actual: aba-local-qa-v21, BUILD_ID 7AtdY0nw3olpUC5PDvk7o. Historial de pruebas y límites en R5_CLI_GATE_V5.md.

## Paquete recién cerrado

- [x] Agrupación de accesos compartidos por ficha: escritorio y móvil, abrir/cerrar, detalles, cancelaciones y cambios de nivel con recibos.
- [x] Capturas visuales finales desplegadas y revisión de composición original.
- [x] Revocar exclusivamente los tres accesos sintéticos nuevos, restaurar capacidades previas y archivar lógicamente la ficha nueva; originales preservados y cero borrados físicos.
- [x] Registrar evidencia, candidato, matriz y checkpoint JSON/HTML sin aumentar el contador global de QA.

## QA-003 — controles y perfiles que faltan

- [x] Compartir cabecera/lista V19 escritorio+móvilPASS, tres perfiles por tamaño, cancelar/reabrir/recargar sin navegación indebida ni comandos. Badges false según DTO; true no acreditado. Defectos de propagación/desmontaje resueltos focalmente.

- [x] Búsqueda autorizada: estudiante/programa/documento, apertura real, recarga y aislamiento B. Escritorio y móvil PASS en serie; cero comandos y snapshots idénticos. Guard documental reconciliado contra procedencia sintética histórica exacta.
- [x] Acciones UI positivas B supervisor/técnico:14ACK escritorio+móvil, programas/capturas y cierre de sesiones propios. Regresión focal finalV14 y otras variantes de perfiles siguen separados.
- [x] Diseño conductual: precursores, crisis, funciones múltiples y campos adicionales; igualdad del diseño guardado, reapertura y versiones.
- [x] Historia clínica focal: diagnóstico/procedimiento V14 y controles medicación V16; cancelar, desplegar cinco versiones y prescriptor/fechas/notas contra DTO. Desborde móvil corregido y regresado escritorio/móvil; otros controles generales siguen abajo.
- [x] HISTORIAL-013: retiro versionado sin borrado, cancelación y recuperación exacta comprobados escritorio/móvil; forward103 aplicado.
- [x] Estados globales V16 app/loading/app/error/close/reset/Ir al Inicio reales desktop+móvilPASS0writes; complementan estados locales y404/backV11. Alcance de perfiles y rutas según ledger; no prueba caída real servidor.
- [x] Controles menores focales: volver/lista, nombre vacío persistido→iniciales y restauración own-only4ACK, Otro/autocomplete local + persistencia históricaV11 separada, tarjetas DTO y búsqueda equipo desktop/móvilPASS.
- [x] Métricas independientes V19:20registros retenidos de cinco dimensiones, DTO/UI/CSV exactos desktop+móvilPASS0writes; drafts/open/V1/PDF/otros perfiles separados.
- [x] Captura/offline: descarte/cancelación y borrador Frecuencia con ventana abierta escritorio+móvil V21 PASS; cinco ACK por recorrido.
- [x] V1 frecuencia existente: tarjeta sólo lectura y recarga sin cambios, escritorio+móvilPASS. Otras dimensiones V1 sin fixture no inferidas.
- [x] RESULTADOS-018/019: ejes SVG válidos y ampliar/cerrar conserva filtros, tabla y puntos, escritorio+móvilPASS.
- [x] Offline: quitar documento/ficha seleccionados conserva segundo documento y segunda ficha, desktop+móvilPASS0writes.
- [ ] Offline: acreditar preservación de entradas acknowledged/superseded al descartar pendientes.
- [x] Perfil/avatar: campos distintos y selección/reemplazo/retirada persistidos desktop+móvil; ocho ACK y originales restaurados.
- [ ] Conciliar cada pendiente del ledger con pruebas y artefactos. Evitar repetir controles cuya entrada, payload guardado y recarga ya estén acreditados.

## QA-004 — fidelidad del frontend

- [x] Lista equipo V20 contra dc1b0c4 desktop/móvil; toolbar recortado corregido y probado. Perfil/avatar comparados en16pares con límites documentados; familia/documentos poblados contrastados enV21, formularios y controles restantes separados.
- [x] Paneles Familia/Documentos poblados B V21 contra dc1b0c4 desktop/móvil; desbordes hermanos/consentimiento corregidos, scroll acción accesible y PNG/body390 verificados. Formularios/descargas/portal siguen separados.
- [x] Perfil/avatar V21: composición escritorio/móvil revisada; guardado y persistencia separados.
- [ ] Completar pares de las familias/rutas restantes contra dc1b0c4 en escritorio y móvil.
- [ ] Documentar adaptaciones por datos/autorización reales y corregir únicamente defectos reproducibles dentro del alcance.
- [ ] Conciliar la revisión visual por control sin confundir un paquete focal aprobado con QA-004 completo.

## QA-015 — candidato final

- [ ] Resolver defectos funcionales pendientes y repetir su prueba más regresiones relacionadas.
- [ ] Ejecutar tipado, lint, build y pruebas pertinentes sobre el candidato final exacto.
- [ ] Repetir pruebas transversales de Auth/permisos/contratos sólo si cambios posteriores lo requieren.
- [ ] Renovar respaldo y restore aislado103 para QA-014; restore102 preservado como histórico y límites documentados.
- [ ] Conciliar versión HEAD más cambios locales, matriz, omisiones, incidencias y manuales de arranque/uso/respaldo/recuperación.

## Última prueba y aceptación

- [ ] Ejecutar con el usuario los tres recorridos completos: clínica, supervisor y técnico, incluyendo creación de cuentas. Siguen planificados, no ejecutados. Usar el plan final acordado y registrar evidencia en el entorno Docker local.
- [ ] Resolver y repetir cualquier incidencia de esos recorridos.
- [ ] Presentar QA-016 y obtener aceptación local explícita del usuario.
- [ ] Sólo después de la aceptación local, abordar la preparación/publicación en VPS como etapa posterior.

ARCHIVOS-013 ya está cerrado: no repetir su borrado. No operar Windows ni acceder fuera de la carpeta Desktop ABA y Docker. El archivo es una lista de pendientes; no es una aprobación ni una nueva suite ejecutada.


## Focal identidad — 2026-10-14

- [x] IDENTIDAD-007 login redirectTo: cuatro entradas rechazadas y destino interno válido, recarga y contexto conservados, escritorio/móvil PASS.
- [ ] IDENTIDAD-007 callback next inválido: fuera de la suite de login; vincular evidencia o ejecutar focal.

IDENTIDAD-007 focal: escritorio y móvil 2/2 PASS (15,4 s), cinco entradas por recorrido. Login redirectTo rechaza destino absoluto, protocol-relative, backslash y control codificado hacia /dashboard; destino interno /team conservado. Recarga mantiene destino, cero solicitudes externas y comandos clínicos, identidad sin cambios. Candidato V21 7AtdY0nw3olpUC5PDvk7o.

La prueba no ejecuta callback /auth/confirm con next inválido; ese alcance permanece abierto. No acredita invitación inicial ni cambio de clínica. QA 11/16, sin cierre global ni cambio de producto.


## 2026-10-18 — cola offline conservada

OFFLINE-016: conservación de cola acreditada en escritorio y móvil sobre V21. Conflicto real y operación reemplazante correlacionada; cancelar descarte conserva tres entradas, confirmar elimina sólo pending y conserva acknowledged/superseded y caché. Reconexión sin envío del comando descartado. Cinco recibos por sesión; ambas sesiones sintéticas canceladas y archivadas, snapshots previos y alumno original exactos. Escritorio recuperado en18,2s y móvil en17,6s; son continuaciones con journal y hash de origen, no dos corridas completas desde cero.

Evidencia: docs/qa/R5_QUEUE_RETENTION_V21_20261018.{json,md}. Mobile inicial: notificación interceptó clic Descargar ficha tras primer ACK. Reanudación con contexto nuevo pasó; superposición del aviso móvil pendiente de evaluación visual, no declarada corregida. QA003/004/014/015/016 siguen abiertos; QA11/16. PROGRAMAS037: ensayo V1 no encontró diseño histórico en alumno original; no aprobado. Registro de medición V1 existente no sustituye diseño V1.


## 2026-10-18 — captura técnica y selector de ayudas

Captura técnica V21 completada:42imágenes (21 por viewport) de tableros, diseñadores, sesión, cinco dimensiones y resultados. Cero comandos clínicos, cero submits fuera de login, cero solicitudes externas; snapshots de ficha y programas de ambos alumnos exactos. PORCENTAJE026 focal PASS: abrir ayudas de estímulo y cerrar con Escape sin seleccionar conserva todos los valores/selecciones DOM del borrador vacío, escritorio y móvil. No acredita payload React oculto ni ayuda de respuesta A. Capturar no equivale a aprobar comparación visual; QA004 continúa abierto.

Evidencia docs/qa/R5_REMAINING_CAPTURE_V21_20261018.{json,md}. PROGRAMAS037 no aprobado: inventario sólo lectura de alumnos clinical_id QA% encontró21versiones, todas schemaVersion2; prueba V1 requiere fixture específico mínimo, sin convertir los diseños existentes. QA11/16; respaldo/restore103 y validaciones del candidato final pendientes; recorridos humanos no ejecutados.


## 2026-10-19 — tableros móvil V22

Defecto reproducido y corregido: las tablas de Programación expandían el viewport móvil390→398px y el selector recortaba Borradores/Todos. ProgramsDashboard añade ScrollArea al selector y Table.ScrollContainer(minWidth700) a ambas tablas. V22 verifica seis filtros por viewport, filas/títulos exactos contra RPC, acceso horizontal a acciones, abrir/cerrar ambos diseñadores, cero comandos y snapshots completos intactos. Doce comprobaciones de ancho PASS:1440 escritorio y390 móvil. Ocho capturas actuales; inspección focal de tabla y acciones completada, sin atribuir cierre visual global.

Candidato aba-local-qa-v22, build FgNwRAIHnpp1xvN3xuuEX. Evidencia docs/qa/R5_PROGRAM_BOARD_V22_20261019.{json,md}. V22 es candidato focal nuevo, no entrega final aceptada. QA003/004/014/015/016 abiertos; QA11/16.
