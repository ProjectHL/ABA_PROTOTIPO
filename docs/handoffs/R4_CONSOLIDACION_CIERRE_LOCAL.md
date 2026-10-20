# Consolidación R3/R4 — candidato local para R5

Fecha: 2026-09-27. Aceptación técnica de integración, no aprobación funcional.

## Evidencia del candidato

Checkout Desktop confirmado por git; HEAD 39071f8542968f334ab6732a9a4a222d4ad0a1a1,
con cambios locales preservados. Huella recalculada de 316 archivos de aplicación,
migraciones y manifests: `17f2b42da1cf90cce021cd6ffbe0622fce6036834827a6dedbd31c757a3a1b22`.
Coincide exactamente con el corte de build/tipos/grafo/runtime registrado en
R4_FORWARDS_APLICADOS_CATALOGO.md. No se atribuye aquella compilación a otra fuente.

Consulta actual de metadatos: nueve contenedores del stack aislado en ejecución;
historia PostgreSQL 97 migraciones, última 20260926221536. Consulta sólo lectura;
no se ejecutaron RPC clínicos, suites, fixtures, reset ni limpieza.

Matriz recontada: 434 filas de nueve columnas, 404 INTEGRADO, 16 PENDIENTE QA,
una PENDIENTE R5 y 13 DIFERIDO UPGRADE. La aceptación utiliza las cadenas siguientes
y los handoffs técnicos de R1/R2, no el conteo ni la huella como prueba funcional.

## Conciliación requisito → fuente → contrato → persistencia → ruta

| Cobertura | Cadena vigente y evidencia de integración |
|---|---|
| Identidad, shell, equipo; ficha/historial/documentos; programas/sesiones y cinco dimensiones; agenda/comercial/soporte | Se conserva aceptación técnica R1/P1 y detalle por acción de la matriz; R4_RECONCILIACION_ENSAMBLE registra composición original, motores compartidos y rutas. Ninguna aceptación funcional histórica se hereda. |
| COMPARTIR-001–031 | SharedAccessPage y ShareStudentModal → contratos StudentShare/AccessRequest → collaboration.server → RPC V2, capacidades existentes, solicitudes/decisiones y ledger → /shared-access; /invitations monta la misma vista en Recibidas. Solicitudes se deciden en pestaña Solicitudes, no en el wrapper de invitaciones. R4_SOLICITUDES_ACCESO_V2 acredita locks, elegibilidad, versión y revocación de grants legacy. |
| FAMILIA-001–008, 010–011 | Gestión desde ficha y bandeja recibida → contratos familiares → family.server → vínculo/manifiesto versionado y gate family_recipient_active_v2 → /family. Descargar pasa por /family/documents, autorización de versión exacta antes/después de Storage, sesión familiar, tamaño/hash y no-store. R4_FAMILIA_CONSUMIDORES_Y_LIMITES y catálogo del forward acreditan consumidores y boundary; FAMILIA-009 es upgrade. |
| NOTIFICACIONES-001–008 | MainLayout/NotificationsBell → contratos/read-state → notifications.server → inbox por destinatario, RLS, ledger y recibos de recordatorios → shell. R3_A4_NOTIFICACIONES_REVISION acredita relectura persistida, consulta/mutación excluyentes y navegación con reautorización. Entrega local conectada, no correo/push con app cerrada. |
| DASHBOARD-001–013 y BUSQUEDA-001–003 | DashboardPage/AuthorizedSearch → DTO cerrados → adaptadores → RPC invoker con RLS/capacidades → /dashboard y shell. Cierre de sesión procede de evento finished inmutable; búsqueda no entrega rutas Storage. Forward 20260926221035 aplicado y cuerpos/ACL verificados en catálogo previo. |
| RESULTADOS-001–019 y PROGRAMAS-039/041 | Ruta chart valida identidad/ficha/programa/chart.view → lectura ProgramSession y metas → ProgramResults/GoalsPanel → MeasurementV2 y revisiones persistidas; command_result_goal_v2 versionado. R3_A6_REVISION_INTEGRACION acredita filtros, V1 separado, proyección común de metas y exportadores PDF/CSV protegidos por contexto. Exportar diseño no publica/guarda ni equivale a reporte de resultados. |
| OFFLINE-001–017 y logout con pendientes | OfflineProvider/SessionPage/OfflineStatus → contratos de cola/MeasurementV2 → IndexedDB por actor/clínica y sync-engine → revalidación de permisos y RPC existentes con claves exactas → /session y /offline-workspace. R3_A7_REVISION_INTEGRACION acredita transacciones, orden de dependencias, recibos, conservación de conflictos/revocación e I/O aislada; PWA cachea sólo shell estático. |
| Estados y operación | Rutas originales, shell compartido, lecturas/error/reintento y scripts/local; manuales operador/usuario y runbooks existentes. Limpieza física queda explícitamente en ARCHIVOS-013/R5, no se confunde con cleanup clínico histórico. Recuperación real, correo y servicios pertenecen a QA final. |

Se inspeccionaron nuevamente los adaptadores de colaboración/familia/resultados,
route de descarga, sync-engine, wrappers App Router, ruta chart y vista de accesos.
Los cuerpos SQL y los demás consumidores se concilian con las revisiones técnicas
previas del mismo candidato: ocho funciones comparadas íntegramente, permisos,
policy, tipos y grafo runtime, sin cambios de fuente desde aquel corte.

Las referencias dc1b0c4/BASELINE/src/pages son anclas históricas, no rutas actuales.
Se complementaron las filas de acceso/login con fuentes vigentes y se retiró la
clasificación huérfana de /invitations sin eliminar el inventario original.

## Resultado y transferencia a R5

R3 A4/A6/A7 y R4 ensamblaje aceptados técnicamente para iniciar R5.
No queda implementación R4 pendiente identificada por la consolidación.
No es aceptación local del usuario, prueba de permisos ejecutados ni garantía de
ausencia de defectos: QA cubrirá todas las acciones integradas y los casos negativos.

Pendientes finitos: ARCHIVOS-013, QA-001–016, correcciones/repruebas, informe exacto
y aceptación local. Once warnings SQL clasificados quedan como deuda; cualquier
defecto funcional/de seguridad comprobado se corrige dentro de R5.
Chat/adjuntos y online R6 no condicionan el cierre local ni se activan automáticamente.
Los ejemplos A4/A6/A7 son insumos de colección y recorridos, no suites ejecutadas.
