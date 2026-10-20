# A6 — ejemplos operativos

Fecha: 2026-09-26. Documentación de contratos actuales, no suite ejecutada.
Reservar ejecución para R5 con actor autenticado y recursos sintéticos autorizados.
Usar URL local y clave pública configuradas fuera de este documento; nunca service_role.
Variables entre llaves representan UUID/valores reales autorizados, no fixtures nuevos.

## Dashboard y búsqueda

`POST /rest/v1/rpc/aba_dashboard_read_v2`:

```json
{"p_organization_id":"{{clinicId}}"}
```

El DTO actual exige finishedAt nullable. Aplicar/verificar primero el forward
20260926221035; el código preparado no funciona como contrato anterior implícito.
Filtros de estudiante y periodos son de interfaz, no argumentos nuevos del RPC.

`POST /rest/v1/rpc/aba_authorized_search_v2`:

```json
{"p_organization_id":"{{clinicId}}","p_query":"Programa","p_limit":30}
```

El adaptador exige búsqueda trim de 2–80 caracteres sin controles. Devuelve
student/program/document con ruta de aplicación, no URLs de descarga Storage.
Abrir coincidencia usa la ruta devuelta y reautoriza en destino.

## Metas versionadas

`POST /rest/v1/rpc/command_result_goal_v2`:

```json
{
  "p_clinic_id":"{{clinicId}}",
  "p_command":{
    "schemaVersion":2,
    "operationId":"{{operationId}}",
    "idempotencyKey":"{{idempotencyKey}}",
    "studentId":"{{studentId}}",
    "programId":"{{programId}}",
    "goalId":"{{goalId}}",
    "expectedVersion":0,
    "action":"create",
    "dimension":"percentage",
    "comparator":"at-least",
    "targetValue":80,
    "label":"Meta clínica definida por el equipo"
  }
}
```

Crear usa nueva identidad de meta y versión 0. Actualizar/archivar usan goalId y
versión vigente confirmada, no una versión inventada. Mantener todos los campos
del contrato incluso al archivar; la UI pide confirmación explícita. Cada intención
nueva tiene claves nuevas; un reintento incierto repite el body exacto completo.
Porcentaje/intervalos exigen 0–100. La dimensión determina la unidad, no convierte
unidades ni significa mejoría automática. Permiso vigente: chart.configure.

La lectura de metas usa el adaptador loadResultGoals (SELECT autorizado a
program_result_goals_v2 con org/ficha/programa y archived_at null), no un RPC nuevo
llamado read_result_goals. El gráfico usa además read_program_session_v2, documentado
en A7_OPERACION_EJEMPLOS.md, y exige chart.view en su ruta.

## Nota clínica, filtros y exportaciones

Desde `/students/<studentId>/programs/<programId>/chart`, editar nota genera
command_capture_v2 con action revise, versión vigente, MeasurementV2 original
íntegra salvo notes y revisionReason no vacío. No modificar capturedAt, ensayos,
eventos ni dimensión para «actualizar» la fecha del reporte. Ante conflicto,
consultar registro vigente y revisar explícitamente el borrador antes de otro envío.
Envelope de captura: A7_OPERACION_EJEMPLOS.md.

Periodo/fase/profesional/dimensión y series porcentuales se operan en interfaz.
PDF/CSV de resultados se generan localmente desde la vista autorizada filtrada;
no existe RPC de exportación. Los toggles de I/A/E/NR cambian el gráfico, no eliminan
observaciones del archivo. V1 se conserva separado, sin reconstrucción inventada.
Cerrar gráfico ampliado mantiene filtros y límites Y.

En diseñadores de habilidad/conducta, exportar diseño PDF o CSV toma el borrador
visible y no guarda/publica. No es el reporte de resultados. Comprobar descargas,
render multipágina, filtros, revisión y permisos en R5; no acreditados por este texto.
