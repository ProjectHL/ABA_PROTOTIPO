# A3 R2 — handoff parcial programas, sesión y captura

Estado: **PARTIAL / no integrar SQL todavía / no QA**. Fecha: 2026-09-15.

## Artefactos A3

- `src/modules/program-session/ports.ts`: DTOs y puertos que consumen una sola copia de los dominios root.
- `src/modules/program-session/program-session.server.ts`: lector autorizado y cuatro Server Actions para los RPC aprobados.
- `src/features/programs/ProgramManagementV2.tsx`: controlador de dashboard/diseñadores con borrador, publicación y lifecycle.
- `src/views/SessionPage.tsx`: snapshot de sesión, comandos estables y múltiples registros.
- `src/features/dataCollection/*`: cinco dimensiones MeasurementV2, incluyendo duración/latencia.
- `docs/handoffs/A3_PROGRAM_SESSION_V2_PROPOSAL.sql` y `A3_PROGRAM_SESSION_V2_COMMANDS_PROPOSAL.sql`: propuesta solamente; root crea/ordena/aplica cualquier migración.

## Checklist autoritativo ROOT_REVIEW_A3_R2

### Persistencia

- [x] Clave `clients`: las FKs usan `(organization_id,client_id) -> clients(organization_id,id)`. La propuesta ya no crea otra clave; consume migración 39.
- [x] Resultados: usa directamente `private.command_identity_or_replay_result`, `command_version_conflict_result` y `command_rejected_result` de migración 40. No quedan helpers de resultado A3.
- [~] Validadores cerrados: ProgramDesignV2 y MeasurementV2 validan keys/tipos/límites/UUID/timestamps/unicidad/rangos/prompts y submit. Pendiente de segunda revisión root: equivalencia exacta de entero seguro Zod para `order` y revisión final de ISO; no afirmar gate hasta esa revisión.
- [x] Envelope: `coalesce(...,false)`, campos requeridos/no-null antes de UUID/int; `expectedVersion` queda acotado al tipo de columna antes del cast.
- [x] Escrituras heredadas: propuesta revoca DML directo en programas/versiones/sesiones/registros y EXECUTE de RPC V1 de escritura. Lectura V1 se mantiene.
- [x] Snapshot: activo/current se comprueba sólo en `start`/`select-programs`; pausa/reanuda/cierra compara exactamente `selected_programs` persistido.
- [x] Cierre: `clinical_sessions.completed` sólo en finish; cancel queda como estado explícito `cancelled`, sin mapearlo a completed/archived. Notas se sincronizan.
- [x] Revisión: `revise` acepta enviado en sesión active/paused/finished, conserva `submitted_at` y agrega revisión con prior/replacement/reason.
- [x] Auditoría: `draft_created`, `version_created`, lifecycle, evento, mutación y receipt comparten la transacción RPC.
- [x] Relaciones: registros requieren par programa/versión del snapshot exacto y dimensión publicada; FKs compuestas impiden mezclar clínica/ficha/sesión/recurso.
- [x] Multi-registro y lector: no hay unique por programa/sesión; snapshot devuelve cada registro estable. V1 se proyecta `detailsUnavailable:true` sin fabricar ensayos/prompts.
- [x] Finalización: al menos un enviado por cada programa seleccionado y ningún borrador.

### UX

- [x] Reintento sesión/captura: refs retienen comando completo por acción/recurso en transporte desconocido; una acción distinta queda bloqueada hasta resolver el pendiente.
- [x] Snapshot: después de iniciar, la UI usa `session.programs`, no `currentVersionId`; los registros conservan `programVersionId` exacto.
- [x] Multi-registro/reapertura: se inicializan id/version/measurement/submitted desde `data.records` de la sesión y se permiten varios registros por programa.
- [x] Ocultar capturador: `activeRecordId` y measurement viven en SessionPage; cerrar sólo cambia `captureOpen` y no desmonta el borrador.
- [x] Timers: sesión, frecuencia, intervalos, duración y latencia tienen tick visual; autoridad de tiempo sigue siendo eventos/ventanas/timestamps.
- [x] Distinciones: percentage conserva null/I/A/E/NR, responsePrompt y stimulusPrompts. Frecuencia conserva eventos/ventanas; duración episodios abiertos; latencia pending/responded/NR.
- [x] Intervalos: no permite observar antes del cierre programado; reconfigurar requiere confirmación.
- [x] Pausa: se bloquea mientras exista cualquier ventana de frecuencia abierta.
- [x] Archivado/capacidades: ficha archivada o sin `record.capture` queda visible en lectura y sin mutaciones.
- [x] Programas: `ProgramsDashboard` conserva filtros/tablas/menús/iconos; no hay override ni toast local. Sin callback V2, acciones quedan deshabilitadas con aviso.
- [x] Diseñadores: mantienen pasos, sets, funciones y campos originales; agregan dimensión, skillArea, teachingProcedure, promptLevels, hipótesis, prevención y respuesta. Guardar/publicar son acciones separadas y encadenadas sólo tras ACK.
- [~] Fidelidad visual completa: se restauraron configuración, estadísticas, grillas, contador y cronómetros del baseline. Sigue pendiente revisión visual root de jerarquía y de las acciones V1 inventariadas; no declarar equivalencia aceptada todavía.

## Integración que pertenece a root

1. Crear migración canónica a partir de propuestas únicamente después del segundo gate SQL; regenerar tipos después de aplicarla.
2. Montar `loadProgramSessionPageData` en la ruta server y pasar `ProgramSessionPageData` a `SessionPage`.
3. Montar `ProgramManagementV2` desde la ficha/ruta propietaria de root/A2; retirar rutas provisionales sólo en R4 tras equivalencia.
4. A7 puede consumir `ScopedCaptureCommand`/`ScopedSessionCommand`; no debe crear otra forma de cola ni cambiar IDs.

## Verificación realizada

- `Node 22.23.2 + tsc --noEmit`: exit 0.
- No se ejecutaron suites, navegador, Auth, RPC, SQL, Postman ni QA funcional.
- No se creó/aplicó migración y no se modificaron archivos root-owned.

## Riesgos abiertos

- Los SQL son propuestas no parseadas/ejecutadas; requieren revisión root de sintaxis, grants de wrapper/private y equivalencia final Zod.
- La vista de ruta aún no consume estos componentes porque `app/**` y las páginas de integración pertenecen a root.
- Exportación PDF permanece visible y explícitamente deshabilitada; no hay ACK ficticio.
