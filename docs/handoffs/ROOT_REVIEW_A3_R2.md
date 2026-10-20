# Revisión root A3 R2 — programas, sesión y captura

Fecha: 2026-09-15. Resultado provisional: **PARCIAL / NO APTO PARA MIGRACIÓN**. Root no acepta DDL ni UX hasta cerrar estos puntos.

## Bloqueantes P0 de persistencia

1. Usar la clave canónica de cliente `(organization_id,id)` aplicada en la migración39; no crear una alterna `(id,organization_id)`.
2. Reutilizar los helpers privados aplicados en la migración40/41. Eliminar mapeadores A3 duplicados y relanzar cualquier 40001 no reconocido.
3. Los validadores JSON deben igualar completamente los Zod `ProgramDesignV2`, `SessionV2` y `MeasurementV2`: objeto cerrado, tipos, longitudes, máximos, UUID/timestamps, IDs y órdenes únicos, rangos temporales, prompts, ventanas/eventos, episodios, ensayos y reglas de submit/revise.
4. Revocar DML directo y RPC heredadas de escritura sobre programas/versiones/sesiones/capturas. Mantener lectura V1 explícita; ninguna ruta puede evitar ledger, revisión y auditoría.
5. Validar versión activa sólo al seleccionar/iniciar. Pausa, reanudación y cierre conservan el snapshot elegido aunque el programa cambie después.
6. Sincronizar `clinical_sessions` V1 al finalizar como `completed` sin inventar equivalencia para cancelación. Revisiones están permitidas según el contrato, no sólo mientras la sesión esté finished.
7. Emitir `draft_created` y `version_created`; toda transición/captura/evento/recibo comparte transacción. No sobrescribir observaciones originales ni borrar revisiones.
8. Una sesión admite varios registros por programa; cada registro conserva IDs, versión, medición y estado propios. El lector debe proyectar V1 como `detailsUnavailable`, no reconstruir ensayos.

## Bloqueantes P0 de UX

1. `SessionPage.tsx` pasó de 246 a aproximadamente60 líneas y `DataCollectionEngine.tsx` eliminó aproximadamente136 líneas mientras añadió43. Esto indica sustitución por una vista menor: debe conservarse la jerarquía y todos los controles del baseline.
2. Persistir `operationId`/`idempotencyKey` por payload hasta resultado terminal. Timeout/red conserva el mismo comando.
3. Inicializar/reanudar registros y mediciones desde el snapshot; cambiar/ocultar panel no desmonta ni pierde un borrador.
4. Timer debe actualizarse visualmente y respetar ventanas active/paused. Intervalos no pueden observarse antes de empezar; duración/latencia conservan episodios/ensayos abiertos como borrador.
5. Conectar `ProgramsDashboard` y ambos diseñadores a comandos reales; eliminar overrides/toasts de éxito local. Conservar filtros, menús, expansión, reinicio con confirmación, título editable e iconos decorativos clasificados.
6. Mantener estados archivado/sin capacidad, prompts de respuesta y estímulo, varios registros por programa y las acciones agregadas V1 inventariadas sin convertir `false` en E/A/NR.

Postman y QA funcional permanecen exclusivamente en R5/A8.
